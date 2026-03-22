import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../../../shared/shared.module';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ClientsService, Client } from '../../../clients/services/clients.service';
import { InventoryService, InventoryItem } from '../../../inventory/services/inventory.service';
import { SalesService } from '../../services/sales.service';
import { Observable, BehaviorSubject, combineLatest, map } from 'rxjs';

interface CartItem {
   product: InventoryItem;
   quantity: number;
   subtotal: number;
}

@Component({
   selector: 'app-sales-capture',
   standalone: true,
   imports: [CommonModule, SharedModule, FormsModule],
   template: `

    <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" (click)="closeModal()">
       <div class="bg-white border border-slate-200 rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200" (click)="$event.stopPropagation()">
          
          <!-- Header -->
          <div class="p-5 border-b border-slate-200 flex justify-between items-center bg-white">
             <div>
                <h2 class="text-xl font-bold text-main">Nueva Venta</h2>
                <p class="text-sm text-slate-600 mt-1">Registrar transacción</p>
             </div>
             <button type="button" (click)="closeModal()" class="btn-icon relative z-50 cursor-pointer hover:bg-red-50 hover:text-red-500">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
             </button>
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-hidden flex flex-col md:flex-row">
             
             <!-- Left: Selection (50%) -->
             <div class="flex-1 p-6 overflow-y-auto border-r border-slate-200 bg-white">
                
                 <!-- Bodega Select -->
                 <div class="mb-6" *ngIf="bodegas.length > 1">
                    <label class="block text-sm font-medium text-main mb-2 font-bold flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                        Bodega de Despacho *
                    </label>
                    <select [(ngModel)]="selectedBodegaId" (ngModelChange)="onBodegaChange()" class="input-premium w-full !bg-indigo-50 !border-indigo-100 font-bold text-indigo-700" [class.border-red-500]="!selectedBodegaId">
                       <option [ngValue]="null">Seleccionar Bodega...</option>
                       <option *ngFor="let b of bodegas" [value]="b.id">
                          {{ b.nombre }}
                       </option>
                    </select>
                    <p class="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-bold">Seleccione bodega para cargar existencias</p>
                 </div> 

                <!-- Client Select -->
                <div class="mb-6">
                   <label class="block text-sm font-medium text-main mb-2">Cliente</label>
                   <select [(ngModel)]="selectedClientId" class="input-premium w-full">
                      <option [ngValue]="null">Buscar o seleccionar cliente</option>
                      <option *ngFor="let client of clients$ | async" [value]="client.id">
                         {{ client.codigo }} — {{ client.razon_social }}
                      </option>
                   </select>
                </div>

                <!-- Product Search -->
                <div class="mb-4">
                   <label class="block text-sm font-medium text-main mb-2">Agregar Producto</label>
                   <div class="relative">
                        <svg class="absolute left-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        <input type="text" placeholder="Buscar producto por nombre o código" 
                               [ngModel]="searchTerm" (ngModelChange)="search($event)"
                               class="input-premium w-full pl-10 pr-3" />
                   </div>
                </div>

                <!-- Product List -->
                <div class="space-y-2">
                   <div *ngIf="!selectedBodegaId" class="text-center py-10 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                       <p class="text-sm text-muted italic">Seleccione una bodega arriba para ver productos</p>
                   </div>

                   <div *ngFor="let item of filteredInventory$ | async" 
                        class="p-3 rounded-lg border border-slate-200 transition-colors flex justify-between items-center group"
                        [class.opacity-50]="manejaInventario && item.stock === 0"
                        [class.cursor-pointer]="!manejaInventario || item.stock > 0"
                        [class.cursor-not-allowed]="manejaInventario && item.stock === 0"
                        (click)="(!manejaInventario || item.stock > 0) ? addToCart(item) : null">
                      <div class="flex items-center gap-3">
                         <div class="w-10 h-10 rounded bg-slate-100 overflow-hidden border border-slate-200 flex items-center justify-center">
                            <img *ngIf="item.imageUrl" [src]="item.imageUrl" (error)="handleImageError(item)" class="w-full h-full object-cover">
                            <svg *ngIf="!item.imageUrl" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-slate-300"><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"></path><line x1="16" y1="5" x2="22" y2="5"></line><line x1="19" y1="2" x2="19" y2="8"></line><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></svg>
                         </div>
                         <div>
                            <div class="font-medium text-sm text-main">{{ item.productName }}</div>
                            <!-- Conditional stock display based on bodega type -->
                            <div *ngIf="manejaInventario" class="text-xs text-muted">
                              Stock: <span [class.text-warning]="item.stock > 0 && item.stock < 10" [class.text-danger]="item.stock === 0">{{ item.stock }}</span>
                            </div>
                            <div *ngIf="!manejaInventario" class="text-xs font-medium text-indigo-500">Disponible bajo pedido</div>
                         </div>
                      </div>
                      <div class="text-right">
                         <div class="font-bold text-primary">{{ item.price | currency:'COP':'symbol-narrow':'1.0-0' }}</div>
                         <!-- Availability label -->
                         <div *ngIf="!manejaInventario" class="text-[10px] text-indigo-600 font-semibold uppercase tracking-wider">Añadir +</div>
                         <div *ngIf="manejaInventario && item.stock > 0" class="text-[10px] text-indigo-600 font-semibold uppercase tracking-wider hover:text-indigo-800 transition-colors">Añadir +</div>
                         <div *ngIf="manejaInventario && item.stock === 0" class="text-[10px] text-danger uppercase tracking-wider">Agotado</div>
                      </div>
                   </div>
                </div>
             </div>

             <!-- Right: Cart & Summary (50%) -->
             <div class="flex-1 flex flex-col bg-slate-50/50 border-l border-slate-200">
                <div class="p-6 flex-1 overflow-y-auto">
                   <h3 class="text-sm font-bold uppercase tracking-wider text-muted mb-4">Resumen de Venta</h3>
                   
                   <div *ngIf="cart.length === 0" class="text-center py-10 opacity-50">
                      <svg class="mx-auto mb-2 text-muted" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                      <p class="text-sm text-muted">El carrito está vacío</p>
                   </div>

                   <div class="space-y-3">
                      <div *ngFor="let item of cart; let i = index" class="flex gap-3 items-start animate-in slide-in-from-right duration-200 p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
                         <div class="flex-1">
                            <div class="text-sm font-semibold text-main">{{ item.product.productName }}</div>
                            <div class="text-xs text-slate-500">{{ item.subtotal | currency:'COP':'symbol-narrow':'1.0-0' }}</div>
                         </div>
                         <div class="flex items-center gap-2 bg-slate-100 rounded px-2 py-1 border border-slate-200">
                            <button (click)="updateQuantity(i, -1)" class="bg-slate-100 hover:bg-slate-200 rounded-md hover:text-primary text-secondary font-bold px-1">-</button>
                            <input type="number" [ngModel]="item.quantity" (ngModelChange)="setQuantity(i, $event)" 
                                   class="w-12 text-center bg-transparent border-none focus:outline-none text-main font-medium text-sm p-0 appearance-none" 
                                   min="1" [max]="item.product.stock">
                            <button (click)="updateQuantity(i, 1)" class="bg-slate-100 hover:bg-slate-200 rounded-md hover:text-primary text-secondary font-bold px-1">+</button>
                         </div>
                         <button (click)="removeFromCart(i)" class="text-muted hover:text-danger p-1">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                         </button>
                      </div>
                   </div>
                </div>

                <!-- Payment Method and Footer -->
                <div class="p-6 border-t border-slate-200 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                   
                    <div class="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label class="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Forma de Pago</label>
                             <select [(ngModel)]="condicionPago" (change)="onCondicionPagoChange()" class="input-premium w-full">
                                 <option value="CONTADO">Contado</option>
                                 <option value="CREDITO">Cr&#233;dito</option>
                             </select>
                        </div>
                        <div *ngIf="condicionPago === 'CONTADO'">
                             <label class="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Medio de Pago</label>
                             <select [(ngModel)]="paymentMethod" class="input-premium w-full">
                                 <option value="EFECTIVO">Efectivo</option>
                                 <option value="TRANSFERENCIA">Transferencia</option>
                             </select>
                         </div>
                    </div>

                    <div *ngIf="condicionPago === 'CREDITO'" class="mb-4">
                        <label class="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Plazo de Crédito (Días)</label>
                        <select [(ngModel)]="diasCredito" class="input-premium w-full">
                            <option [ngValue]="15">15 días</option>
                            <option [ngValue]="30">30 días</option>
                        </select>
                    </div>

                     <div class="mb-4">
                         <label class="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Tipo de Documento</label>
                         <select [(ngModel)]="tipoDocumento" class="input-premium w-full">
                             <option [ngValue]="1">1 - Facturación electrónica</option>
                             <option [ngValue]="2">2 - Orden de venta</option>
                         </select>
                     </div>

                     <div class="mb-4">
                          <label class="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Descuento</label>
                          <select [(ngModel)]="descuentoPorcentaje" class="input-premium w-full">
                              <option [value]="0">Sin descuento (0%)</option>
                              <option [value]="3">3%</option>
                              <option [value]="5">5%</option>
                              <option [value]="10">10%</option>

                          </select>
                      </div>

                   <div *ngIf="descuentoPorcentaje > 0" class="flex justify-between items-center mb-1 text-sm">
                      <span class="text-muted">Subtotal</span>
                      <span class="text-muted">{{ subtotalCarrito | currency:'COP':'symbol-narrow':'1.0-0' }}</span>
                   </div>
                   <div *ngIf="descuentoPorcentaje > 0" class="flex justify-between items-center mb-2 text-sm text-red-500 font-medium">
                      <span>Descuento ({{ descuentoPorcentaje }}%)</span>
                      <span>- {{ descuentoCalculado | currency:'COP':'symbol-narrow':'1.0-0' }}</span>
                   </div>
                   <div class="flex justify-between items-center mb-4">
                      <span class="text-muted font-medium">Total a Pagar</span>
                       <span class="text-xl font-bold text-indigo-600">{{ totalConDescuento | currency:'COP':'symbol-narrow':'1.0-0' }}</span>
                   </div>
                   <div class="flex gap-3 mt-4">
                       <button (click)="closeModal()" type="button" class="w-1/3 py-3 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors font-medium text-sm flex justify-center items-center">
                          Cancelar
                       </button>
                       <button (click)="submitSale()" 
                               [disabled]="cart.length === 0 || !selectedClientId || processing || !selectedBodegaId"
                               class="btn btn-primary flex-1 py-3 flex justify-center items-center gap-2 shadow-lg shadow-indigo-500/30">
                          <span *ngIf="processing" class="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"></span>
                          {{ processing ? 'Procesando...' : (manejaInventario ? 'Confirmar Venta' : 'Confirmar Orden Especial') }}
                       </button>
                   </div>
                </div>
             </div>
          </div>

       </div>
    </div>
  `,
   styles: [`
    .btn-icon { @apply p-2 rounded-lg hover:bg-slate-100 transition-colors text-muted hover:text-main; }
    .input-premium { @apply bg-slate-100 border border-slate-200 rounded-lg px-4 py-2 text-main focus:bg-white focus:border-primary focus:outline-none transition-all focus:ring-2 focus:ring-indigo-100; }
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
export class SalesCaptureComponent implements OnInit {
   @Output() onClose = new EventEmitter<void>();
   @Output() saleCompleted = new EventEmitter<void>();

   clients$: Observable<Client[]> = new BehaviorSubject<Client[]>([]).asObservable();
   inventory$: Observable<InventoryItem[]>;
   filteredInventory$: Observable<InventoryItem[]>;

   searchTerm = '';
   private searchTermSubject = new BehaviorSubject<string>('');

   selectedClientId: string | null = null;
   cart: CartItem[] = [];
   total = 0;
   processing = false;
   condicionPago: 'CONTADO' | 'CREDITO' = 'CONTADO';
   diasCredito = 15;
   tipoDocumento: number = 2;
   descuentoPorcentaje: number = 0;

   bodegas: any[] = [];
   selectedBodegaId: string | null = null;
   selectedBodega: any = null;
   isAdmin = false;
   mostrarSelectorBodega = false;

   /** True when the active warehouse tracks physical inventory */
   get manejaInventario(): boolean {
      return this.selectedBodega?.maneja_inventario !== false;
   }

   constructor(
      private clientsService: ClientsService,
      private inventoryService: InventoryService,
      private salesService: SalesService,
      private router: Router
   ) {
      this.inventory$ = new BehaviorSubject<InventoryItem[]>([]).asObservable();
      this.filteredInventory$ = new BehaviorSubject<InventoryItem[]>([]).asObservable();
   }

   closeModal() {
      this.onClose.emit();
   }

   async ngOnInit() {
      try {
         this.loadClientsDirectly();

         const supabase = this.salesService['supabase'];
         const { data: { user } } = await supabase.auth.getUser();
         const userId = user?.id;

         if (userId) {
            // 2. Load User Profile
            const { data: profile } = await supabase
               .from('usuarios')
               .select('rol, bodega_asignada_id, distribuidor_id')
               .eq('id', userId)
               .single();

            this.isAdmin = profile?.rol === 'admin_distribuidor';
            const principalBodegaId = profile?.bodega_asignada_id;
            const distribuidorId = profile?.distribuidor_id;

            // 3. Load Authorized Warehouses (Two-step approach)
            const { data: ubData } = await supabase
               .from('usuarios_bodegas')
               .select('bodega_id')
               .eq('usuario_id', userId);

            const bodegaIds = (ubData || []).map(b => b.bodega_id);

            const { data: bodegasData } = await supabase
               .from('bodegas')
               .select('id, nombre, maneja_inventario, distribuidor_id')
               .in('id', bodegaIds);

            this.bodegas = bodegasData || [];

            // 4. Fallback for users without specific assignments (Same view as admin if requested)
            if (this.bodegas.length === 0 && distribuidorId) {
               const { data: allBods } = await supabase
                  .from('bodegas')
                  .select('*')
                  .eq('distribuidor_id', distribuidorId);
               this.bodegas = allBods || [];
            }

            // 5. Determine Default Warehouse properly
            if (this.bodegas.length === 1) {
               this.selectedBodegaId = this.bodegas[0].id;
               this.selectedBodega = this.bodegas[0];
            } else if (this.bodegas.length > 1) {
               // Try to use the primary warehouse as default
               const principal = this.bodegas.find(b => b.id === principalBodegaId);
               if (principal) {
                  this.selectedBodegaId = principal.id;
                  this.selectedBodega = principal;
               } else {
                  this.selectedBodegaId = this.bodegas[0].id;
                  this.selectedBodega = this.bodegas[0];
               }
            }
         }

         // 6. Control Selector Visibility
         this.mostrarSelectorBodega = this.bodegas.length > 1;

         // 7. Load Inventory if selection exists
         if (this.selectedBodegaId) {
            await this.loadInventory();
         }
      } catch (err) {
         console.error('[SalesCapture] Fatal error in ngOnInit:', err);
      }
   }

   async loadClientsDirectly() {
      try {
         const data = await this.clientsService.getClientsList();
         this.clients$ = new BehaviorSubject<any[]>(data).asObservable();
      } catch (error) {
         console.error('Error loading clients list', error);
         this.clients$ = new BehaviorSubject<any[]>([]).asObservable();
      }
   }

   async onBodegaChange() {
      this.cart = []; // Clear cart because stock levels and items vary by bodega
      this.calculateTotal();
      // Update the full bodega object to track maneja_inventario
      this.selectedBodega = this.bodegas.find(b => b.id === this.selectedBodegaId) || null;
      await this.loadInventory();
   }

   async loadInventory() {
      if (!this.manejaInventario) {
         // Bodega does NOT manage inventory → load all products directly
         const supabase = this.salesService['supabase'];
         const { data, error } = await supabase
            .from('productos')
            .select('id, nombre, sku, precio_base, imagen_url, categoria')
            .order('nombre');

         if (error) {
            console.error('Error loading products for non-inventory bodega', error);
         }

         const items: InventoryItem[] = (data || []).map((p: any) => ({
            id: p.id,
            productId: p.id,
            productName: p.nombre,
            sku: p.sku || '',
            bodegaId: this.selectedBodegaId || '',
            bodegaName: this.selectedBodega?.nombre || '',
            stock: 0, // No tracking — shown as "Disponible bajo pedido"
            price: p.precio_base,
            imageUrl: p.imagen_url || '',
            category: p.categoria,
            status: 'En Stock' as const
         }));

         // Wrap in Observable & apply search filter
         const { BehaviorSubject } = await import('rxjs');
         const items$ = new BehaviorSubject<InventoryItem[]>(items).asObservable();

         this.filteredInventory$ = (await import('rxjs')).combineLatest([
            items$,
            this.searchTermSubject
         ]).pipe(
            (await import('rxjs/operators')).map(([invItems, term]) => {
               const lowerTerm = term.toLowerCase();
               return invItems.filter(item =>
                  item.productName.toLowerCase().includes(lowerTerm) ||
                  item.sku.toLowerCase().includes(lowerTerm)
               );
            })
         );
      } else {
         // Bodega DOES manage inventory → use existing InventoryService path
         this.inventory$ = await this.inventoryService.getInventory(this.selectedBodegaId || undefined);

         this.filteredInventory$ = combineLatest([
            this.inventory$,
            this.searchTermSubject
         ]).pipe(
            map(([items, term]) => {
               const lowerTerm = term.toLowerCase();
               return items.filter(item =>
                  item.productName.toLowerCase().includes(lowerTerm) ||
                  item.sku.toLowerCase().includes(lowerTerm)
               );
            })
         );
      }
   }

   search(term: string) {
      this.searchTermSubject.next(term);
   }

   addToCart(item: InventoryItem) {
      // Only block on stock=0 when warehouse tracks inventory
      if (this.manejaInventario && item.stock <= 0) return;

      const existingIndex = this.cart.findIndex(c => c.product.productId === item.productId);

      if (existingIndex >= 0) {
         // Enforce stock limit only when bodega maneja inventario
         const atLimit = this.manejaInventario && this.cart[existingIndex].quantity >= item.stock;
         if (!atLimit) {
            this.cart[existingIndex].quantity++;
            this.cart[existingIndex].subtotal = this.cart[existingIndex].quantity * item.price;
         }
      } else {
         this.cart.push({
            product: item,
            quantity: 1,
            subtotal: item.price
         });
      }
      this.calculateTotal();
   }

   updateQuantity(index: number, change: number) {
      const item = this.cart[index];
      const newQty = item.quantity + change;

      // When not managing inventory, only enforce qty > 0
      const validQty = this.manejaInventario
         ? (newQty > 0 && newQty <= item.product.stock)
         : newQty > 0;

      if (validQty) {
         item.quantity = newQty;
         item.subtotal = item.quantity * item.product.price;
      }
      this.calculateTotal();
   }

   setQuantity(index: number, value: number) {
      const item = this.cart[index];
      let newQty = value;

      if (newQty <= 0) newQty = 1;
      // Only cap at stock when bodega maneja inventario
      if (this.manejaInventario && newQty > item.product.stock) newQty = item.product.stock;

      item.quantity = newQty;
      item.subtotal = item.quantity * item.product.price;
      this.calculateTotal();
   }

   removeFromCart(index: number) {
      this.cart.splice(index, 1);
      this.calculateTotal();
   }

   calculateTotal() {
      this.total = this.cart.reduce((sum, item) => sum + item.subtotal, 0);
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

   saleId: string | null = null;
   numeroFactura: number | null = null;
   fechaVencimiento: string | null = null;
   saleSuccess = false;
   paymentMethod: string | null = 'EFECTIVO'; // Default

   onCondicionPagoChange() {
      if (this.condicionPago === 'CREDITO') {
         this.paymentMethod = null;
         this.diasCredito = 15;
      } else {
         this.paymentMethod = 'EFECTIVO';
         this.diasCredito = null as any;
      }
   }

   // ... existing code ...

   async submitSale() {
      if (!this.selectedClientId || this.cart.length === 0 || !this.selectedBodegaId) return;

      if (this.condicionPago === 'CONTADO' && !this.paymentMethod) {
         alert('Debe seleccionar un medio de pago.');
         return;
      }

      if (this.condicionPago === 'CREDITO' && ![15, 30].includes(this.diasCredito)) {
         alert('El plazo de crédito solo puede ser 15 o 30 días.');
         return;
      }

      this.processing = true;
      try {
         // 1. Crear Borrador (Enviando bodega_id explícitamente)
         const ventaId = await this.salesService.createDraft({
            cliente_id: this.selectedClientId,
            metodo_pago: (this.paymentMethod || '').toUpperCase(),
            condicion_pago: this.condicionPago,
            dias_credito: this.condicionPago === 'CREDITO' ? this.diasCredito : null,
            fecha: (() => {
               const d = new Date();
               return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
            })(),
            bodega_id: this.selectedBodegaId,
            tipo_documento: this.tipoDocumento,
            descuento_porcentaje: this.descuentoPorcentaje
         });

         // 2. Insertar Detalle
         const items = this.cart.map(c => ({
            venta_id: ventaId,
            producto_id: c.product.productId,
            cantidad: c.quantity,
            precio_unitario: c.product.price,
            subtotal: c.subtotal
         }));
         await this.salesService.addDetails(items);

         // 3. Confirmar (RPC)
         await this.salesService.confirmSale(ventaId);

         // Redirigir directamente a la orden de venta
         this.processing = false;
         this.saleCompleted.emit();
         this.router.navigate(['/sales', ventaId, 'invoice']);

      } catch (err: any) {
         console.error('Sale failed', err);
         this.processing = false;
         alert('Error al procesar la venta: ' + err.message);
      }
   }

   get selectedClientName(): string {
      if (!this.selectedClientId || !this.clients$) return 'Cliente General';
      // Note: extracting name from observable stream synchronously is tricky without local state.
      // Let's modify to store client list locally or just pass the ID for now if we can't easily get the object.
      // Better approach: capture the object on selection.
      return 'Cliente ID: ' + this.selectedClientId; // Placeholder until we refactor client selection
   }

   onNewSale() {
      this.saleSuccess = false;
      this.saleId = null;
      this.paymentMethod = 'EFECTIVO';
      this.cart = [];
      this.selectedClientId = null;
      this.calculateTotal();
      this.searchTermSubject.next('');
   }

   handleImageError(item: any) {
      item.imageUrl = '';
   }
}
