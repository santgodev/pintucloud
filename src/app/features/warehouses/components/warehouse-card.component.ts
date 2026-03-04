import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Warehouse } from '../services/warehouses.service';
import { WarehouseStatusBadgeComponent } from './warehouse-status-badge.component';

@Component({
    selector: 'app-warehouse-card',
    standalone: true,
    imports: [CommonModule, WarehouseStatusBadgeComponent],
    template: `
    <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 group overflow-hidden relative">

      <!-- Decorative background icon -->
      <div class="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:scale-110 group-hover:opacity-[0.06] transition-all duration-500 pointer-events-none">
        <svg width="140" height="140" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <path d="M21 8l-2-2H5L3 8v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8z"></path>
          <path d="M3 8h18"></path><path d="M10 12h4"></path>
        </svg>
      </div>

      <!-- Header -->
      <div class="flex justify-between items-start mb-5">
        <div class="p-3 bg-slate-50 text-primary rounded-xl border border-slate-100">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 8l-2-2H5L3 8v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8z"></path>
            <path d="M3 8h18"></path><path d="M10 12h4"></path>
          </svg>
        </div>
        <app-warehouse-status-badge [estado]="warehouse.estado ?? 'ACTIVA'" />
      </div>

      <!-- Name & Code -->
      <h3 class="text-lg font-bold text-slate-900 mb-1 truncate">{{ warehouse.nombre }}</h3>
      <p class="text-sm text-slate-400 font-medium mb-5 flex items-center gap-1">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        {{ warehouse.codigo }}
        <span *ngIf="warehouse.direccion" class="ml-1">• {{ warehouse.direccion }}</span>
      </p>

      <!-- Stats -->
      <div class="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
        <div class="bg-slate-50 rounded-lg p-3 text-center border border-slate-100">
          <div class="text-xl font-bold text-slate-900">{{ warehouse.productos_distintos ?? 0 }}</div>
          <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">Productos</div>
        </div>
        <div class="bg-slate-50 rounded-lg p-3 text-center border border-slate-100">
          <div class="text-xl font-bold text-slate-900">{{ warehouse.total_unidades ?? 0 }}</div>
          <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">Unidades</div>
        </div>
      </div>
    </div>
  `,
})
export class WarehouseCardComponent {
    @Input({ required: true }) warehouse!: Warehouse;
    @Output() viewInventory = new EventEmitter<Warehouse>();
}
