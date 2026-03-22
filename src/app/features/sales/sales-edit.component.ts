import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SalesService } from './services/sales.service';
import { ClientsService, Client } from '../clients/services/clients.service';
import { InventoryService, InventoryItem } from '../inventory/services/inventory.service';
import { SharedModule } from '../../shared/shared.module';
import { Observable, BehaviorSubject, combineLatest, map } from 'rxjs';

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
          <button (click)="goBack()" class="text-sm text-slate-500 hover:text-indigo-600 font-semibold mb-1 flex items-center gap-1">
            ← Volver
          </button>
          <h1 class="text-2xl font-bold text-slate-900">Editar Orden</h1>
          <p class="text-sm text-slate-500">
            Orden #{{ sale?.numero_factura?.toString().padStart(6,'0') }} —
            <span class="font-semibold text-amber-600">BORRADOR</span>
          </p>
        </div>
        <button
          (click)="guardarCambios()"
          [disabled]="cart.length === 0 || !selectedClientId || processing"
          class="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md shadow-indigo-200 transition-all">
          <span *ngIf="processing" class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
          {{ processing ? 'Guardando...' : '✓ Confirmar Cambios' }}
        </button>
      </div>

      <div class="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Left: Producto selector -->
        <div class="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">

          <!-- Cliente -->
          <div class="mb-5">
            <label class="block text-sm font-medium text-slate-700 mb-2">Cliente</label>
            <select [(ngModel)]="selectedClientId" class="input-edit w-full">
              <option [ngValue]="null">Seleccionar cliente...</option>
              <option *ngFor="let c of clients$ | async" [value]="c.id">{{ c.razon_social }}</option>
            </select>
          </div>

          <!-- Bodega (solo admin) -->
          <div *ngIf="isAdmin" class="mb-5">
            <label class="block text-sm font-medium text-slate-700 mb-2">Bodega de Despacho</label>
            <select [(ngModel)]="selectedBodegaId" (ngModelChange)="onBodegaChange()" class="input-edit w-full">
              <option [ngValue]="null">Seleccionar bodega...</option>
              <option *ngFor="let b of bodegas" [value]="b.id">{{ b.nombre }}</option>
            </select>
          </div>

          <!-- Buscar producto -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-slate-700 mb-2">Agregar Producto</label>
            <div class="relative">
              <input type="text" placeholder="Buscar producto..."
                     [ngModel]="searchTerm" (ngModelChange)="search($event)"
                     class="input-edit w-full pl-10" />
              <svg class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="18" height="18"
                   viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
          </div>

          <!-- Lista productos -->
          <div class="space-y-2 max-h-80 overflow-y-auto">
            <div *ngFor="let item of filteredInventory$ | async"
                 class="p-3 rounded-lg border border-slate-200 flex justify-between items-center cursor-pointer hover:bg-indigo-50 hover:border-indigo-200 transition-all"
                 [class.opacity-40]="item.stock === 0"
                 [class.cursor-not-allowed]="item.stock === 0"
                 (click)="item.stock > 0 ? addToCart(item) : null">
              <div>
                <div class="text-sm font-semibold text-slate-800">{{ item.productName }}</div>
                <div class="text-xs text-slate-500">
                  Stock: <span [class.text-red-500]="item.stock === 0">{{ item.stock }}</span>
                </div>
              </div>
              <div class="text-right">
                <div class="font-bold text-indigo-600">{{ item.price | currency:'COP':'symbol-narrow':'1.0-0' }}</div>
                <div *ngIf="item.stock > 0" class="text-[10px] text-slate-400 uppercase">+ Añadir</div>
                <div *ngIf="item.stock === 0" class="text-[10px] text-red-400 uppercase">Agotado</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Carrito + Configuración -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">

          <!-- Items del carrito -->
          <div class="p-5 flex-1 overflow-y-auto">
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Resumen de Orden</h3>

            <div *ngIf="cart.length === 0" class="text-center py-10 text-slate-400 text-sm italic">
              El carrito está vacío
            </div>

            <div class="space-y-3">
              <div *ngFor="let item of cart; let i = index"
                   class="flex gap-3 items-start p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div class="flex-1">
                  <div class="text-sm font-semibold text-slate-800">{{ item.product.productName }}</div>
                  <div class="text-xs text-slate-500">{{ item.subtotal | currency:'COP':'symbol-narrow':'1.0-0' }}</div>
                </div>
                <div class="flex items-center gap-2 bg-white rounded-lg px-2 py-1 border border-slate-200">
                  <button (click)="updateQty(i, -1)" class="text-slate-400 hover:text-indigo-600 font-bold px-1">-</button>
                  <span class="w-8 text-center text-sm font-medium">{{ item.quantity }}</span>
                  <button (click)="updateQty(i, 1)" class="text-slate-400 hover:text-indigo-600 font-bold px-1">+</button>
                </div>
                <button (click)="removeItem(i)" class="text-slate-300 hover:text-red-500 p-1">✕</button>
              </div>
            </div>
          </div>

          <!-- Footer config -->
          <div class="p-5 border-t border-slate-200">

            <div class="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Forma de Pago</label>
                <select [(ngModel)]="condicionPago" (ngModelChange)="condicionPago === 'CREDITO' && (paymentMethod = '')" class="input-edit w-full text-sm">
                  <option value="CONTADO">Contado</option>
                  <option value="CREDITO">Crédito</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Medio de Pago</label>
                <select [(ngModel)]="paymentMethod" class="input-edit w-full text-sm"
                        [disabled]="condicionPago === 'CREDITO'">
                  <option value="">—</option>
                  <option *ngFor="let pm of ['Efectivo','Transferencia','Tarjeta']" [value]="pm">{{ pm }}</option>
                </select>
              </div>
            </div>

            <div *ngIf="condicionPago === 'CREDITO'" class="mb-3">
              <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Plazo (Días)</label>
              <select [(ngModel)]="diasCredito" class="input-edit w-full text-sm">
                <option [value]="15">15 días</option>
                <option [value]="30">30 días</option>
              </select>
            </div>

            <div class="mb-3">
              <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Tipo de Documento</label>
              <select [(ngModel)]="tipoDocumento" class="input-edit w-full text-sm">
                <option [ngValue]="1">1 – Facturación electrónica</option>
                <option [ngValue]="2">2 – Orden de venta</option>
              </select>
            </div>

            <div class="flex justify-between items-center mt-4 mb-4">
              <span class="text-slate-500 font-medium text-sm">Total</span>
              <span class="text-xl font-bold text-indigo-600">{{ total | currency:'COP':'symbol-narrow':'1.0-0' }}</span>
            </div>

          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .input-edit {
      @apply bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm
             focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100
             focus:outline-none transition-all;
    }
    .input-edit:disabled { @apply opacity-50 cursor-not-allowed; }
  `]
})
export class SalesEditComponent implements OnInit {

  sale: any;
  isLoading = true;
  processing = false;

  // Usuario
  currentUser: { id: string; rol: string } | null = null;
  get isAdmin(): boolean { return this.currentUser?.rol === 'admin_distribuidor'; }

  // Selección
  selectedClientId: string | null = null;
  selectedBodegaId: string | null = null;
  condicionPago: 'CONTADO' | 'CREDITO' = 'CONTADO';
  diasCredito = 30;
  paymentMethod = 'Efectivo';
  tipoDocumento: number = 2;

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
      this.paymentMethod = this.sale.metodo_pago ?? '';
      this.tipoDocumento = this.sale.tipo_documento ?? 2;

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
    const item = this.cart[index];
    const newQty = item.quantity + delta;
    if (newQty <= 0) { this.removeItem(index); return; }
    item.quantity = newQty;
    item.subtotal = item.quantity * item.product.price;
    this.calculateTotal();
  }

  removeItem(index: number) {
    this.cart.splice(index, 1);
    this.calculateTotal();
  }

  calculateTotal() {
    this.total = this.cart.reduce((s, i) => s + i.subtotal, 0);
  }

  goBack() {
    this.router.navigate(['/sales', this.sale.id, 'invoice']);
  }

  async guardarCambios() {
    if (!this.selectedClientId || this.cart.length === 0 || !this.sale?.id) return;
    this.processing = true;

    try {
      const supabase = (this.salesService as any)['supabase'];

      // 1. Actualizar encabezado de la venta
      await supabase.from('ventas').update({
        cliente_id: this.selectedClientId,
        metodo_pago: this.condicionPago === 'CREDITO' ? null : this.paymentMethod,
        condicion_pago: this.condicionPago,
        dias_credito: this.condicionPago === 'CREDITO' ? this.diasCredito : null,
        tipo_documento: this.tipoDocumento,
        bodega_id: this.selectedBodegaId
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

      // 🧪 Verificación: confirmar que los datos quedaron correctos en BD
      const ventaActualizada = await this.salesService.getById(this.sale.id);
      console.log('[SalesEdit] Detalle guardado:', ventaActualizada);

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
