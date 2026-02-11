import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../shared/shared.module';
import { InventoryService, InventoryItem } from './services/inventory.service';
import { Observable } from 'rxjs';
import { ProductModalComponent } from './components/product-modal/product-modal.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, SharedModule, ProductModalComponent, FormsModule],
  template: `
    <div class="mb-8 p-4 text-left">
      <div class="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
        <div>
          <h1 class="text-3xl font-bold text-slate-900 tracking-tight text-left">Inventario Global</h1>
          <p class="text-slate-500 text-lg text-left">Supervise el stock, precios y catálogo en tiempo real.</p>
        </div>
        <div class="flex gap-3">
          <button class="btn btn-outline flex items-center gap-2" (click)="notImplemented()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Exportar
          </button>
          <button class="btn btn-primary flex items-center gap-2 px-6 shadow-lg shadow-primary/20" (click)="openModal()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Nuevo Producto
          </button>
        </div>
      </div>

      <!-- Quick Stats / KPIs -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Productos</p>
          <p class="text-2xl font-bold text-slate-900">{{ (inventory$ | async)?.length || 0 }}</p>
        </div>
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Bajo Stock</p>
          <p class="text-2xl font-bold text-slate-900">0</p>
        </div>
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Bodegas Activas</p>
          <p class="text-2xl font-bold text-slate-900">{{ bodegas.length }}</p>
        </div>
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Moneda</p>
          <p class="text-2xl font-bold text-slate-900 uppercase">COP</p>
        </div>
      </div>

      <!-- Filters -->
      <div class="flex flex-col md:flex-row gap-4 mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div class="flex-1 relative">
          <input type="text" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-900" placeholder="Buscar por nombre, SKU o categoría...">
        </div>
        <div class="flex gap-2 flex-wrap md:flex-nowrap">
          <select [(ngModel)]="selectedBodega" (change)="refreshInventory()" class="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm min-w-[150px] text-slate-700 font-medium cursor-pointer">
            <option [value]="''">Todas las Bodegas</option>
            <option *ngFor="let b of bodegas" [value]="b.id">{{ b.nombre }}</option>
          </select>
          <select class="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm min-w-[150px] text-slate-700 font-medium">
            <option>Todas las Categorías</option>
            <option>Rodillos</option>
            <option>Brochas</option>
          </select>
          <select class="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm min-w-[150px] text-slate-700 font-medium">
            <option>Todos los Estados</option>
            <option>En Stock</option>
            <option>Bajo Stock</option>
            <option>Agotado</option>
          </select>
        </div>
      </div>

      <app-card class="p-0 overflow-hidden shadow-xl border-slate-200">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200">
                <th class="p-4 font-semibold text-slate-600 text-sm">Imagen</th>
                <th class="p-4 font-semibold text-slate-600 text-sm">Producto</th>
                <th class="p-4 font-semibold text-slate-600 text-sm">SKU</th>
                <th class="p-4 font-semibold text-slate-600 text-sm">Bodega</th>
                <th class="p-4 font-semibold text-slate-600 text-sm">Precio</th>
                <th class="p-4 font-semibold text-slate-600 text-sm">Stock</th>
                <th class="p-4 font-semibold text-slate-600 text-sm">Estado</th>
                <th class="p-4 font-semibold text-slate-600 text-sm text-right pr-6">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 italic-none">
              <tr *ngFor="let item of inventory$ | async" class="hover:bg-slate-50/50 transition-colors">
                <td class="p-4">
                  <div class="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200 overflow-hidden shadow-sm">
                    <img *ngIf="item.imageUrl" [src]="item.imageUrl" (error)="handleImageError(item)" class="w-full h-full object-cover">
                    <svg *ngIf="!item.imageUrl" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-slate-300"><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"></path><line x1="16" y1="5" x2="22" y2="5"></line><line x1="19" y1="2" x2="19" y2="8"></line><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></svg>
                  </div>
                </td>
                <td class="p-4">
                  <div class="font-bold text-slate-900">{{item.productName}}</div>
                  <div class="text-xs text-slate-400 truncate max-w-[200px]" [title]="item.description || ''">{{item.description}}</div>
                </td>
                <td class="p-4 text-sm text-slate-500 font-mono">{{item.sku}}</td>
                <td class="p-4">
                  <span class="px-2.5 py-1 rounded bg-slate-100 text-[10px] font-bold text-slate-600 uppercase border border-slate-200">{{item.bodegaName}}</span>
                </td>
                <td class="p-4 font-bold text-slate-900">{{item.price | currency:'COP':'symbol-narrow':'1.0-0'}}</td>
                <td class="p-4">
                  <div class="flex items-center gap-3">
                    <div class="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div class="h-full bg-primary rounded-full" [style.width.%]="(item.stock / 1000) * 100"></div>
                    </div>
                    <span class="text-sm font-bold text-slate-700">{{item.stock}}</span>
                  </div>
                </td>
                <td class="p-4 text-xs font-bold">
                  <span class="px-2.5 py-1 rounded-md" 
                    [ngClass]="{
                      'bg-emerald-50 text-emerald-700 border border-emerald-100': item.status === 'In Stock',
                      'bg-amber-50 text-amber-700 border border-amber-100': item.status === 'Low Stock',
                      'bg-rose-50 text-rose-700 border border-rose-100': item.status === 'Out of Stock'
                    }">
                    {{ item.status }}
                  </span>
                </td>
                <td class="p-4 text-right pr-6">
                  <button class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white hover:shadow-md text-slate-400 hover:text-primary transition-all border-none bg-transparent cursor-pointer" (click)="editProduct(item)" title="Editar">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                  </button>
                </td>
              </tr>
              <tr *ngIf="(inventory$ | async)?.length === 0">
                <td colspan="8" class="text-center p-12 text-slate-400 bg-slate-50/20 italic">
                  No se encontraron productos con los filtros seleccionados.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </app-card>
    </div>

    <app-product-modal *ngIf="showProductModal" [product]="selectedProduct" (onClose)="closeModal()" (saved)="refreshInventory()"></app-product-modal>
  `,
  styles: [`
    .italic-none tr { font-style: normal !important; }
  `]
})
export class InventoryComponent implements OnInit {
  inventory$!: Observable<InventoryItem[]>;
  showProductModal = false;
  selectedProduct: InventoryItem | null = null;
  bodegas: any[] = [];
  selectedBodega: string = '';

  constructor(private inventoryService: InventoryService) { }

  async ngOnInit() {
    await this.loadBodegas();
    this.loadInventory();
  }

  async loadBodegas() {
    this.bodegas = await this.inventoryService.getBodegas();
  }

  async loadInventory() {
    this.inventory$ = await this.inventoryService.getInventory(this.selectedBodega || undefined);
  }

  refreshInventory() {
    this.loadInventory();
  }

  openModal() {
    this.selectedProduct = null;
    this.showProductModal = true;
  }

  editProduct(item: InventoryItem) {
    this.selectedProduct = item;
    this.showProductModal = true;
  }

  closeModal() {
    this.showProductModal = false;
    this.selectedProduct = null;
  }

  handleImageError(item: InventoryItem) {
    console.warn('Failing image URL:', item.imageUrl);
    item.imageUrl = '';
  }

  notImplemented() {
    alert('Esta funcionalidad estará disponible en la próxima actualización.');
  }
}
