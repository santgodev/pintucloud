import { Component, OnInit, HostListener, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SalesService } from './services/sales.service';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { AuthService } from '../../core/services/auth.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { FormsModule } from '@angular/forms';
@Component({
  selector: 'app-sales-invoice',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './sales-invoice.component.html',
  styleUrls: ['./sales-invoice.component.scss']
})
export class SalesInvoiceComponent implements OnInit {
  sale: any;
  isLoading = true;
  today = new Date();
  fillerRows: number[] = [];
  invoiceZoom: string = '1';
  showGarantiaModal: boolean = false;
  bodegas: any[] = [];
  garantiaForm = {
    producto_id: '',
    bodega_id: '',
    cantidad: 1,
    motivo: ''
  };
  stockDisponible: number | null = null;
  stockLoading = false;
  isSavingGarantia = false;
  private readonly INVOICE_WIDTH = 820;

  @HostListener('window:resize')
  onResize() {
    this.updateScale();
  }

  private updateScale() {
    const vw = window.innerWidth;
    if (vw < this.INVOICE_WIDTH) {
      const zoom = (vw - 8) / this.INVOICE_WIDTH;
      this.invoiceZoom = zoom.toFixed(4);
    } else {
      this.invoiceZoom = '1';
    }
  }

  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private salesService = inject(SalesService);
  private location = inject(Location);
  private supabase = inject(SupabaseService);

  isAdmin = this.authService.isAdmin;

  constructor() { }

  async ngOnInit() {
    this.updateScale();
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/sales']);
      return;
    }

    try {
      this.sale = await this.salesService.getById(id);


      // Forzar detección de cambios con nueva referencia
      this.sale = { ...this.sale };

      const itemCount = this.sale?.detalle_ventas?.length || 0;
      const fill = Math.max(0, 8 - itemCount);
      this.fillerRows = Array.from({ length: fill });

      if (![1, 2].includes(this.sale?.tipo_documento)) {
        console.error('[SalesInvoice] tipo_documento inválido:', this.sale?.id, '→', this.sale?.tipo_documento);
      }

      this.isLoading = false;
    } catch (error) {
      console.error('Error loading invoice:', error);
      this.router.navigate(['/sales']);
    }
  }

  goBack() {
    this.location.back();
  }

  async abrirGarantia() {
    this.showGarantiaModal = true;
    this.isSavingGarantia = false;
    this.stockDisponible = null;

    const validProducts = this.getValidProducts();
    const firstProduct = validProducts.length > 0 ? validProducts[0].producto_id : '';

    this.garantiaForm = {
      producto_id: firstProduct,
      bodega_id: '',
      cantidad: 1,
      motivo: ''
    };

    await this.loadBodegas();
    const saleBodega = this.bodegas.find(b => b.id === this.sale?.bodega_id);
    this.garantiaForm.bodega_id = saleBodega ? saleBodega.id : (this.bodegas[0]?.id || '');

    if (this.garantiaForm.producto_id && this.garantiaForm.bodega_id) {
      await this.checkStock();
    }
  }

  getValidProducts() {
    return this.sale?.detalle_ventas?.filter((d: any) => !d.es_obsequio) || [];
  }

  getMaxCantidadPermitida(): number {
    if (!this.garantiaForm.producto_id) return 0;

    const detail = this.sale?.detalle_ventas?.find((d: any) => d.producto_id === this.garantiaForm.producto_id);
    if (!detail) return 0;

    const cantidadComprada = detail.cantidad || 0;
    const bodega = this.bodegas.find(b => b.id === this.garantiaForm.bodega_id);

    if (bodega && bodega.maneja_inventario === false) {
      return cantidadComprada;
    }

    const stock = this.stockDisponible !== null ? this.stockDisponible : 0;
    return Math.min(cantidadComprada, stock);
  }

  async loadBodegas() {
    try {
      if (!this.sale?.distribuidor_id) return;
      const { data } = await this.supabase.client
        .from('bodegas')
        .select('id, nombre, maneja_inventario')
        .eq('distribuidor_id', this.sale.distribuidor_id)
        .order('nombre');
      if (data) this.bodegas = data;
    } catch (err) {
      console.error(err);
    }
  }

  selectedBodegaManejaInventario(): boolean {
    const bodega = this.bodegas.find(b => b.id === this.garantiaForm.bodega_id);
    return bodega ? bodega.maneja_inventario !== false : true;
  }

  async checkStock() {
    if (!this.garantiaForm.producto_id || !this.garantiaForm.bodega_id) {
      this.stockDisponible = null;
      return;
    }

    if (!this.selectedBodegaManejaInventario()) {
      this.stockDisponible = null;
      const max = this.getMaxCantidadPermitida();
      if (this.garantiaForm.cantidad > max) {
        this.garantiaForm.cantidad = Math.max(1, max);
      }
      return;
    }

    this.stockLoading = true;
    try {
      const { data } = await this.supabase.client
        .from('inventario_bodega')
        .select('cantidad')
        .eq('bodega_id', this.garantiaForm.bodega_id)
        .eq('producto_id', this.garantiaForm.producto_id)
        .single();

      this.stockDisponible = data ? data.cantidad : 0;

      const max = this.getMaxCantidadPermitida();
      if (this.garantiaForm.cantidad > max) {
        this.garantiaForm.cantidad = Math.max(1, max);
      }
    } catch(err) {
      this.stockDisponible = 0;
    }
    this.stockLoading = false;
  }

  isConfirmDisabled(): boolean {
    if (this.isSavingGarantia) return true;
    if (this.stockLoading) return true;

    const manejaInventario = this.selectedBodegaManejaInventario();

    if (manejaInventario && (this.stockDisponible === null || this.stockDisponible <= 0)) {
      return true;
    }

    if (!this.garantiaForm.motivo || !this.garantiaForm.motivo.trim()) return true;
    if (this.garantiaForm.cantidad < 1) return true;

    const max = this.getMaxCantidadPermitida();
    if (this.garantiaForm.cantidad > max) return true;

    return false;
  }

  async confirmarGarantia() {
    if (this.isConfirmDisabled()) return;

    const user = this.authService.currentUserValue;
    if (!user?.id) {
      alert('Error de sesión: Usuario no encontrado.');
      return;
    }

    this.isSavingGarantia = true;

    try {
      const { error } = await this.supabase.client.rpc('registrar_devolucion_garantia', {
        p_venta_id: this.sale.id,
        p_producto_id: this.garantiaForm.producto_id,
        p_bodega_id: this.garantiaForm.bodega_id,
        p_cantidad: this.garantiaForm.cantidad,
        p_motivo: this.garantiaForm.motivo,
        p_usuario_id: user.id
      });

      if (error) {
        console.error('[Garantia] Error de Supabase al registrar devolución:', error);
        alert('No se pudo registrar la garantía: ' + error.message);
        this.isSavingGarantia = false;
        return;
      }
    } catch (err: any) {
      console.error('[Garantia] Excepción inesperada:', err);
      alert('Error inesperado al registrar la garantía.');
      this.isSavingGarantia = false;
      return;
    }

    // Éxito en el registro
    alert('Garantía registrada exitosamente.');
    this.cerrarGarantia();
    this.isSavingGarantia = false;

    // Refresco de UI (separado para no falsear el resultado del registro si falla)
    this.isLoading = true;
    try {
      this.sale = await this.salesService.getById(this.sale.id);
      this.sale = { ...this.sale };
    } catch (refreshErr) {
      console.error('[Invoice] Error al refrescar la venta tras registrar garantía:', refreshErr);
    } finally {
      this.isLoading = false;
    }
  }

  cerrarGarantia() {
    this.showGarantiaModal = false;
  }

  async editarOrden() {
    if (this.sale?.estado === 'AUTORIZADO') {
      const ok = confirm('Esta orden ya está autorizada. Al editarla, se devolverá automáticamente el stock a la bodega y se cancelará la deuda en cartera. ¿Desea continuar?');
      if (!ok) return;
      
      this.isLoading = true;
      try {
        await this.salesService.revertirVenta(this.sale.id);
      } catch (err) {
        console.error('[Invoice] Error al revertir venta autorizada:', err);
        this.isLoading = false;
        alert('Error al procesar la reversión de la orden.');
        return;
      }
      this.isLoading = false;
    } else if (this.sale?.estado === 'CONFIRMADA') {
      try {
        await this.salesService.revertirVenta(this.sale.id);
      } catch (err) {
        console.error('[Invoice] Error al revertir venta:', err);
        return;
      }
    }
    this.router.navigate(['/sales', this.sale.id, 'edit']);
  }

  async descargarPDF() {
    const element = document.getElementById('invoice-content');
    if (!element) return;

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      windowWidth: this.INVOICE_WIDTH,
      onclone: (clonedDoc) => {
        const clonedElement = clonedDoc.getElementById('invoice-content');
        if (clonedElement) {
          // Forzar ancho estático A4 en el clon
          clonedElement.style.width = `${this.INVOICE_WIDTH}px`;
          clonedElement.style.minWidth = `${this.INVOICE_WIDTH}px`;
          clonedElement.style.maxWidth = `${this.INVOICE_WIDTH}px`;
          // Resetear cualquier zoom o restricción del contenedor padre
          if (clonedElement.parentElement) {
            clonedElement.parentElement.style.width = `${this.INVOICE_WIDTH}px`;
            clonedElement.parentElement.style.zoom = '1';
            clonedElement.parentElement.style.transform = 'none';
          }
        }
      }
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const ratio = canvas.height / canvas.width;
    const imgWidth = pageWidth;
    const imgHeight = pageWidth * ratio;

    let position = 0;
    let remaining = imgHeight;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    remaining -= pageHeight;

    while (remaining > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      remaining -= pageHeight;
    }

    const fileName = `orden-pedido-${this.sale?.numero_factura?.toString().padStart(6, '0') ?? '000000'
      }.pdf`;
    pdf.save(fileName);
  }

  imprimir() {
    window.print();
  }

  async anularVenta() {
    let msg = '¿Está seguro de anular esta orden? Esta acción es irreversible.';
    if (this.sale?.estado === 'AUTORIZADO') {
      msg = '¡ATENCIÓN! Esta orden ya está AUTORIZADA. Al anularla, el stock regresará automáticamente a la bodega y se cancelará la cuenta por cobrar. ¿Desea anularla?';
    }

    if (!confirm(msg)) return;

    this.isLoading = true;
    try {
      await this.salesService.anularVenta(this.sale.id);
      this.router.navigate(['/sales']);
    } catch (error) {
      console.error('Error al anular la orden:', error);
      alert('Error al anular la orden.');
    } finally {
      this.isLoading = false;
    }
  }

  async autorizarOrden() {
    if (!this.isAdmin() || this.sale?.estado !== 'CONFIRMADA') return;

    const ok = confirm('¿Desea autorizar esta orden? Esto afectará el inventario.');
    if (!ok) return;

    this.isLoading = true;
    try {
      await this.salesService.authorizeSale(this.sale.id);
      // Recargar la venta para ver el nuevo estado
      this.sale = await this.salesService.getById(this.sale.id);
    } catch (error) {
      console.error('[Invoice] Error al autorizar orden:', error);
      alert('Error al autorizar la orden');
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Formatea una fecha ISO UTC a la zona horaria de Colombia usando Intl.DateTimeFormat
   * Resultado esperado: 17/03/2026, 5:41 p. m.
   */
  formatFechaColombia(fecha: string | null | undefined): string {
    if (!fecha) return '';

    // Si viene en formato YYYY-MM-DD (DATE de PostgreSQL)
    if (fecha.length === 10) {
      const [year, month, day] = fecha.split('-');
      return `${day}/${month}/${year}`;
    }

    try {
      // Si llega un string de fecha sin zona, forzarlo a UTC para que Intl lo mueva a Bogota
      let valueToParse = fecha;
      if (typeof fecha === 'string' && fecha.includes('T') && !fecha.endsWith('Z') && !fecha.includes('+')) {
        valueToParse = fecha + 'Z';
      }

      const dateObj = new Date(valueToParse);

      return new Intl.DateTimeFormat('es-CO', {
        timeZone: 'America/Bogota',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(dateObj);
    } catch (e) {
      console.error('Error formatting date for Colombia:', e);
      return fecha;
    }
  }
}
