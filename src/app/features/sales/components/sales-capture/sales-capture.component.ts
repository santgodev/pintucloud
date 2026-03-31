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
    <div class="p-4 md:p-6 w-full max-w-7xl mx-auto flex flex-col">
      <div class="max-w-5xl w-full flex flex-col animate-in zoom-in-95 duration-300">
        
        <!-- Header -->
        <!-- Header Simplificado -->
        <div class="flex items-center justify-between px-2 py-3 md:p-6 md:pb-4">
          <button (click)="onClose.emit()" class="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 font-medium transition-colors">
            ← Volver
          </button>
          <h1 class="text-xl md:text-2xl font-bold text-slate-900">
            Nueva Venta
          </h1>
        </div>

        <div class="bg-white rounded-2xl shadow-md border border-slate-100 p-4 md:p-8 mt-2 flex flex-col gap-6 md:gap-8">
          
          <!-- DATOS DE LA VENTA -->
          <div class="w-full flex flex-col gap-4">
            <h3 class="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Datos de la venta</h3>
            
            <!-- Bodega -->
            <div class="space-y-1">
              <label class="block text-xs font-semibold text-slate-600">Bodega de Despacho *</label>
              <select [(ngModel)]="selectedBodegaId" (ngModelChange)="onBodegaChange()" 
                      class="w-full bg-indigo-50/50 border border-indigo-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700 font-medium">
                  <option [ngValue]="null" disabled>Seleccione bodega...</option>
                  <option *ngFor="let b of bodegas" [value]="b.id">{{ b.nombre }}</option>
              </select>
              <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider px-1">SELECCIONE BODEGA PARA CARGAR EXISTENCIAS</p>
            </div>

            <!-- Cliente -->
            <div class="space-y-1">
              <label class="block text-xs font-semibold text-slate-600">Cliente</label>
              <select [(ngModel)]="selectedClientId" 
                      class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-600">
                  <option [ngValue]="null">Seleccionar cliente...</option>
                  <option *ngFor="let client of clients$ | async" [value]="client.id">{{ client.codigo }} — {{ client.razon_social }}</option>
              </select>
            </div>
          </div>

          <!-- SELECCIÓN DE PRODUCTOS -->
          <div class="w-full flex flex-col gap-4 border-t border-slate-100 pt-8">
            <h3 class="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Productos</h3>
            
            <!-- Buscador -->
            <div class="space-y-1">
              <label class="block text-xs font-semibold text-slate-600">Agregar Producto</label>
              <div class="relative">
                <input type="text" placeholder="Buscar producto por nombre o código" 
                       [(ngModel)]="searchTerm" (ngModelChange)="search($event)"
                       class="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                <svg class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              </div>
            </div>

            <!-- Listado Vertical -->
            <div class="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar space-y-2">
              <div *ngIf="!selectedBodegaId" class="h-full flex items-center justify-center text-slate-300 italic text-sm">
                Seleccione una bodega para ver productos
              </div>
              
              <div *ngFor="let item of filteredInventory$ | async" 
                   class="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors group">
                <div class="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 border border-slate-100">
                  <img *ngIf="item.imageUrl" [src]="item.imageUrl" class="w-full h-full object-cover" (error)="handleImageError(item)">
                  <div *ngIf="!item.imageUrl" class="w-full h-full flex items-center justify-center text-slate-300">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"></path><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></svg>
                  </div>
                </div>
                <div class="flex-1 min-w-0">
                  <h4 class="text-xs font-bold text-slate-800 uppercase leading-tight">{{ item.productName }}</h4>
                  <p class="text-[10px] text-slate-400 font-semibold">Stock: {{ item.stock }}</p>
                </div>
                <div class="text-right flex flex-col items-end gap-1 flex-shrink-0">
                  <span class="text-sm font-bold text-indigo-600 whitespace-nowrap">$ {{ item.price | number:'1.0-0' }}</span>
                  <button (click)="addToCart(item)" 
                          class="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-tighter whitespace-nowrap">
                    AÑADIR +
                  </button>
                </div>
              </div>
            </div>
          <!-- RESUMEN DE COMPRA (TABLA) -->
          <div class="w-full flex flex-col gap-4 border-t border-slate-100 pt-8 mt-2">
            <div class="bg-indigo-50/30 rounded-xl border border-indigo-50 p-4 flex flex-col">
              <h3 class="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3">RESUMEN DE VENTA</h3>
                        <!-- Carrito (Tabla Refinada) -->
              <div class="border border-slate-200 rounded-lg overflow-hidden mb-6 bg-white shadow-sm">
                <div class="overflow-x-auto">
                  <table style="min-width: 380px;" class="w-full text-sm border-collapse">
                    <thead class="bg-slate-100 text-slate-700 text-xs uppercase tracking-wide font-semibold">
                      <tr>
                        <th class="p-3 text-left">Producto</th>
                        <th class="p-3 text-center whitespace-nowrap">Cant.</th>
                        <th class="p-3 text-right whitespace-nowrap">Precio</th>
                        <th class="p-3 text-right whitespace-nowrap">Subtotal</th>
                        <th class="p-3 text-center">&#x2715;</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                      <tr *ngFor="let item of cart; let i = index" class="border-b border-slate-100 hover:bg-indigo-50/50 transition-colors">
                        <td class="p-3 font-medium text-slate-800">
                          {{ item.product.productName }}
                        </td>
                        <td class="p-3">
                          <div class="flex items-center justify-center gap-2">
                            <button (click)="updateQuantity(i, -1)" class="w-7 h-7 flex items-center justify-center rounded-md bg-slate-100 hover:bg-slate-200 transition-colors text-slate-600 font-bold">-</button>
                            <span class="px-2 font-medium text-slate-700 min-w-[24px] text-center">{{ item.quantity }}</span>
                            <button (click)="updateQuantity(i, 1)" class="w-7 h-7 flex items-center justify-center rounded-md bg-slate-100 hover:bg-slate-200 transition-colors text-slate-600 font-bold">+</button>
                          </div>
                        </td>
                        <td class="p-3 text-right text-slate-500 whitespace-nowrap">
                          $ {{ item.product.price | number:'1.0-0' }}
                        </td>
                        <td class="p-3 text-right font-semibold text-indigo-600 whitespace-nowrap">
                          $ {{ item.subtotal | number:'1.0-0' }}
                        </td>
                        <td class="p-3 text-center">
                          <button (click)="removeFromCart(i)" 
                                  title="Eliminar producto"
                                  class="w-8 h-8 mx-auto flex items-center justify-center rounded-md bg-red-50 hover:bg-red-100 text-red-600 transition-all border border-red-200">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path></svg>
                          </button>
                        </td>
                      </tr>
                      <tr *ngIf="cart.length === 0">
                        <td colspan="5" class="p-12 text-center text-slate-300 italic bg-slate-50/30">
                          <div class="flex flex-col items-center gap-2">
                            <svg class="opacity-20" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path><path d="M3 6h18"></path><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                            <span>No hay productos añadidos</span>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Configuración de Pago (Separación) -->
              <div class="space-y-4 pt-8 border-t border-slate-100">
                <h3 class="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Configuración de Cobro</h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div class="space-y-1">
                    <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-tight">Forma de Pago</label>
                    <select [(ngModel)]="condicionPago" (change)="onCondicionPagoChange()" 
                            class="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                      <option value="CONTADO">Contado</option>
                      <option value="CREDITO">Cr&#233;dito</option>
                    </select>
                  </div>
                  <div class="space-y-1" *ngIf="condicionPago === 'CONTADO'">
                    <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-tight">Medio de Pago</label>
                    <select [(ngModel)]="paymentMethod" 
                            class="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                      <option value="EFECTIVO">Efectivo</option>
                      <option value="TRANSFERENCIA">Transferencia</option>
                    </select>
                  </div>
                  <div class="space-y-1" *ngIf="condicionPago === 'CREDITO'">
                    <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-tight">Plazo de Pago</label>
                    <select [(ngModel)]="diasCredito" 
                            class="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                      <option [ngValue]="15">15 Días</option>
                      <option [ngValue]="30">30 Días</option>
                    </select>
                  </div>
                </div>

                <div class="space-y-1">
                  <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-tight">Tipo de Documento</label>
                  <select [(ngModel)]="tipoDocumento" 
                          class="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                    <option [ngValue]="1">1 - Factura Electr&#243;nica</option>
                    <option [ngValue]="2">2 - Orden de venta</option>
                  </select>
                </div>

                <div class="space-y-1">
                  <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-tight">Descuento</label>
                  <select [(ngModel)]="descuentoPorcentaje" 
                          class="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                    <option [value]="0">Sin descuento (0%)</option>
                    <option [value]="3">3% de descuento</option>
                    <option [value]="5">5% de descuento</option>
                    <option [value]="10">10% de descuento</option>
                  </select>
                </div>

                <div class="mt-3">
                  <label class="text-xs font-medium text-slate-500">Observaciones</label>
                  <textarea
                    [(ngModel)]="observaciones"
                    rows="3"
                    class="w-full mt-1 p-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="Notas adicionales de la venta...">
                  </textarea>
                </div>

                <div class="bg-slate-50 rounded-lg p-4 mt-6 space-y-2 text-sm border border-slate-200/60 shadow-inner">
                  <div class="flex justify-between text-slate-500 font-medium">
                    <span>Subtotal</span>
                    <span>$ {{ subtotalCarrito | number:'1.0-0' }}</span>
                  </div>

                  <div class="flex justify-between text-red-500 font-bold" *ngIf="descuentoPorcentaje > 0">
                    <span>Descuento ({{ descuentoPorcentaje }}%)</span>
                    <span>- $ {{ descuentoCalculado | number:'1.0-0' }}</span>
                  </div>

                  <div class="flex justify-between items-center font-bold border-t border-slate-200 pt-3 mt-2 text-slate-800">
                    <span class="text-base">Total a Pagar</span>
                    <span class="text-xl font-bold text-slate-900 tabular-nums">$ {{ totalConDescuento | number:'1.0-0' }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Botones -->
            <div class="flex gap-3 mt-auto">
              <button (click)="closePage()" 
                      class="flex-1 py-3 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
                Cancelar
              </button>
              <button (click)="submitSale()" 
                      [disabled]="cart.length === 0 || !selectedClientId || processing || !selectedBodegaId"
                      class="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-bold shadow-lg shadow-indigo-600/20 transition-all">
                {{ processing ? 'Procesando...' : 'Confirmar Venta' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
   `,
   styles: [`
    :host { display: block; z-index: 100; }
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
    
    input[type=number]::-webkit-inner-spin-button, 
    input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
    input[type=number] { -moz-appearance: textfield; }
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
   observaciones: string = '';
   paymentMethod: string | null = 'EFECTIVO';

   bodegas: any[] = [];
   selectedBodegaId: string | null = null;
   selectedBodega: any = null;
   isAdmin = false;
   mostrarSelectorBodega = false;

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

   closePage() {
      this.onClose.emit();
   }

   async ngOnInit() {
      try {
         this.loadClientsDirectly();
         const supabase = this.salesService['supabase'];
         const { data: { user } } = await supabase.auth.getUser();
         const userId = user?.id;

         if (userId) {
            const { data: profile } = await supabase
               .from('usuarios')
               .select('rol, bodega_asignada_id, distribuidor_id')
               .eq('id', userId)
               .single();

            this.isAdmin = profile?.rol === 'admin_distribuidor';
            const principalBodegaId = profile?.bodega_asignada_id;
            const distribuidorId = profile?.distribuidor_id;

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

            if (this.bodegas.length === 0 && distribuidorId) {
               const { data: allBods } = await supabase
                  .from('bodegas')
                  .select('*')
                  .eq('distribuidor_id', distribuidorId);
               this.bodegas = allBods || [];
            }

            if (this.bodegas.length === 1) {
               this.selectedBodegaId = this.bodegas[0].id;
               this.selectedBodega = this.bodegas[0];
            } else if (this.bodegas.length > 1) {
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

         this.mostrarSelectorBodega = this.bodegas.length > 1;
         if (this.selectedBodegaId) {
            await this.loadInventory();
         }
      } catch (err) {
         console.error('[SalesCapture] Fatal error:', err);
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
      this.cart = []; 
      this.calculateTotal();
      this.selectedBodega = this.bodegas.find(b => b.id === this.selectedBodegaId) || null;
      await this.loadInventory();
   }

   async loadInventory() {
      if (!this.manejaInventario) {
         const supabase = this.salesService['supabase'];
         const { data, error } = await supabase
            .from('productos')
            .select('id, nombre, sku, precio_base, imagen_url, categoria, orden')
            .order('orden', { ascending: true });

         const items: InventoryItem[] = (data || []).map((p: any) => ({
            id: p.id,
            productId: p.id,
            productName: p.nombre,
            sku: p.sku || '',
            bodegaId: this.selectedBodegaId || '',
            bodegaName: this.selectedBodega?.nombre || '',
            stock: 0, 
            price: p.precio_base,
            priceSale: p.precio_base || 0,
            pricePurchase: 0,
            inventoryValue: 0,
            imageUrl: p.imagen_url || '',
            category: p.categoria,
            status: 'En Stock' as const
         }));

         const items$ = new BehaviorSubject<InventoryItem[]>(items).asObservable();
         this.filteredInventory$ = combineLatest([items$, this.searchTermSubject]).pipe(
            map(([invItems, term]) => {
               const lowerTerm = term.toLowerCase();
               return invItems.filter(item =>
                  item.productName.toLowerCase().includes(lowerTerm) ||
                  item.sku.toLowerCase().includes(lowerTerm)
               ).sort((a: any, b: any) => (a.order ?? 9999) - (b.order ?? 9999));
            })
         );
      } else {
         this.inventory$ = await this.inventoryService.getInventory(this.selectedBodegaId || undefined);
         this.filteredInventory$ = combineLatest([this.inventory$, this.searchTermSubject]).pipe(
            map(([items, term]) => {
               const lowerTerm = term.toLowerCase();
               return items.filter(item =>
                  item.productName.toLowerCase().includes(lowerTerm) ||
                  item.sku.toLowerCase().includes(lowerTerm)
               ).sort((a: any, b: any) => (a.order ?? 9999) - (b.order ?? 9999));
            })
         );
      }
   }

   search(term: string) {
      this.searchTermSubject.next(term || '');
   }

   addToCart(item: InventoryItem) {
      if (this.manejaInventario && item.stock <= 0) return;
      const existingIndex = this.cart.findIndex(c => c.product.productId === item.productId);
      if (existingIndex >= 0) {
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
      if (!newQty || newQty <= 0) newQty = 1;
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

   onCondicionPagoChange() {
      if (this.condicionPago === 'CREDITO') {
         this.paymentMethod = null;
         this.diasCredito = 15;
      } else {
         this.paymentMethod = 'EFECTIVO';
         this.diasCredito = null as any;
      }
   }


   async submitSale() {
      if (!this.selectedClientId || this.cart.length === 0 || !this.selectedBodegaId) return;
      if (this.condicionPago === 'CONTADO' && !this.paymentMethod) {
         alert('Debe seleccionar un medio de pago.');
         return;
      }
      this.processing = true;
      try {
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
            descuento_porcentaje: this.descuentoPorcentaje,
            observaciones: this.observaciones || null
          });

         const items = this.cart.map(c => ({
            venta_id: ventaId,
            producto_id: c.product.productId,
            cantidad: c.quantity,
            precio_unitario: c.product.price,
            subtotal: c.subtotal
         }));
         await this.salesService.addDetails(items);
         await this.salesService.confirmSale(ventaId);
         this.processing = false;
         this.saleCompleted.emit();
         this.router.navigate(['/sales', ventaId, 'invoice']);
      } catch (err: any) {
         console.error('Sale failed', err);
         this.processing = false;
         alert('Error al procesar la venta: ' + err.message);
      }
   }

   handleImageError(item: any) {
      item.imageUrl = '';
   }
}
