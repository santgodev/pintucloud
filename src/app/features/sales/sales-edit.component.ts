import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SalesService } from './services/sales.service';
import { ClientsService, Client } from '../clients/services/clients.service';
import { InventoryService, InventoryItem } from '../inventory/services/inventory.service';
import { SharedModule } from '../../shared/shared.module';
import { Observable, BehaviorSubject, combineLatest, map } from 'rxjs';
import { CanComponentDeactivate } from './guards/unsaved-changes.guard';

interface CartItem {
  product: InventoryItem;
  quantity: number;
  subtotal: number;
}

@Component({
  selector: 'app-sales-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, SharedModule],
  template: `
    <!-- Loading -->
    <div *ngIf="isLoading" class="fixed inset-0 bg-white z-50 flex items-center justify-center">
      <span class="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></span>
    </div>

    <div *ngIf="!isLoading" class="min-h-screen bg-slate-50 p-6">

      <!-- Header -->
      <div class="flex justify-between items-center mb-6 max-w-6xl mx-auto">
        <div>
          <button (click)="goBack()" class="btn-icon text-sm text-slate-500 hover:text-indigo-600 font-semibold mb-1 flex items-center gap-1">
            ← Volver
          </button>
          <h1 class="text-2xl font-bold text-slate-900">Editar Orden</h1>
          <p class="text-sm text-slate-500">
            No. {{ sale?.numero_factura?.toString().padStart(6,'0') }} —
            <span class="font-semibold text-amber-600">BORRADOR</span>
          </p>
        </div>
      </div>

      <div class="max-w-6xl mx-auto bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col md:flex-row overflow-hidden" style="min-height: 70vh;">

        <!-- Left: Selection (50%) -->
        <div class="flex-1 p-6 border-r border-slate-200 bg-white">
          
          <!-- Cliente -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-slate-700 mb-2">Cliente</label>
            <select [(ngModel)]="selectedClientId" (ngModelChange)="markAsDirty()" class="input-premium w-full">
              <option [ngValue]="null">Buscar o seleccionar cliente</option>
              <option *ngFor="let c of clients$ | async" [value]="c.id">{{ c.codigo }} — {{ c.razon_social }}</option>
            </select>
          </div>

          <!-- Bodega (si hay varias) -->
          <div *ngIf="bodegas.length > 1" class="mb-6">
            <label class="block text-sm font-medium text-slate-700 mb-2">Bodega de Despacho *</label>
            <select [(ngModel)]="selectedBodegaId" (ngModelChange)="onBodegaChange()" class="input-premium w-full" [class.border-red-500]="bodegas.length > 1 && !selectedBodegaId">
              <option [ngValue]="null">Seleccionar Bodega...</option>
              <option *ngFor="let b of bodegas" [value]="b.id">{{ b.nombre }}</option>
            </select>
            <p class="text-xs text-slate-500 mt-1">Seleccione una bodega para consultar el inventario disponible</p>
          </div>

          <!-- Buscar producto -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-slate-700 mb-2">Agregar Producto</label>
            <div class="relative">
               <svg class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
               <input type="text" placeholder="Buscar producto por nombre o código"
                      [ngModel]="searchTerm" (ngModelChange)="search($event)"
                      class="input-premium w-full pl-10 pr-3" />
            </div>
          </div>

          <!-- Lista productos -->
          <div class="space-y-2 overflow-y-auto max-h-[500px]">
             <div *ngIf="bodegas.length > 1 && !selectedBodegaId" class="text-center py-10 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                 <p class="text-sm text-slate-400 italic">Seleccione una bodega arriba para ver productos</p>
             </div>

             <div *ngFor="let item of filteredInventory$ | async" 
                  class="p-3 rounded-lg border border-slate-200 transition-colors flex justify-between items-center group"
                  [class.opacity-50]="item.stock === 0"
                  [class.hover:bg-slate-100]="item.stock > 0"
                  [class.cursor-pointer]="item.stock > 0"
                  [class.cursor-not-allowed]="item.stock === 0"
                  (click)="item.stock > 0 ? addToCart(item) : null">
                <div class="flex items-center gap-3">
                   <div class="w-10 h-10 rounded bg-slate-100 overflow-hidden border border-slate-200 flex items-center justify-center">
                      <img *ngIf="item.imageUrl" [src]="item.imageUrl" (error)="handleImageError(item)" class="w-full h-full object-cover">
                      <svg *ngIf="!item.imageUrl" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-slate-300"><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"></path><line x1="16" y1="5" x2="22" y2="5"></line><line x1="19" y1="2" x2="19" y2="8"></line><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></svg>
                   </div>
                   <div>
                      <div class="font-medium text-sm text-slate-800">{{ item.productName }}</div>
                      <div class="text-xs text-slate-500">Stock: <span [class.text-amber-500]="item.stock > 0 && item.stock < 10" [class.text-red-500]="item.stock === 0">{{ item.stock }}</span></div>
                   </div>
                </div>
                <div class="text-right">
                   <div class="font-bold text-indigo-600">{{ item.price | currency:'COP':'symbol-narrow':'1.0-0' }}</div>
                   <div *ngIf="item.stock > 0" class="text-[10px] text-indigo-600 font-semibold uppercase tracking-wider hover:text-indigo-800 transition-colors">Añadir +</div>
                   <div *ngIf="item.stock === 0" class="text-[10px] text-red-500 uppercase tracking-wider">Agotado</div>
                </div>
             </div>
          </div>
        </div>

        <!-- Right: Cart & Summary (50%) -->
        <div class="flex-1 flex flex-col bg-slate-50/50 border-l border-slate-200">
          <div class="p-6 flex-1 overflow-y-auto">
             <h3 class="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Resumen de Orden</h3>
             
             <div *ngIf="cart.length === 0" class="text-center py-10 opacity-50">
                <svg class="mx-auto mb-2 text-slate-400" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                <p class="text-sm text-slate-400">El carrito está vacío</p>
             </div>

             <div class="space-y-3">
                <div *ngFor="let item of cart; let i = index" class="flex gap-3 items-start animate-in slide-in-from-right duration-200 p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
                   <div class="flex-1">
                      <div class="text-sm font-semibold text-slate-800">{{ item.product.productName }}</div>
                      <div class="text-xs text-slate-500">{{ item.subtotal | currency:'COP':'symbol-narrow':'1.0-0' }}</div>
                   </div>
                   <div class="flex items-center gap-2 bg-slate-100 rounded px-2 py-1 border border-slate-200">
                      <button (click)="updateQty(i, -1)" class="bg-slate-100 hover:bg-slate-200 rounded-md hover:text-indigo-600 text-slate-400 font-bold px-1">-</button>
                      <input type="number" [ngModel]="item.quantity" (ngModelChange)="setQuantity(i, $event)" 
                             class="w-12 text-center bg-transparent border-none focus:outline-none text-slate-800 font-medium text-sm p-0 appearance-none" 
                             min="1" [max]="item.product.stock">
                      <button (click)="updateQty(i, 1)" class="bg-slate-100 hover:bg-slate-200 rounded-md hover:text-indigo-600 text-slate-400 font-bold px-1">+</button>
                   </div>
                   <button (click)="removeItem(i)" class="text-slate-300 hover:text-red-500 p-1">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                   </button>
                </div>
             </div>
          </div>

          <!-- Payment Method and Footer -->
          <div class="p-6 border-t border-slate-200 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
             
              <div class="grid grid-cols-2 gap-4 mb-4">
                  <div>
                      <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Forma de Pago</label>
                       <select [(ngModel)]="condicionPago" (change)="onCondicionPagoChange()" class="input-premium w-full">
                           <option value="CONTADO">Contado</option>
                           <option value="CREDITO">Crédito</option>
                       </select>
                  </div>
                  <div *ngIf="condicionPago === 'CONTADO'">
                       <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Medio de Pago</label>
                       <select [(ngModel)]="paymentMethod" (change)="markAsDirty()" class="input-premium w-full">
                           <option value="EFECTIVO">Efectivo</option>
                           <option value="TRANSFERENCIA">Transferencia</option>
                       </select>
                   </div>
              </div>

              <div *ngIf="condicionPago === 'CREDITO'" class="mb-4">
                  <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Plazo de Crédito (Días)</label>
                  <select [(ngModel)]="diasCredito" (change)="markAsDirty()" class="input-premium w-full">
                      <option [ngValue]="15">15 días</option>
                      <option [ngValue]="30">30 días</option>
                  </select>
              </div>

               <div class="mb-4">
                   <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tipo de Documento</label>
                   <select [(ngModel)]="tipoDocumento" (change)="markAsDirty()" class="input-premium w-full">
                       <option [ngValue]="1">1 - Facturación electrónica</option>
                       <option [ngValue]="2">2 - Orden de venta</option>
                   </select>
               </div>

               <div class="mb-4">
                    <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Descuento</label>
                    <select [(ngModel)]="descuentoPorcentaje" (change)="markAsDirty(); calculateTotal()" class="input-premium w-full">
                        <option [value]="0">Sin descuento (0%)</option>
                        <option [value]="3">3%</option>
                        <option [value]="5">5%</option>
                        <option [value]="10">10%</option>
                    </select>
                </div>

             <div *ngIf="descuentoPorcentaje > 0" class="flex justify-between items-center mb-1 text-sm">
                <span class="text-slate-500">Subtotal</span>
                <span class="text-slate-500">{{ subtotalCarrito | currency:'COP':'symbol-narrow':'1.0-0' }}</span>
             </div>
             <div *ngIf="descuentoPorcentaje > 0" class="flex justify-between items-center mb-2 text-sm text-red-500 font-medium">
                <span>Descuento ({{ descuentoPorcentaje }}%)</span>
                <span>- {{ descuentoCalculado | currency:'COP':'symbol-narrow':'1.0-0' }}</span>
             </div>
             <div class="flex justify-between items-center mb-4">
                <span class="text-slate-700 font-medium">Total a Pagar</span>
                 <span class="text-xl font-bold text-indigo-600">{{ totalConDescuento | currency:'COP':'symbol-narrow':'1.0-0' }}</span>
             </div>

             <!-- Botones -->
             <div class="flex gap-3 mt-4">
                 <button (click)="goBack()" type="button" class="w-1/3 py-3 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors font-medium text-sm flex justify-center items-center">
                    Cancelar
                 </button>
                 <button (click)="guardarCambios()" 
                         [disabled]="cart.length === 0 || !selectedClientId || processing || (isAdmin && !selectedBodegaId)"
                         class="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-lg shadow-indigo-500/30">
                    <span *ngIf="processing" class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                    {{ processing ? 'Guardando...' : 'Guardar Cambios' }}
                 </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .btn-icon { @apply p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-900; }
    .input-premium { @apply bg-slate-100 border border-slate-200 rounded-lg px-4 py-2 text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all focus:ring-2 focus:ring-indigo-100; }
    .text-danger { color: #ef4444; }
    
    /* Hide Spinners */
    input[type=number]::-webkit-inner-spin-button, 
    input[type=number]::-webkit-outer-spin-button { 
      -webkit-appearance: none; 
      margin: 0; 
    }
    input[type=number] {
      -moz-appearance: textfield;
    }
  `]
})
export class SalesEditComponent implements OnInit, CanComponentDeactivate {

  sale: any;
  isLoading = true;
  processing = false;

  // Unsaved changes tracking
  private isDirty = false;
  markAsDirty() {
    this.isDirty = true;
  }
  public hasUnsavedChanges(): boolean {
    return this.isDirty && !this.isCompleted;
  }
  private isCompleted = false;

  // Usuario
  currentUser: { id: string; rol: string } | null = null;
  get isAdmin(): boolean { return this.currentUser?.rol === 'admin_distribuidor'; }

  // Selección
  selectedClientId: string | null = null;
  selectedBodegaId: string | null = null;
  condicionPago: 'CONTADO' | 'CREDITO' = 'CONTADO';
  diasCredito = 30;
  paymentMethod = 'EFECTIVO';
  tipoDocumento: number = 2;
  descuentoPorcentaje: number = 0;

  // Carrito
  cart: CartItem[] = [];
  total = 0;

  // Inventario / Clientes
  clients$: Observable<Client[]>;
  bodegas: any[] = [];
  filteredInventory$: Observable<InventoryItem[]>;
  searchTerm = '';
  private searchSubject = new BehaviorSubject<string>('');

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private salesService: SalesService,
    private clientsService: ClientsService,
    private inventoryService: InventoryService
  ) {
    this.clients$ = this.clientsService.getClients();
    this.filteredInventory$ = new BehaviorSubject<InventoryItem[]>([]).asObservable();
  }

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.router.navigate(['/sales']); return; }

    try {
      this.sale = await this.salesService.getById(id);

      // Cargar perfil de usuario
      const { data: authData } = await (this.salesService as any)['supabase'].auth.getUser();
      const userId = authData?.user?.id;
      if (userId) {
        const { data: profile } = await (this.salesService as any)['supabase']
          .from('usuarios')
          .select('id, rol, bodega_asignada_id, distribuidor_id')
          .eq('id', userId)
          .single();
        this.currentUser = profile ?? null;

        // Cargar bodegas si admin
        if (this.isAdmin && profile?.distribuidor_id) {
          const { data: bods } = await (this.salesService as any)['supabase']
            .from('bodegas').select('*').eq('distribuidor_id', profile.distribuidor_id);
          this.bodegas = bods || [];
        } else if (profile?.bodega_asignada_id) {
          const { data: bod } = await (this.salesService as any)['supabase']
            .from('bodegas').select('*').eq('id', profile.bodega_asignada_id).single();
          if (bod) this.bodegas = [bod];
        }
      }

      // Guardarrails
      if (this.sale?.estado === 'ANULADA') {
        this.router.navigate(['/sales', id, 'invoice']); return;
      }
      if (this.sale?.estado === 'CONFIRMADA' && !this.isAdmin) {
        this.router.navigate(['/sales', id, 'invoice']); return;
      }

      // Precargar datos de la venta existente
      this.selectedClientId = this.sale.cliente_id;
      this.selectedBodegaId = this.sale.bodega_id;
      this.condicionPago = this.sale.condicion_pago ?? 'CONTADO';
      this.diasCredito = this.sale.dias_credito ?? 30;
      this.paymentMethod = (this.sale.metodo_pago ?? '').toUpperCase();
      this.tipoDocumento = this.sale.tipo_documento ?? 2;
      this.descuentoPorcentaje = this.sale.descuento_porcentaje ?? 0;

      // Precargar carrito desde detalle existente
      if (this.sale.detalle_ventas?.length) {
        this.cart = this.sale.detalle_ventas.map((d: any) => ({
          product: {
            productId: d.producto_id,
            productName: d.productos?.nombre ?? d.producto_id,
            price: d.precio_unitario,
            stock: 999, // no bloqueamos edición por stock mínimo
            sku: d.productos?.sku ?? '',
            imageUrl: ''
          } as InventoryItem,
          quantity: d.cantidad,
          subtotal: d.subtotal
        }));
        this.calculateTotal();
      }

      // Cargar inventario
      await this.loadInventory();

      this.isLoading = false;

    } catch (err) {
      console.error('[SalesEdit] Error cargando venta:', err);
      this.router.navigate(['/sales']);
    }
  }

  async loadInventory() {
    const inv$ = await this.inventoryService.getInventory(this.selectedBodegaId || undefined);
    this.filteredInventory$ = combineLatest([inv$, this.searchSubject]).pipe(
      map(([items, term]) => {
        const t = term.toLowerCase();
        return items.filter(i =>
          i.productName.toLowerCase().includes(t) || i.sku.toLowerCase().includes(t)
        );
      })
    );
  }

  async onBodegaChange() {
    await this.loadInventory();
  }

  search(term: string) { this.searchSubject.next(term); }

  addToCart(item: InventoryItem) {
    this.markAsDirty();
    const idx = this.cart.findIndex(c => c.product.productId === item.productId);
    if (idx >= 0) {
      this.cart[idx].quantity++;
      this.cart[idx].subtotal = this.cart[idx].quantity * item.price;
    } else {
      this.cart.push({ product: item, quantity: 1, subtotal: item.price });
    }
    this.calculateTotal();
  }

  updateQty(index: number, delta: number) {
    this.markAsDirty();
    const item = this.cart[index];
    const newQty = item.quantity + delta;
    if (newQty <= 0) { this.removeItem(index); return; }
    item.quantity = newQty;
    item.subtotal = item.quantity * item.product.price;
    this.calculateTotal();
  }

  setQuantity(index: number, value: number) {
    this.markAsDirty();
    const item = this.cart[index];
    let newQty = value;
    if (newQty <= 0) newQty = 1;
    if (newQty > item.product.stock) newQty = item.product.stock;
    item.quantity = newQty;
    item.subtotal = item.quantity * item.product.price;
    this.calculateTotal();
  }

  removeItem(index: number) {
    this.markAsDirty();
    this.cart.splice(index, 1);
    this.calculateTotal();
  }

  calculateTotal() {
    this.total = this.cart.reduce((s, i) => s + i.subtotal, 0);
  }

  get subtotalCarrito(): number {
    return this.cart.reduce((sum, item) => sum + item.subtotal, 0);
  }

  get descuentoCalculado(): number {
    return this.subtotalCarrito * (this.descuentoPorcentaje / 100);
  }

  get totalConDescuento(): number {
    return this.subtotalCarrito - this.descuentoCalculado;
  }

  onCondicionPagoChange() {
    this.markAsDirty();
    if (this.condicionPago === 'CREDITO') {
      this.paymentMethod = '';
      this.diasCredito = 15;
    } else {
      this.paymentMethod = 'EFECTIVO';
    }
  }

  handleImageError(item: any) {
    item.imageUrl = '';
  }

  goBack() {
    this.router.navigate(['/sales', this.sale.id, 'invoice']);
  }

  async guardarCambios() {
    if (!this.selectedClientId || this.cart.length === 0 || !this.sale?.id || (this.isAdmin && !this.selectedBodegaId)) return;
    this.processing = true;

    try {
      const supabase = (this.salesService as any)['supabase'];

      const method = (this.paymentMethod || '').toUpperCase();

      // 1. Actualizar encabezado de la venta
      await supabase.from('ventas').update({
        cliente_id: this.selectedClientId,
        metodo_pago: this.condicionPago === 'CREDITO' ? null : method,
        condicion_pago: this.condicionPago,
        dias_credito: this.condicionPago === 'CREDITO' ? this.diasCredito : null,
        tipo_documento: this.tipoDocumento,
        bodega_id: this.selectedBodegaId,
        descuento_porcentaje: this.descuentoPorcentaje
      }).eq('id', this.sale.id);

      // 2. Eliminar detalle anterior y reinsertar
      await supabase.from('detalle_ventas').delete().eq('venta_id', this.sale.id);

      const items = this.cart.map(c => ({
        venta_id: this.sale.id,
        producto_id: c.product.productId,
        cantidad: c.quantity,
        precio_unitario: c.product.price,
        subtotal: c.subtotal
      }));
      await supabase.from('detalle_ventas').insert(items);

      // 3. Confirmar (RPC)
      await this.salesService.confirmSale(this.sale.id);

      // Indicate completion so we bypass the unsaved changes guard
      this.isCompleted = true;

      // 4. Navegar a la factura — replaceUrl evita que Angular reutilice la instancia previa
      await this.router.navigate(
        ['/sales', this.sale.id, 'invoice'],
        { replaceUrl: true }
      );

    } catch (err: any) {
      console.error('[SalesEdit] Error guardando cambios:', err);
      alert('Error al guardar cambios: ' + err.message);
      this.processing = false;
    }
  }
}
