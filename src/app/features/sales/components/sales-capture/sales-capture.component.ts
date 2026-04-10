import { Component, OnInit, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { SharedModule } from '../../../../shared/shared.module';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ClientsService, Client } from '../../../clients/services/clients.service';
import { InventoryService, InventoryItem } from '../../../inventory/services/inventory.service';
import { SalesService } from '../../services/sales.service';
import { Observable, BehaviorSubject, combineLatest, map } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { SupabaseService } from '../../../../core/services/supabase.service';

interface CartItem {
   product: InventoryItem;
   quantity: number;
   price: number;
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
        <div class="flex items-center justify-between px-2 py-3 md:p-6 md:pb-4">
          <button (click)="onClose.emit()" class="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 font-medium transition-colors">
            ← Volver
          </button>
          <h1 class="text-xl md:text-2xl font-bold text-slate-900">
            {{ editSaleId ? 'Editar Orden' : 'Nueva Venta' }}
          </h1>
          <div *ngIf="editSaleId" class="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
            EDITANDO #{{ editSaleData?.numero_factura || 'BORRADOR' }}
          </div>
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
            <div class="space-y-1 relative">
              <label class="block text-xs font-semibold text-slate-600">Cliente *</label>
              
              <!-- Buscador de Cliente Custom -->
              <div class="relative group">
                <input type="text" 
                       [(ngModel)]="clientSearchTerm"
                       (focus)="showClientDropdown = true"
                       (input)="onClientSearch(clientSearchTerm)"
                       placeholder="Buscar por nombre o c&#243;digo..."
                       class="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700 font-medium placeholder:text-slate-400">
                
                <!-- Iconos -->
                <div class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <button *ngIf="clientSearchTerm" (click)="clearClientSelection()" class="text-slate-300 hover:text-slate-500 transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                  <svg class="text-slate-300" [class.text-indigo-500]="showClientDropdown" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </div>
              </div>

              <!-- Dropdown de Resultados -->
              <div *ngIf="showClientDropdown" 
                   class="absolute z-[100] w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div class="max-h-[240px] overflow-y-auto custom-scrollbar">
                  <!-- Opción no encontrado -->
                  <div *ngIf="(filteredClients$ | async)?.length === 0" class="p-4 text-center text-slate-400 italic text-xs">
                    No se encontraron clientes
                  </div>
                  
                  <!-- Lista de Clientes -->
                  <div *ngFor="let client of filteredClients$ | async" 
                       (click)="selectClient(client)"
                       class="px-4 py-2.5 hover:bg-indigo-50 cursor-pointer transition-colors border-b border-slate-50 last:border-0 group select-none">
                    <div class="flex flex-col">
                      <span class="text-[10px] font-bold text-indigo-500 uppercase tracking-tight">{{ client.codigo }}</span>
                      <span class="text-sm font-semibold text-slate-700 group-hover:text-indigo-700">{{ client.razon_social }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Overlay invisible para cerrar el dropdown al hacer clic fuera -->
              <div *ngIf="showClientDropdown" 
                   (click)="showClientDropdown = false"
                   class="fixed inset-0 z-[90] bg-transparent">
              </div>
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
          </div>

          <!-- RESUMEN DE COMPRA (TABLA) -->
          <div class="w-full flex flex-col gap-4 border-t border-slate-100 pt-8 mt-2">
            <div class="bg-indigo-50/30 rounded-xl border border-indigo-50 p-4 flex flex-col">
              <h3 class="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3">RESUMEN DE VENTA</h3>
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
                           <div class="flex flex-col items-center gap-1">
                             <div class="flex items-center justify-center gap-1">
                               <button (click)="updateQuantity(i, -1)" class="w-7 h-7 flex items-center justify-center rounded-md bg-slate-100 hover:bg-slate-200 transition-colors text-slate-600 font-bold flex-shrink-0">-</button>
                               <input
                                 type="number"
                                 [value]="item.quantity"
                                 min="1"
                                 (change)="onCantidadInput(i, $event)"
                                 [class.border-red-400]="manejaInventario && item.quantity > item.product.stock"
                                 [class.bg-red-50]="manejaInventario && item.quantity > item.product.stock"
                                 class="w-14 text-center text-sm font-semibold text-slate-700 border border-slate-200 rounded-md py-1 focus:outline-none focus:ring-2 focus:ring-indigo-300 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                               />
                               <button (click)="updateQuantity(i, 1)" class="w-7 h-7 flex items-center justify-center rounded-md bg-slate-100 hover:bg-slate-200 transition-colors text-slate-600 font-bold flex-shrink-0">+</button>
                             </div>
                             <div *ngIf="manejaInventario && item.quantity > item.product.stock"
                                  class="text-[10px] font-semibold text-red-600 whitespace-nowrap">
                               Stock: {{ item.product.stock }}
                             </div>
                           </div>
                         </td>
                        <td class="p-3 text-right">
                          <div class="inline-flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all w-36 group">
                            <span class="text-slate-400 font-bold text-sm mr-1.5 opacity-60 group-focus-within:opacity-100 group-focus-within:text-indigo-500 transition-all">$</span>
                            <input
                              type="text"
                              [value]="formatCurrency(item.price)"
                              (input)="onPrecioInput(i, $event)"
                              class="w-full bg-transparent text-right text-sm font-bold text-slate-700 focus:outline-none p-0"
                            />
                          </div>
                        </td>
                        <td class="p-3 text-right font-bold text-indigo-600 whitespace-nowrap text-base">
                          $ {{ (item.quantity * item.price) | number:'1.0-0' }}
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

              <!-- Configuración de Pago -->
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
                      <option [ngValue]="8">8 Días</option>
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
                {{ processing ? 'Procesando...' : (editSaleId ? 'Guardar Cambios' : 'Confirmar Venta') }}
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
   clientSearchTerm = '';
   showClientDropdown = false;
   private allClients: Client[] = [];
   private clientSearchSubject = new BehaviorSubject<string>('');
   filteredClients$: Observable<Client[]> = new BehaviorSubject<Client[]>([]).asObservable();

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

   mostrarSelectorBodega = false;
   editSaleId: string | null = null;
   editSaleData: any = null;

   private authService = inject(AuthService);
   private clientsService = inject(ClientsService);
   private inventoryService = inject(InventoryService);
   private salesService = inject(SalesService);
   private supabase = inject(SupabaseService);
   private location = inject(Location);
   private router = inject(Router);
   private route = inject(ActivatedRoute);

   isAdmin = this.authService.isAdmin;

   get manejaInventario(): boolean {
      return this.selectedBodega?.maneja_inventario !== false;
   }

   constructor() {
      this.inventory$ = new BehaviorSubject<InventoryItem[]>([]).asObservable();
      this.filteredInventory$ = new BehaviorSubject<InventoryItem[]>([]).asObservable();
      
      this.filteredClients$ = combineLatest([
         new BehaviorSubject<Client[]>([]).asObservable(), 
         this.clientSearchSubject
      ]).pipe(
         map(([clients, term]) => {
            if (!term) return clients.slice(0, 50); // Mostrar primeros 50 si no hay búsqueda
            const lowerTerm = term.toLowerCase();
            return clients.filter(c => 
               (c.codigo || '').toLowerCase().includes(lowerTerm) || 
               (c.razon_social || '').toLowerCase().includes(lowerTerm)
            );
         })
      );
   }

   closePage() {
      this.onClose.emit();
      // Si estamos en una ruta dedicada, volver atrás o ir a sales
      if (this.router.url.includes('/sales/new') || this.router.url.includes('/edit')) {
         this.router.navigate(['/sales']);
      }
   }

   async ngOnInit() {
      try {
         this.loadClientsDirectly();
         
         let profile = this.authService.currentUserValue as any;
         if (!profile) {
            profile = this.authService.currentUserSignal() as any;
         }

         if (profile) {
            const userId = profile.id;
            const principalBodegaId = profile.bodega_asignada_id;
            const distribuidorId = profile.distribuidor_id || (profile as any).companyId;

            const { data: ubData } = await this.supabase
               .from('usuarios_bodegas')
               .select('bodega_id')
               .eq('usuario_id', userId);

            const bodegaIds = (ubData || []).map(b => b.bodega_id);

            const { data: bodegasData } = await this.supabase
               .from('bodegas')
               .select('id, nombre, maneja_inventario, distribuidor_id')
               .in('id', bodegaIds);

            this.bodegas = bodegasData || [];

            if (this.bodegas.length === 0 && distribuidorId) {
               this.bodegas = await this.inventoryService.getBodegasByDistribuidor(distribuidorId);
            }

            // Detectar modo edición antes de aplicar selección por defecto
            const idParam = this.route.snapshot.paramMap.get('id');
            if (idParam) {
               this.editSaleId = idParam;
               await this.loadSaleForEdit(idParam);
            }

            // Selección por defecto solo si NO estamos editando o no se cargó bodega
            if (!this.selectedBodegaId) {
               if (this.bodegas.length === 1) {
                  this.selectedBodegaId = this.bodegas[0].id;
               } else if (this.bodegas.length > 1) {
                  const principal = this.bodegas.find(b => b.id === principalBodegaId);
                  if (principal) {
                     this.selectedBodegaId = principal.id;
                  } else {
                     this.selectedBodegaId = this.bodegas[0].id;
                  }
               }
            }

            // Sincronizar objeto de bodega seleccionada
            if (this.selectedBodegaId) {
               this.selectedBodega = this.bodegas.find(b => b.id === this.selectedBodegaId) || null;
            }
         }

         this.mostrarSelectorBodega = this.bodegas.length > 1;
         if (this.selectedBodegaId) {
            await this.loadInventory();
         }

         if (this.editSaleData && this.editSaleData.detalle_ventas) {
            this.mapDetailsToCart(this.editSaleData.detalle_ventas);
         }
      } catch (err) {
         console.error('[SalesCapture] Fatal error:', err);
      }
   }

   async loadClientsDirectly() {
      try {
         const data = await this.clientsService.getClientsList();
         this.allClients = data;
         
         // Re-inicializar filteredClients$ con la data real
         this.filteredClients$ = this.clientSearchSubject.pipe(
            map(term => {
               if (!term) return this.allClients.slice(0, 50);
               const lowerTerm = term.toLowerCase();
               return this.allClients.filter(c => 
                  (c.codigo || '').toLowerCase().includes(lowerTerm) || 
                  (c.razon_social || '').toLowerCase().includes(lowerTerm)
               );
            })
         );

         // Si estamos editando, cargar el nombre del cliente en el buscador
         if (this.selectedClientId) {
            const client = this.allClients.find(c => c.id === this.selectedClientId);
            if (client) this.clientSearchTerm = client.razon_social;
         }

      } catch (error) {
         console.error('Error loading clients list', error);
      }
   }

   async loadSaleForEdit(id: string) {
      try {
         const sale = await this.salesService.getById(id);
         this.editSaleData = sale;
         this.selectedClientId = sale.cliente_id;
         
         // Buscar nombre del cliente para el buscador
         if (this.allClients.length > 0) {
            const client = this.allClients.find(c => c.id === sale.cliente_id);
            if (client) this.clientSearchTerm = client.razon_social;
         }

         this.selectedBodegaId = sale.bodega_id;
         this.condicionPago = sale.condicion_pago;
         this.diasCredito = sale.dias_credito;
         this.paymentMethod = sale.metodo_pago;
         this.tipoDocumento = sale.tipo_documento;
         this.descuentoPorcentaje = sale.descuento_porcentaje;
         this.observaciones = sale.observaciones || '';
      } catch (err) {
         console.error('[SalesCapture] Error loading sale for edit:', err);
      }
   }

   private mapDetailsToCart(details: any[]) {
      this.cart = details.map(d => ({
         product: {
            productId: d.producto_id,
            productName: d.productos?.nombre || d.producto_id,
            sku: d.productos?.sku || '',
            price: d.precio_unitario,
            stock: 999 
         } as any,
         quantity: d.cantidad,
         price: d.precio_unitario,
         subtotal: d.subtotal
      }));
      this.calculateTotal();
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
            .eq('activo', true)
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
            map(([invItems, term]: [InventoryItem[], string]) => {
               const lowerTerm = (term || '').toLowerCase();
               return invItems.filter((item: InventoryItem) =>
                  item.productName.toLowerCase().includes(lowerTerm) ||
                  item.sku.toLowerCase().includes(lowerTerm)
               ).sort((a: any, b: any) => (a.order ?? 9999) - (b.order ?? 9999));
            })
         );
      } else {
         this.inventory$ = await this.inventoryService.getInventory(this.selectedBodegaId || undefined);
          this.filteredInventory$ = combineLatest([this.inventory$, this.searchTermSubject]).pipe(
            map(([items, term]: [InventoryItem[], string]) => {
               const lowerTerm = (term || '').toLowerCase();
               return items.filter((item: InventoryItem) =>
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

   // Métodos del Buscador de Clientes
   onClientSearch(term: string) {
      this.clientSearchSubject.next(term || '');
      this.showClientDropdown = true;
   }

   selectClient(client: Client) {
      this.selectedClientId = client.id;
      this.clientSearchTerm = client.razon_social;
      this.showClientDropdown = false;
   }

   clearClientSelection() {
      this.selectedClientId = null;
      this.clientSearchTerm = '';
      this.clientSearchSubject.next('');
      this.showClientDropdown = false;
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
            price: item.price,
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
         item.subtotal = item.quantity * item.price;
      }
      this.calculateTotal();
   }

   setQuantity(index: number, value: number) {
      const item = this.cart[index];
      let newQty = value;
      if (!newQty || newQty <= 0) newQty = 1;
      if (this.manejaInventario && newQty > item.product.stock) newQty = item.product.stock;
      item.quantity = newQty;
      item.subtotal = item.quantity * item.price;
      this.calculateTotal();
   }

   removeFromCart(index: number) {
      this.cart.splice(index, 1);
      this.calculateTotal();
   }

   calculateTotal() {
      this.total = this.cart.reduce((sum, item) => sum + (item.quantity * item.price), 0);
   }

   onCantidadInput(index: number, event: Event) {
      const input = event.target as HTMLInputElement;
      let valor = parseInt(input.value, 10);

      if (isNaN(valor) || valor <= 0) {
         input.value = String(this.cart[index].quantity); 
         return;
      }

      const item = this.cart[index];
      item.quantity = valor;
      item.subtotal = item.quantity * item.price;
      this.calculateTotal();
   }

   formatCurrency(value: number): string {
      if (value === null || value === undefined) return '0';
      return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
   }

   onPrecioInput(index: number, event: any) {
      const input = event.target as HTMLInputElement;
      // Eliminar todo lo que no sea número
      let rawValue = input.value.replace(/\D/g, '');
      const numericValue = parseInt(rawValue, 10) || 0;
      
      // Actualizar el modelo
      this.cart[index].price = numericValue;
      this.cart[index].subtotal = this.cart[index].quantity * numericValue;
      
      // Formatear el valor visual en el input
      input.value = this.formatCurrency(numericValue);
      
      this.calculateTotal();
   }

   get subtotalCarrito(): number {
      return this.cart.reduce((sum, item) => sum + (item.quantity * item.price), 0);
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
         let ventaId: string;

         const finalMetodoPago = this.condicionPago === 'CREDITO' ? null : (this.paymentMethod || 'EFECTIVO').toUpperCase();

         if (this.editSaleId) {
            ventaId = this.editSaleId;
            await this.salesService.updateSaleHeader(ventaId, {
               cliente_id: this.selectedClientId,
               metodo_pago: finalMetodoPago,
               condicion_pago: this.condicionPago,
               dias_credito: this.condicionPago === 'CREDITO' ? this.diasCredito : null,
               bodega_id: this.selectedBodegaId,
               tipo_documento: this.tipoDocumento,
               descuento_porcentaje: this.descuentoPorcentaje,
               observaciones: this.observaciones || null
            });
            
            await this.salesService.deleteDetails(ventaId);
         } else {
            ventaId = await this.salesService.createDraft({
               cliente_id: this.selectedClientId,
               metodo_pago: finalMetodoPago!,
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
         }

         const items = this.cart.map(c => ({
            venta_id: ventaId,
            producto_id: c.product.productId,
            cantidad: c.quantity,
            precio_unitario: c.price,
            subtotal: c.quantity * c.price
         }));
         await this.salesService.addDetails(items);
         await this.salesService.confirmSale(ventaId);
         
         this.processing = false;
         this.saleCompleted.emit();
         this.router.navigate(['/sales', ventaId, 'invoice']);
      } catch (err: any) {
         console.error('Sale action failed', err);
         this.processing = false;
         alert('Error al procesar la venta: ' + err.message);
      }
   }

   handleImageError(item: any) {
      item.imageUrl = '';
   }
}
