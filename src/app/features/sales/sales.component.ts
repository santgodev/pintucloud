import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../shared/shared.module';
import { SalesService, Sale } from './services/sales.service';
import { Observable } from 'rxjs';

@Component({
   selector: 'app-sales',
   standalone: true,
   imports: [CommonModule, SharedModule],
   template: `
    <app-card header="Historial de Ventas">
       <div class="filters mb-4 flex gap-4">
          <app-datepicker></app-datepicker>
          <div class="relative">
             <select class="input-premium" style="width: 200px; appearance: none;">
                <option>Todas las zonas</option>
                <option>Zona Norte</option>
             </select>
             <svg class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
          </div>
       </div>
       <table class="w-full text-left">
          <thead>
             <tr class="text-muted border-b border-white/5">
                <th class="p-3">ID Venta</th>
                <th class="p-3">Cliente</th>
                <th class="p-3">Fecha</th>
                <th class="p-3">Total</th>
                <th class="p-3">Estado</th>
             </tr>
          </thead>
          <tbody>
             <tr *ngFor="let sale of sales$ | async" class="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td class="p-3 text-primary">#{{ sale.id.substring(0, 8) }}</td>
                <td class="p-3">{{ sale.clientName }}</td>
                <td class="p-3">{{ sale.date | date:'dd MMM yyyy' }}</td>
                <td class="p-3">{{ sale.total | currency:'COP':'symbol-narrow':'1.0-0' }}</td>
                <td class="p-3">
                    <span class="badge" 
                        [class.success]="sale.status === 'completado'"
                        [class.warning]="sale.status === 'pendiente'"
                        [class.danger]="sale.status === 'cancelado'">
                        {{ sale.status | titlecase }}
                    </span>
                </td>
             </tr>
             <tr *ngIf="(sales$ | async)?.length === 0">
                 <td colspan="5" class="text-center p-8 text-muted">No hay ventas registradas.</td>
             </tr>
          </tbody>
       </table>
    </app-card>
  `,
   styles: [`
    .text-primary { color: var(--color-primary); }
    .text-muted { color: var(--color-text-muted); }
    .badge { padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; }
    .success { background: rgba(0,255,128,0.1); color: var(--color-success); }
    .warning { background: rgba(255,170,0,0.1); color: var(--color-warning); }
    .danger { background: rgba(255,0,0,0.1); color: #ff4444; }
    .w-full { width: 100%; }
    .p-3 { padding: 0.75rem; }
    
    /* Date Picker Customization */
    input[type="date"] {
      position: relative;
      color-scheme: dark; /* Forces dark mode on native picker */
    }
    input[type="date"]::-webkit-calendar-picker-indicator {
      background: transparent;
      bottom: 0;
      color: transparent;
      cursor: pointer;
      height: auto;
      left: 0;
      position: absolute;
      right: 0;
      top: 0;
      width: auto;
      opacity: 0;
      z-index: 10;
    }
  `]
})
export class SalesComponent implements OnInit {
   sales$!: Observable<Sale[]>;

   constructor(private salesService: SalesService) { }

   ngOnInit() {
      this.sales$ = this.salesService.getSales();
   }
}
