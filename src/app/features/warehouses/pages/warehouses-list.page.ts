import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WarehousesService, Warehouse } from '../services/warehouses.service';
import { WarehouseCardComponent } from '../components/warehouse-card.component';
import { UiService } from '../../../core/services/ui.service';

@Component({
  selector: 'app-warehouses-list',
  standalone: true,
  imports: [CommonModule, WarehouseCardComponent],
  template: `
    <div class="mb-8 p-4">

      <!-- Page Header -->
      <div class="flex justify-between items-start mb-8 gap-4">
        <div>
          <h1 class="text-3xl font-bold text-slate-900 tracking-tight">Bodegas</h1>
          <p class="text-slate-500 text-lg mt-1">Administración de centros de distribución.</p>
        </div>
        <div class="flex gap-3">
          <button class="btn btn-primary flex items-center gap-2 px-6" disabled>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Crear Bodega
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="flex justify-center p-12">
        <div class="animate-spin w-10 h-10 border-4 border-slate-200 border-t-primary rounded-full"></div>
      </div>

      <!-- Error State -->
      <div *ngIf="errorMessage && !loading"
           class="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-600">
        <svg class="mx-auto mb-2" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <p class="font-medium">{{ errorMessage }}</p>
      </div>

      <!-- Empty State -->
      <div *ngIf="!loading && !errorMessage && warehouses.length === 0"
           class="text-center p-12 bg-white rounded-2xl border border-dashed border-slate-300">
        <svg class="mx-auto mb-4 text-slate-300" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <path d="M21 8l-2-2H5L3 8v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8z"></path>
          <path d="M3 8h18"></path>
        </svg>
        <p class="text-slate-400 font-medium">No se encontraron bodegas en el sistema.</p>
      </div>

      <!-- Warehouse Cards Grid -->
      <div *ngIf="!loading && !errorMessage && warehouses.length > 0"
           class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <app-warehouse-card
          *ngFor="let warehouse of warehouses"
          [warehouse]="warehouse">
        </app-warehouse-card>
      </div>

    </div>
  `,
})
export class WarehousesListPage implements OnInit {

  warehouses: Warehouse[] = [];
  loading = true;
  errorMessage: string | null = null;

  constructor(
    private warehousesService: WarehousesService,
    private uiService: UiService
  ) { }

  ngOnInit(): void {
    this.loadWarehouses();
  }

  loadWarehouses(): void {
    this.loading = true;
    this.uiService.setLoading(true);
    this.errorMessage = null;

    this.warehousesService.getWarehouses().subscribe({
      next: (data) => {
        this.warehouses = data;
        this.loading = false;
        this.uiService.setLoading(false);
      },
      error: (err) => {
        this.errorMessage = `Error al cargar bodegas: ${err.message}`;
        this.loading = false;
        this.uiService.setLoading(false);
      },
    });
  }
}
