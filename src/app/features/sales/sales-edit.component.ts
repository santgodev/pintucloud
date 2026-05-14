import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SalesService, Sale } from './services/sales.service';
import { ClientsService, Client } from '../clients/services/clients.service';
import { InventoryService, InventoryItem } from '../inventory/services/inventory.service';
import { SharedModule } from '../../shared/shared.module';
import { Observable, fromEvent, merge } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { CanComponentDeactivate } from './guards/unsaved-changes.guard';
import { AuthService } from '../../core/services/auth.service';

interface CartItem {
  product: InventoryItem;
  quantity: number;
  subtotal: number;
}

@Component({
  selector: 'app-sales-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, SharedModule],
  templateUrl: './sales-edit.component.html',
  styleUrls: ['./sales-edit.component.css']
})
export class SalesEditComponent implements OnInit, CanComponentDeactivate {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private salesService = inject(SalesService);
  private clientsService = inject(ClientsService);
  private inventoryService = inject(InventoryService);
  private authService = inject(AuthService);

  // State Signals
  sale = signal<any>(null);
  isLoading = signal(true);
  isProcessing = signal(false);
  isCompleted = signal(false);
  isDirty = signal(false);

  // Form Signals
  selectedClientId = signal<string | null>(null);
  selectedBodegaId = signal<string | null>(null);
  condicionPago = signal<'CONTADO' | 'CREDITO'>('CONTADO');
  diasCredito = signal(30);
  paymentMethod = signal('EFECTIVO');
  tipoDocumento = signal(2);
  descuentoPorcentaje = signal(0);
  searchTerm = signal('');

  // Inventory & Clients
  clients$: Observable<Client[]> = this.clientsService.getClients();
  bodegas = signal<any[]>([]);
  allInventory = signal<InventoryItem[]>([]);

  // Cart Signal
  cart = signal<CartItem[]>([]);

  // Computed totals
  subtotalCarrito = computed(() => this.cart().reduce((sum, item) => sum + item.subtotal, 0));
  descuentoCalculado = computed(() => this.subtotalCarrito() * (this.descuentoPorcentaje() / 100));
  totalConDescuento = computed(() => this.subtotalCarrito() - this.descuentoCalculado());

  // Filtered Inventory
  filteredInventory = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.allInventory().filter(i =>
      i.productName.toLowerCase().includes(term) || i.sku.toLowerCase().includes(term)
    );
  });

  isAdmin = this.authService.isAdmin;

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/sales']);
      return;
    }

    try {
      const saleData = await this.salesService.getById(id);
      this.sale.set(saleData);

      // Load Profile & Bodegas
      const profile = this.authService.currentUserSignal();
      if (profile) {
        if (this.isAdmin()) {
          const bods = await this.inventoryService.getBodegasByDistribuidor(profile.companyId);
          this.bodegas.set(bods || []);
        } else if (saleData.bodega_id) {
           // Asesor: use the bodega from the sale or profile
           const bods = await this.inventoryService.getBodegas();
           const bod = bods.find(b => b.id === saleData.bodega_id);
           if (bod) this.bodegas.set([bod]);
        }
      }

      // Guardrails
      if (saleData.estado === 'ANULADA') {
        this.router.navigate(['/sales', id, 'invoice']);
        return;
      }
      if (saleData.estado === 'CONFIRMADA' && !this.isAdmin()) {
        this.router.navigate(['/sales', id, 'invoice']);
        return;
      }

      // Map sale values to signals
      this.selectedClientId.set(saleData.cliente_id);
      this.selectedBodegaId.set(saleData.bodega_id);
      this.condicionPago.set(saleData.condicion_pago ?? 'CONTADO');
      this.diasCredito.set(saleData.dias_credito ?? 30);
      this.paymentMethod.set((saleData.metodo_pago ?? 'EFECTIVO').toUpperCase());
      this.tipoDocumento.set(saleData.tipo_documento ?? 2);
      this.descuentoPorcentaje.set(saleData.descuento_porcentaje ?? 0);

      // Map cart
      if ((saleData as any).detalle_ventas?.length) {
        const initialCart = (saleData as any).detalle_ventas.map((d: any) => ({
          product: {
            productId: d.producto_id,
            productName: d.productos?.nombre ?? d.producto_id,
            price: d.precio_unitario,
            stock: 999, // Fallback high stock for draft editing
            sku: d.productos?.sku ?? '',
            imageUrl: ''
          } as InventoryItem,
          quantity: d.cantidad,
          subtotal: d.subtotal
        }));
        this.cart.set(initialCart);
      }

      await this.loadInventory();
      this.isLoading.set(false);
    } catch (err) {
      console.error('[SalesEdit] Error loading sale:', err);
      this.router.navigate(['/sales']);
    }
  }

  async loadInventory() {
    const inv$ = await this.inventoryService.getInventory(this.selectedBodegaId() || undefined);
    inv$.subscribe(items => this.allInventory.set(items));
  }

  async onBodegaChange() {
    this.markAsDirty();
    await this.loadInventory();
  }

  search(term: string) {
    this.searchTerm.set(term);
  }

  addToCart(item: InventoryItem) {
    this.markAsDirty();
    this.cart.update(current => {
      const idx = current.findIndex(c => c.product.productId === item.productId);
      if (idx >= 0) {
        const updated = [...current];
        updated[idx] = {
          ...updated[idx],
          quantity: updated[idx].quantity + 1,
          subtotal: (updated[idx].quantity + 1) * item.price
        };
        return updated;
      }
      return [...current, { product: item, quantity: 1, subtotal: item.price }];
    });
  }

  updateQty(index: number, delta: number) {
    this.markAsDirty();
    this.cart.update(current => {
      const updated = [...current];
      const newQty = updated[index].quantity + delta;
      if (newQty <= 0) {
        updated.splice(index, 1);
        return updated;
      }
      updated[index] = {
        ...updated[index],
        quantity: newQty,
        subtotal: newQty * updated[index].product.price
      };
      return updated;
    });
  }

  setQuantity(index: number, value: number) {
    this.markAsDirty();
    this.cart.update(current => {
      const updated = [...current];
      let newQty = Math.max(1, value);
      if (newQty > updated[index].product.stock && updated[index].product.stock > 0) {
        newQty = updated[index].product.stock;
      }
      updated[index] = {
        ...updated[index],
        quantity: newQty,
        subtotal: newQty * updated[index].product.price
      };
      return updated;
    });
  }

  removeItem(index: number) {
    this.markAsDirty();
    this.cart.update(current => {
      const updated = [...current];
      updated.splice(index, 1);
      return updated;
    });
  }

  onCondicionPagoChange() {
    this.markAsDirty();
    if (this.condicionPago() === 'CREDITO') {
      this.paymentMethod.set('');
      this.diasCredito.set(15);
    } else {
      this.paymentMethod.set('EFECTIVO');
    }
  }

  markAsDirty() {
    this.isDirty.set(true);
  }

  public hasUnsavedChanges(): boolean {
    return this.isDirty() && !this.isCompleted();
  }

  handleImageError(item: any) {
    item.imageUrl = '';
  }

  goBack() {
    this.router.navigate(['/sales', this.sale().id, 'invoice']);
  }

  async guardarCambios() {
    if (!this.selectedClientId() || this.cart().length === 0 || !this.sale()?.id || (this.isAdmin() && !this.selectedBodegaId())) return;
    this.isProcessing.set(true);

    try {
      const method = (this.paymentMethod() || '').toUpperCase();

      // 1. Update Sale Header via Service (Encapsulated)
      await this.salesService.updateSaleHeader(this.sale().id, {
        cliente_id: this.selectedClientId(),
        metodo_pago: this.condicionPago() === 'CREDITO' ? null : method,
        condicion_pago: this.condicionPago(),
        dias_credito: this.condicionPago() === 'CREDITO' ? this.diasCredito() : null,
        tipo_documento: this.tipoDocumento(),
        bodega_id: this.selectedBodegaId(),
        descuento_porcentaje: this.descuentoPorcentaje()
      });

      // 2. Clear and Insert details via Service
      await this.salesService.deleteDetails(this.sale().id);

      const items = this.cart().map(c => ({
        venta_id: this.sale().id,
        producto_id: c.product.productId,
        cantidad: c.quantity,
        precio_unitario: c.product.price,
        subtotal: c.subtotal
      }));
      await this.salesService.addDetails(items);

      // 3. Confirm (Transactional logic on DB)
      await this.salesService.confirmSale(this.sale().id);

      this.isCompleted.set(true);
      await this.router.navigate(['/sales', this.sale().id, 'invoice'], { replaceUrl: true });

    } catch (err: any) {
      console.error('[SalesEdit] Error saving sale:', err);
      alert('Error al guardar cambios: ' + err.message);
      this.isProcessing.set(false);
    }
  }
}
