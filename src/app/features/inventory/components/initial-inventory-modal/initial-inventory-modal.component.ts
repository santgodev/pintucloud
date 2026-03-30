import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../../../shared/shared.module';
import { FormsModule } from '@angular/forms';
import { InventoryService, InventoryItem } from '../../services/inventory.service';

interface InitialStockItem extends InventoryItem {
    initialAmount: number;
    error?: string;
    loading?: boolean;
    success?: boolean;
}

@Component({
    selector: 'app-initial-inventory-modal',
    standalone: true,
    imports: [CommonModule, SharedModule, FormsModule],
    template: `
    <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
        
        <!-- Header -->
        <div class="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
          <div>
            <h2 class="text-xl font-bold text-slate-900">Cargar Inventario Inicial</h2>
            <p class="text-sm text-slate-500">Solo se muestran productos con stock actual en cero.</p>
          </div>
          <button (click)="onClose.emit()" class="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-6">
          <div *ngIf="loading" class="flex flex-col items-center justify-center py-12">
            <div class="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p class="text-slate-500 font-medium">Cargando productos...</p>
          </div>

          <div *ngIf="!loading && items.length === 0" class="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-slate-300"><path d="M21 8H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2z"></path><path d="M16 8V5a4 4 0 0 0-8 0v3"></path></svg>
            </div>
            <p class="text-slate-500 font-medium text-lg">No hay productos con stock cero para cargar.</p>
            <p class="text-slate-400 text-sm mt-1">Todos los productos en esta bodega ya tienen movimientos o saldo inicial.</p>
          </div>

          <div *ngIf="!loading && items.length > 0" class="overflow-hidden border border-slate-200 rounded-xl">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-slate-50 border-b border-slate-200">
                  <th class="p-4 font-semibold text-slate-600 text-sm">Producto</th>
                  <th class="p-4 font-semibold text-slate-600 text-sm">SKU</th>
                  <th class="p-4 font-semibold text-slate-600 text-sm text-center">Stock Actual</th>
                  <th class="p-4 font-semibold text-slate-600 text-sm text-right w-44">Cant. Inicial</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr *ngFor="let item of items" class="hover:bg-slate-50/50 transition-colors" [class.bg-emerald-50]="!!item.success" [class.bg-rose-50]="!!item.error">
                  <td class="p-4">
                    <div class="font-bold text-slate-900">{{item.productName}}</div>
                    <div class="text-xs text-slate-400">{{item.category}}</div>
                  </td>
                  <td class="p-4 text-sm font-mono text-slate-500">{{item.sku}}</td>
                  <td class="p-4 text-center">
                    <span class="px-2 py-1 rounded bg-slate-100 text-[10px] font-bold text-slate-400 uppercase">{{item.stock}}</span>
                  </td>
                  <td class="p-4 text-right">
                    <div class="flex flex-col items-end">
                      <input type="number" [(ngModel)]="item.initialAmount" [disabled]="saving || !!item.success"
                             class="w-32 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-right font-bold text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all disabled:bg-slate-50 disabled:text-slate-400"
                             min="0" placeholder="0">
                      <span *ngIf="item.error" class="text-[10px] text-rose-600 font-medium mt-1 leading-tight">{{item.error}}</span>
                      <span *ngIf="item.success" class="text-[10px] text-emerald-600 font-bold mt-1">✓ Registrado</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Footer -->
        <div class="p-6 border-t border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
          <div class="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-lg border border-amber-100" *ngIf="items.length > 0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            <span class="text-xs font-semibold uppercase tracking-wider">Esta acción no se puede deshacer</span>
          </div>
          
          <div class="flex gap-3 w-full md:w-auto">
            <button (click)="onClose.emit()" [disabled]="saving" class="flex-1 md:flex-none btn btn-outline py-3 px-6">
              Cancelar
            </button>
            <button (click)="confirmSave()" [disabled]="saving || !hasValidAmounts || items.length === 0" class="flex-1 md:flex-none btn btn-primary py-3 px-8 shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
              <span *ngIf="saving" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              {{ saving ? 'Guardando...' : 'Registrar Inventario Inicial' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    input::-webkit-outer-spin-button,
    input::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
  `]
})
export class InitialInventoryModalComponent implements OnInit {
    @Input() bodegaId: string = '';
    @Output() onClose = new EventEmitter<void>();
    @Output() saved = new EventEmitter<void>();

    items: InitialStockItem[] = [];
    loading = true;
    saving = false;

    constructor(private inventoryService: InventoryService) { }

    get hasValidAmounts(): boolean {
        return this.items.some(item => (item.initialAmount || 0) > 0);
    }

    async ngOnInit() {
        this.loadProducts();
    }

    async loadProducts() {
        this.loading = true;
        try {
            // Ensure we have a valid bodegaId that manages inventory
            if (!this.bodegaId) {
                const bodegas = await this.inventoryService.getBodegas();
                const validBodegas = bodegas.filter(b => b.maneja_inventario === true);
                if (validBodegas.length > 0) {
                    this.bodegaId = validBodegas[0].id;
                }
            }

            if (!this.bodegaId) {
                console.error('No valid bodega found for initial inventory loading');
                this.loading = false;
                return;
            }

            const inv$ = await this.inventoryService.getInventory(this.bodegaId);
            inv$.subscribe(allItems => {
                // Solo productos con stock 0
                this.items = allItems
                    .filter(item => item.stock === 0)
                    .map(item => ({
                        ...item,
                        initialAmount: 0
                    }));
                this.loading = false;
            });
        } catch (error) {
            console.error('Error loading zero stock products', error);
            this.loading = false;
        }
    }

    async confirmSave() {
        const count = this.items.filter(i => (i.initialAmount || 0) > 0).length;
        if (count === 0) return;

        if (!confirm(`Esta acción registrará el inventario inicial para ${count} productos y no se podrá repetir. ¿Desea continuar?`)) {
            return;
        }

        this.saveInitialInventory();
    }

    async saveInitialInventory() {
        this.saving = true;
        const validItems = this.items.filter(i => (i.initialAmount || 0) > 0);
        let successCount = 0;
        let errorCount = 0;

        for (const item of validItems) {
            item.loading = true;
            item.error = undefined;

            try {
                await this.inventoryService.registerInitialInventory(
                    item.productId,
                    item.bodegaId,
                    item.initialAmount
                );
                item.success = true;
                successCount++;
            } catch (err: any) {
                if (err.message?.includes('ya fue registrado') || err.message?.includes('initial_already_exists')) {
                    item.error = 'Ya registrado previamente';
                } else {
                    item.error = err.message || 'Error desconocido';
                }
                errorCount++;
            } finally {
                item.loading = false;
            }
        }

        this.saving = false;

        if (successCount > 0) {
            alert(`Se registraron ${successCount} productos con éxito.`);
            this.saved.emit();
            if (errorCount === 0) {
                this.onClose.emit();
            }
        } else if (errorCount > 0) {
            alert('Hubo errores al registrar el inventario inicial. Por favor verifique los mensajes en rojo.');
        }
    }
}
