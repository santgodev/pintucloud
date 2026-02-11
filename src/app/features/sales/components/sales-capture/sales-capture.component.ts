import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../../../shared/shared.module';
import { FormsModule } from '@angular/forms';
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
    <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
       <div class="bg-white border border-slate-200 rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
          
          <!-- Header -->
          <div class="p-5 border-b border-slate-200 flex justify-between items-center bg-white">
             <div>
                <h2 class="text-xl font-bold text-main">Nueva Venta</h2>
                <p class="text-sm text-muted">Registrar transacción y descontar inventario</p>
             </div>
             <button (click)="onClose.emit()" class="btn-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
             </button>
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-hidden flex flex-col md:flex-row">
             
             <!-- Left: Selection -->
             <div class="flex-1 p-6 overflow-y-auto border-r border-slate-200 bg-white">
                
                <!-- Client Select -->
                <div class="mb-6">
                   <label class="block text-sm font-medium text-main mb-2">Cliente</label>
                   <select [(ngModel)]="selectedClientId" class="input-premium w-full">
                      <option [ngValue]="null">Seleccionar Cliente...</option>
                      <option *ngFor="let client of clients$ | async" [value]="client.id">
                         {{ client.name }}
                      </option>
                   </select>
                </div>

                <!-- Product Search -->
                <div class="mb-4">
                   <label class="block text-sm font-medium text-main mb-2">Agregar Producto</label>
                   <div class="relative">
                        <input type="text" placeholder="Buscar producto..." 
                               [ngModel]="searchTerm" (ngModelChange)="search($event)"
                               class="input-premium w-full pl-10" />
                        <svg class="absolute left-3 top-1/2 -translate-y-1/2 text-muted" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                   </div>
                </div>

                <!-- Product List -->
                <div class="space-y-2">
                   <div *ngFor="let item of filteredInventory$ | async" 
                        class="p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors flex justify-between items-center cursor-pointer group"
                        (click)="addToCart(item)">
                      <div class="flex items-center gap-3">
                         <div class="w-10 h-10 rounded bg-slate-100 overflow-hidden border border-slate-200 flex items-center justify-center">
                            <img *ngIf="item.imageUrl" [src]="item.imageUrl" (error)="handleImageError(item)" class="w-full h-full object-cover">
                            <svg *ngIf="!item.imageUrl" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-slate-300"><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"></path><line x1="16" y1="5" x2="22" y2="5"></line><line x1="19" y1="2" x2="19" y2="8"></line><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></svg>
                         </div>
                         <div>
                            <div class="font-medium text-sm text-main">{{ item.productName }}</div>
                            <div class="text-xs text-muted">Stock: <span [class.text-warning]="item.stock < 10">{{ item.stock }}</span></div>
                         </div>
                      </div>
                      <div class="text-right">
                         <div class="font-bold text-primary">{{ item.price | currency:'COP':'symbol-narrow':'1.0-0' }}</div>
                         <div class="text-[10px] text-muted uppercase tracking-wider group-hover:text-primary transition-colors">Añadir +</div>
                      </div>
                   </div>
                </div>
             </div>

             <!-- Right: Cart -->
             <div class="w-full md:w-[380px] bg-slate-50 flex flex-col border-l border-slate-200">
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
                            <div class="text-xs text-muted">{{ item.subtotal | currency:'COP':'symbol-narrow':'1.0-0' }}</div>
                         </div>
                         <div class="flex items-center gap-2 bg-slate-100 rounded px-2 py-1 border border-slate-200">
                            <button (click)="updateQuantity(i, -1)" class="hover:text-primary text-secondary font-bold">-</button>
                            <span class="text-sm w-4 text-center text-main font-medium">{{ item.quantity }}</span>
                            <button (click)="updateQuantity(i, 1)" class="hover:text-primary text-secondary font-bold">+</button>
                         </div>
                         <button (click)="removeFromCart(i)" class="text-muted hover:text-danger p-1">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                         </button>
                      </div>
                   </div>
                </div>

                <!-- Footer Totals -->
                <div class="p-6 border-t border-slate-200 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                   <div class="flex justify-between items-center mb-4">
                      <span class="text-muted font-medium">Total a Pagar</span>
                      <span class="text-2xl font-bold text-primary">{{ total | currency:'COP':'symbol-narrow':'1.0-0' }}</span>
                   </div>
                   <button (click)="submitSale()" 
                           [disabled]="cart.length === 0 || !selectedClientId || processing"
                           class="btn btn-primary w-full py-3 flex justify-center items-center gap-2 shadow-lg shadow-indigo-500/30">
                      <span *ngIf="processing" class="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"></span>
                      {{ processing ? 'Procesando...' : 'Confirmar Venta' }}
                   </button>
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
  `]
})
export class SalesCaptureComponent implements OnInit {
   @Output() onClose = new EventEmitter<void>();
   @Output() saleCompleted = new EventEmitter<void>();

   clients$: Observable<Client[]>;
   inventory$: Observable<InventoryItem[]>;
   filteredInventory$: Observable<InventoryItem[]>;

   searchTerm = '';
   private searchTermSubject = new BehaviorSubject<string>('');

   selectedClientId: string | null = null;
   cart: CartItem[] = [];
   total = 0;
   processing = false;

   constructor(
      private clientsService: ClientsService,
      private inventoryService: InventoryService,
      private salesService: SalesService
   ) {
      this.clients$ = this.clientsService.getClients();
      this.inventory$ = new BehaviorSubject<InventoryItem[]>([]).asObservable();
      this.filteredInventory$ = new BehaviorSubject<InventoryItem[]>([]).asObservable();
   }

   async ngOnInit() {
      this.inventory$ = await this.inventoryService.getInventory();

      // Re-setup filtered logic since inventory$ reference changed
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

   search(term: string) {
      this.searchTermSubject.next(term);
   }

   addToCart(item: InventoryItem) {
      if (item.stock <= 0) return; // No stock

      const existingIndex = this.cart.findIndex(c => c.product.productId === item.productId);

      if (existingIndex >= 0) {
         // Check stock limit
         if (this.cart[existingIndex].quantity < item.stock) {
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

      if (newQty > 0 && newQty <= item.product.stock) {
         item.quantity = newQty;
         item.subtotal = item.quantity * item.product.price;
      }
      this.calculateTotal();
   }

   removeFromCart(index: number) {
      this.cart.splice(index, 1);
      this.calculateTotal();
   }

   calculateTotal() {
      this.total = this.cart.reduce((sum, item) => sum + item.subtotal, 0);
   }

   submitSale() {
      if (!this.selectedClientId || this.cart.length === 0) return;

      this.processing = true;
      const items = this.cart.map(c => ({
         producto_id: c.product.productId,
         cantidad: c.quantity,
         precio_unitario: c.product.price
      }));

      this.salesService.createSale(this.selectedClientId, items, this.total).subscribe({
         next: () => {
            this.processing = false;
            this.saleCompleted.emit();
            this.onClose.emit();
            // Optionally show toast success
         },
         error: (err) => {
            console.error('Sale failed', err);
            this.processing = false;
            alert('Error processing sale: ' + err.message);
         }
      });
   }

   handleImageError(item: any) {
      item.imageUrl = '';
   }
}
