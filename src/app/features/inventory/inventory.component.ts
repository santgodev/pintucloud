import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../shared/shared.module';
import { InventoryService, InventoryItem } from './services/inventory.service';
import { Router, ActivatedRoute } from '@angular/router';
import { take } from 'rxjs/operators';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { ProductModalComponent } from './components/product-modal/product-modal.component';
import { AdjustStockModalComponent } from './components/adjust-stock-modal/adjust-stock-modal.component';
import { InitialInventoryModalComponent } from './components/initial-inventory-modal/initial-inventory-modal.component';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { UiService } from '../../core/services/ui.service';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, SharedModule, ProductModalComponent, AdjustStockModalComponent, InitialInventoryModalComponent, FormsModule],
  templateUrl: './inventory.component.html',
  styles: [`
    .italic-none tr { font-style: normal !important; }
  `]
})
export class InventoryComponent implements OnInit {
  private inventoryService = inject(InventoryService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private uiService = inject(UiService);

  // State Signals
  allInventory = signal<InventoryItem[]>([]);
  bodegas = signal<any[]>([]);
  categorias = signal<string[]>([]);
  showLowStockOnly = signal(false);
  showProductModal = signal(false);
  showAdjustModal = signal(false);
  showInitialModal = signal(false);

  // Selection/Filter Signals
  selectedProduct = signal<InventoryItem | null>(null);
  selectedAdjustItem = signal<InventoryItem | null>(null);
  selectedBodega = signal<string>('');
  selectedCategory = signal<string>('');
  selectedStatus = signal<string>('');
  searchTerm = signal<string>('');

  // Computed signals
  isAdmin = this.authService.isAdmin;
  
  lowStockCount = computed(() => 
    this.allInventory().filter(item => item.stock <= (item.stockMinimo || 0)).length
  );

  totalInventoryValue = computed(() => 
    this.allInventory().reduce((acc, item) => acc + (item.inventoryValue || 0), 0)
  );

  filteredItems = computed(() => {
    let filtered = [...this.allInventory()];

    if (this.selectedCategory()) {
      filtered = filtered.filter(item => item.category === this.selectedCategory());
    }

    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      filtered = filtered.filter(item =>
        item.productName?.toLowerCase().includes(term) ||
        item.sku?.toLowerCase().includes(term) ||
        item.category?.toLowerCase().includes(term)
      );
    }

    if (this.showLowStockOnly()) {
      filtered = filtered.filter(item => item.stock <= (item.stockMinimo ?? 0));
    }

    if (this.selectedStatus()) {
      filtered = filtered.filter(item => item.status === this.selectedStatus());
    }

    // Sort: primary by commercial order, secondary by bodega name
    return filtered.sort((a, b) => {
      const orderA = (a as any).order ?? 9999;
      const orderB = (b as any).order ?? 9999;
      if (orderA !== orderB) return orderA - orderB;
      return (a.bodegaName || '').localeCompare(b.bodegaName || '');
    });
  });

  async ngOnInit() {
    this.uiService.setLoading(true);

    // Initial load dependencies
    await Promise.all([
      this.loadBodegas(),
      this.loadCategorias()
    ]);

    // Handle initial query params
    this.route.queryParams.subscribe(params => {
      if (params['lowStock']) {
        this.showLowStockOnly.set(true);
      }
    });

    await this.loadInventory();
  }

  async loadBodegas() {
    const allBodegas = await this.inventoryService.getBodegas();
    const managedBodegas = allBodegas.filter(b => b.maneja_inventario === true);
    this.bodegas.set(managedBodegas);
    
    // Auto-select if unique
    if (managedBodegas.length === 1 && !this.selectedBodega()) {
      this.selectedBodega.set(managedBodegas[0].id);
    }
  }

  async loadCategorias() {
    const cats = await this.inventoryService.getCategories();
    this.categorias.set(cats);
  }

  async loadInventory() {
    this.uiService.setLoading(true);
    const inv$ = await this.inventoryService.getInventory(
      this.selectedBodega() || undefined,
      this.showLowStockOnly()
    );

    inv$.pipe(take(1)).subscribe(items => {
      const resolved = items.map(item => {
        let currentName = (item.bodegaName || '').toLowerCase();
        if (!currentName || currentName.includes('inventario') || currentName === 'carga inicial') {
          const b = this.bodegas().find(w => w.id === item.bodegaId);
          if (b) currentName = b.nombre.toLowerCase();
          else if (!item.bodegaId && this.bodegas().length > 0) {
            currentName = this.bodegas()[0].nombre.toLowerCase();
            item.bodegaId = this.bodegas()[0].id;
          }
        }
        item.bodegaName = currentName;
        return item;
      });

      this.allInventory.set(resolved);
      this.uiService.setLoading(false);
    });
  }

  refreshInventory() {
    this.loadInventory();
  }

  onBodegaChange(id: string) {
    this.selectedBodega.set(id);
    this.refreshInventory();
  }

  showLowStock() {
    this.showLowStockOnly.set(true);
  }

  clearLowStockFilter() {
    this.showLowStockOnly.set(false);
  }

  openModal() {
    this.selectedProduct.set(null);
    this.showProductModal.set(true);
  }

  adjustStock(item: InventoryItem) {
    this.selectedAdjustItem.set(item);
    this.showAdjustModal.set(true);
  }

  closeAdjustModal() {
    this.showAdjustModal.set(false);
    this.selectedAdjustItem.set(null);
  }

  async onConfirmAdjust(payload: { cantidad: number, observacion: string }) {
    const item = this.selectedAdjustItem();
    if (!item) return;

    try {
      const bId = item.bodegaId || this.bodegas().find(b => b.nombre === item.bodegaName)?.id;
      await this.inventoryService.adjustInventory(item.productId, bId, payload.cantidad, payload.observacion);
      this.refreshInventory();
      this.closeAdjustModal();
    } catch (err: any) {
      console.error(err);
      alert('Error ajustando inventario: ' + (err.message || err));
    }
  }

  editProduct(item: InventoryItem) {
    this.selectedProduct.set(item);
    this.showProductModal.set(true);
  }

  closeModal() {
    this.showProductModal.set(false);
    this.selectedProduct.set(null);
  }

  handleImageError(item: InventoryItem) {
    item.imageUrl = '';
  }

  exportInventory() {
    const items = this.filteredItems();
    const exportData = items.map(item => ({
      Producto: item.productName,
      SKU: item.sku,
      Categoría: item.category || 'General',
      Bodega: item.bodegaName,
      Stock: item.stock,
      'Stock mínimo': item.stockMinimo || 0,
      Estado: item.status
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario');

    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data: Blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    saveAs(data, 'inventario.xlsx');
  }
}
