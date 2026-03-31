import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SalesService } from './services/sales.service';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-sales-invoice',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sales-invoice.component.html',
  styleUrls: ['./sales-invoice.component.scss']
})
export class SalesInvoiceComponent implements OnInit {
  sale: any;
  currentUser: { id: string; rol: string } | null = null;
  isLoading = true;
  today = new Date();
  fillerRows: number[] = [];
  invoiceZoom: string = '1';

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

  get isAdmin(): boolean {
    return this.currentUser?.rol === 'admin_distribuidor';
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private salesService: SalesService
  ) { }

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

      // Cargar rol del usuario autenticado desde la sesión de Supabase
      const { data: authData } = await (this.salesService as any)['supabase'].auth.getUser();
      const userId = authData?.user?.id;
      if (userId) {
        const { data: profile } = await (this.salesService as any)['supabase']
          .from('usuarios')
          .select('id, rol')
          .eq('id', userId)
          .single();
        this.currentUser = profile ?? null;
      }

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
    this.router.navigate(['/sales']);
  }

  async editarOrden() {
    if (this.sale?.estado === 'CONFIRMADA') {
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
      backgroundColor: '#ffffff'
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

  async anularVenta() {
    if (!confirm('¿Está seguro de anular esta orden? Esta acción es irreversible.')) return;

    try {
      await this.salesService.anularVenta(this.sale.id);
      this.router.navigate(['/sales']);
    } catch (error) {
      console.error('Error al anular la orden:', error);
      alert('Error al anular la orden.');
    }
  }

  async autorizarOrden() {
    if (!this.isAdmin || this.sale?.estado !== 'CONFIRMADA') return;

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
