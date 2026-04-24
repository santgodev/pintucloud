import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SharedModule } from '../../shared/shared.module';
import { SalesService } from '../sales/services/sales.service';
import { InventoryService, InventoryItem } from '../inventory/services/inventory.service';
import { DashboardService } from './services/dashboard.service';
import { Chart } from 'chart.js/auto';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Observable, map } from 'rxjs';
import { Router } from '@angular/router';
import { UiService } from '../../core/services/ui.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, SharedModule, FormsModule],
  template: `
    <div class="dashboard-container">
      <div class="header mb-8 flex justify-between items-end">
         <div>
            <h1 class="title-lg">Resumen General</h1>
            <p class="text-muted">Vista general del rendimiento de ventas e inventario.</p>
         </div>
         <div class="flex gap-3">
             <button class="btn btn-primary" (click)="toggleNewSaleModal()">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                Nueva Venta
             </button>
         </div>
      </div>

      <!-- Stats Row -->
      <div class="stats-grid mb-6">
         <!-- Sales Stats -->
         <app-card customClass="p-0 overflow-hidden relative" class="slide-in-1 card-dashboard" (click)="goToVentasHoy()">
            <div class="absolute top-0 right-0 p-4 opacity-10">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            </div>
            <div class="stat-box">
               <div>
                 <div class="stat-label mb-1">Ventas Hoy</div>
                 <div class="stat-value text-primary">$ {{ ventasHoy | number }}</div>
               </div>
            </div>
            <div class="stat-footer bg-primary-soft-solid">
               <span class="font-bold flex items-center gap-1"
                     [ngClass]="variacionVentas >= 0 ? 'text-green-600' : 'text-red-600'">
                  <svg *ngIf="variacionVentas >= 0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                  <svg *ngIf="variacionVentas < 0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="transform: rotate(90deg)"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                  {{ variacionVentas | number:'1.1-1' }}% vs ayer
               </span>
            </div>
         </app-card>

         <!-- Product Count -->
         <app-card customClass="p-0 overflow-hidden relative" class="slide-in-2 card-dashboard" (click)="goToProductos()">
            <div class="absolute top-0 right-0 p-4 opacity-10 text-secondary">
               <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            </div>
            <div class="stat-box">
               <div>
                 <div class="stat-label mb-1">Productos</div>
                 <div class="stat-value text-main">{{ productCount$ | async }}</div>
               </div>
            </div>
             <div class="stat-footer border-t border-slate-200">
               <span class="text-muted">Stock Total</span>
            </div>
         </app-card>

         <!-- Low Stock Alerts -->
         <app-card customClass="p-0 overflow-hidden relative" class="slide-in-3 card-dashboard" (click)="goToStockBajo()">
             <div class="absolute top-0 right-0 p-4 opacity-10 text-warning">
                 <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
             </div>
            <div class="stat-box">
               <div>
                 <div class="stat-label mb-1">Alertas</div>
                 <div class="stat-value text-warning">{{ lowStockCount$ | async }}</div>
               </div>
            </div>
            <div class="stat-footer bg-warning-soft-solid">
                <span class="text-warning font-bold">Stock Bajo</span>
            </div>
         </app-card>
         
      </div>

      <!-- Main Content Grid -->
      <div class="grid grid-cols-12 gap-6">
          <!-- Ventas por Producto (Full Width) -->
          <div class="col-span-12 card bg-white rounded-xl border border-slate-200 p-6 shadow-sm slide-in-5 flex flex-col min-h-[500px]">
            <h3 class="text-lg font-semibold mb-4 text-slate-800">
              Ventas por Producto (Mes)
            </h3>
            <div class="flex-1 mt-4 products-container pr-2">
                <div class="product-row" *ngFor="let item of productosVentasMes; let i = index">
                    <span class="product-name" [title]="item.producto">
                      {{item.producto}}
                    </span>
                    
                    <div class="bar-container">
                      <div class="bar" 
                           [style.width.%]="item.width"
                           [style.background]="coloresBarras[i]">
                      </div>
                    </div>
                    
                    <span class="percent">
                      {{item.porcentaje | number:'1.0-1'}}%
                    </span>
                    
                    <span class="amount">
                      \${{item.total_ventas | number}}
                    </span>
                </div>
            </div>
          </div>

          <!-- Recaudos Diarios (Cierre de Caja) -->
          <div class="col-span-12 card bg-white rounded-xl border border-slate-200 p-6 shadow-sm slide-in-6 flex flex-col mt-6">
            <div class="flex justify-between items-center mb-5">
              <h3 class="text-lg font-semibold text-slate-800">
                Recaudos Diarios (Cierre de Caja)
              </h3>
              <div class="flex items-center gap-3">
                <!-- 
                <button 
                  class="btn-reporte-detallado" 
                  (click)="descargarReporteComisiones()"
                  [disabled]="loadingRecaudos || recaudosHoy.length === 0"
                  style="background: #059669; border-color: #059669; color: white;"
                  title="Descargar reporte de comisiones (3% sobre pagos <= 30 días)">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-1.5"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                  Reporte Comisiones
                </button>
                -->

                <button 
                  class="btn-reporte-detallado" 
                  (click)="descargarReporteDetallado()"
                  [disabled]="loadingRecaudos || recaudosHoy.length === 0"
                  title="Descargar reporte detallado de facturas y clientes">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                  Reporte Detallado
                </button>
                <div class="recaudos-badge" [ngClass]="periodoLabel === 'Hoy' ? 'badge-hoy' : 'badge-periodo'">
                  {{ periodoLabel }}
                </div>
              </div>
            </div>

            <!-- Filtro de Periodo -->
            <div class="filtro-periodo-wrapper mb-5">
              <!-- Quick presets -->
              <div class="quick-presets">
                <button class="preset-btn" [class.active]="periodoActivo === 'HOY'" (click)="aplicarPreset('HOY')">Hoy</button>
                <button class="preset-btn" [class.active]="periodoActivo === 'SEMANA'" (click)="aplicarPreset('SEMANA')">Esta Semana</button>
                <button class="preset-btn" [class.active]="periodoActivo === 'MES'" (click)="aplicarPreset('MES')">Este Mes</button>
                <button class="preset-btn" [class.active]="periodoActivo === 'CUSTOM'" (click)="periodoActivo = 'CUSTOM'">Personalizado</button>
              </div>
              <!-- Custom date range -->
              <div class="date-range-row" [class.visible]="periodoActivo === 'CUSTOM'">
                <div class="date-field">
                  <label>Desde</label>
                  <input type="date" [(ngModel)]="fechaInicioRecaudos" class="date-input" />
                </div>
                <div class="date-field">
                  <label>Hasta</label>
                  <input type="date" [(ngModel)]="fechaFinRecaudos" class="date-input" />
                </div>
                <button class="btn-buscar" (click)="aplicarFiltroPersonalizado()" [disabled]="loadingRecaudos">
                  <svg *ngIf="!loadingRecaudos" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <span *ngIf="loadingRecaudos" class="spinner-sm"></span>
                  {{ loadingRecaudos ? 'Buscando...' : 'Consultar' }}
                </button>
              </div>
            </div>
            
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="bg-slate-50/50 text-slate-600 uppercase text-[10px] font-bold tracking-widest border-b border-slate-100">
                    <th class="p-3 text-left">Asesor</th>
                    <th class="p-3 text-right">Efectivo</th>
                    <th class="p-3 text-right">Bancos/Transf.</th>
                    <th class="p-3 text-right">Otros</th>
                    <th class="p-3 text-right">Total Recaudado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let r of recaudosHoy"
                      class="border-b border-slate-50 hover:bg-indigo-50/40 transition-colors group cursor-pointer"
                      (click)="verRecaudosAsesor(r)"
                      title="Ver facturas de {{r.asesor}}">
                    <td class="p-3">
                      <div class="font-semibold text-slate-700 flex items-center gap-2">
                        {{r.asesor}}
                        <svg class="opacity-0 group-hover:opacity-100 transition-opacity" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                      </div>
                    </td>
                    <td class="p-3 text-right">
                      <span class="text-emerald-600 font-bold">$ {{r.efectivo | number:'1.0-0'}}</span>
                    </td>
                    <td class="p-3 text-right">
                      <span class="text-blue-600 font-bold">$ {{r.transferencia | number:'1.0-0'}}</span>
                    </td>
                    <td class="p-3 text-right italic text-slate-400">
                      $ {{r.otros | number:'1.0-0'}}
                    </td>
                    <td class="p-3 text-right">
                      <div class="total-link-btn">
                        <span>$ {{r.total | number:'1.0-0'}}</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                      </div>
                    </td>
                  </tr>
                  <!-- Fila Totales -->
                  <tr *ngIf="recaudosHoy.length > 0" class="totales-row">
                    <td class="p-3 font-bold text-slate-800 uppercase text-xs tracking-wide">TOTAL GENERAL</td>
                    <td class="p-3 text-right font-bold text-emerald-700">$ {{ totalEfectivo | number:'1.0-0' }}</td>
                    <td class="p-3 text-right font-bold text-blue-700">$ {{ totalTransferencia | number:'1.0-0' }}</td>
                    <td class="p-3 text-right font-bold text-slate-500">$ {{ totalOtros | number:'1.0-0' }}</td>
                    <td class="p-3 text-right">
                      <div class="px-3 py-1 bg-indigo-600 text-white rounded-lg font-bold inline-block min-w-[100px]">
                        $ {{ totalGeneral | number:'1.0-0' }}
                      </div>
                    </td>
                  </tr>
                  <tr *ngIf="recaudosHoy.length === 0 && !loadingRecaudos">
                    <td colspan="5" class="p-8 text-center text-slate-400 italic">
                      No se han registrado recaudos en el periodo seleccionado.
                    </td>
                  </tr>
                  <tr *ngIf="loadingRecaudos">
                    <td colspan="5" class="p-8 text-center text-slate-400">
                      <div class="flex items-center justify-center gap-2">
                        <span class="spinner-sm" style="border-top-color: #6366f1"></span>
                        Cargando recaudos...
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div class="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
              <span class="text-[11px] text-slate-400 italic">
                * Los datos se basan en los pagos registrados en el módulo de Cartera.
              </span>
              <span class="text-[11px] text-slate-400">
                {{ recaudosHoy.length }} asesor{{ recaudosHoy.length !== 1 ? 'es' : '' }}
              </span>
            </div>
          </div>

      </div>

      <!-- Sales Capture now redirected to its own route -->
    </div>
  `,
  styles: [`
    .dashboard-container {
      max-width: 1400px;
      margin: 0 auto;
      padding-bottom: 2rem;
    }
    .flex { display: flex; }
    .justify-between { justify-content: space-between; }
    .items-end { align-items: flex-end; }
    .gap-3 { gap: 0.75rem; }
    .mr-2 { margin-right: 0.5rem; }
    .h-full { height: 100%; }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1.5rem;
    }

    .stat-box {
        padding: 1.5rem 1.5rem 0.5rem;
    }
    .stat-value { font-size: 2.25rem; font-weight: 800; letter-spacing: -0.03em; line-height: 1; color: var(--text-main); }
    .stat-label { font-size: 0.8rem; font-weight: 600; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em; }
    .text-primary { color: var(--color-primary); }
    .text-secondary { color: var(--color-secondary); }
    .text-info { color: #0ea5e9; }
    .text-muted { color: var(--text-muted); }
    
    .stat-footer {
        padding: 0.75rem 1.5rem;
        font-size: 0.8rem;
        display: flex;
        align-items: center;
    }
    .bg-primary-soft-solid { background: var(--color-slate-50); }
    .bg-warning-soft-solid { background: #fffbeb; }

    /* Feed Styles */
    .feed-list { display: flex; flex-direction: column; gap: 1.25rem; }
    .feed-item { display: flex; gap: 1rem; align-items: flex-start; }
    .feed-icon { 
        width: 36px; height: 36px; border-radius: 10px; 
        display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        color: white;
    }
    
    .bg-primary-soft { background: var(--color-indigo-50); color: var(--color-primary); }
    .bg-secondary-soft { background: var(--color-slate-100); color: var(--color-secondary); }
    .bg-warning-soft { background: #fffbeb; color: #d97706; }
    .bg-success-soft { background: #ecfdf5; color: #059669; }
    
    .feed-content { flex: 1; }
    .feed-title { font-weight: 600; font-size: 0.9rem; margin-bottom: 0.15rem; color: var(--text-main); }
    .feed-desc { font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.25rem; line-height: 1.3; }
    .feed-time { font-size: 0.7rem; color: var(--text-muted); }

    @keyframes pulse {
        0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(var(--color-primary), 0.4); }
        70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(var(--color-primary), 0); }
        100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(var(--color-primary), 0); }
    }
    
    /* Animation Utils */
    [class*='slide-in'] { opacity: 0; animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    .slide-in-1 { animation-delay: 0.1s; }
    .slide-in-2 { animation-delay: 0.15s; }
    .slide-in-3 { animation-delay: 0.2s; }
    .slide-in-4 { animation-delay: 0.25s; }
    .slide-in-5 { animation-delay: 0.3s; }
    .slide-in-6 { animation-delay: 0.35s; }

    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

    .products-container {
      max-height: 420px;
      overflow-y: auto;
    }

    .product-row {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 14px;
    }

    .product-name {
      width: 260px;
      font-size: 13px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--text-main);
      font-weight: 500;
    }

    .bar-container {
      flex: 1;
      height: 16px;
      background: #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
    }

    .bar {
      height: 16px;
      background: #6366f1;
      border-radius: 8px;
    }

    .percent {
      width: 50px;
      text-align: right;
      font-weight: 600;
      font-size: 13px;
      color: var(--text-main);
    }

    .amount {
      width: 90px;
      text-align: right;
      font-weight: 700;
      font-size: 13px;
      color: var(--text-main);
    }

    .card-dashboard {
      cursor: pointer;
      transition: transform .15s ease, box-shadow .15s ease;
    }

    .card-dashboard:hover {
      transform: translateY(-3px);
      box-shadow: 0 6px 18px rgba(0,0,0,.08);
    }

    /* ── Recaudos Badge ── */
    .recaudos-badge {
      padding: 3px 12px;
      font-size: 11px;
      font-weight: 700;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      border: 1px solid transparent;
    }
    .badge-hoy { background: #f0fdf4; color: #16a34a; border-color: #bbf7d0; }
    .badge-periodo { background: #eff6ff; color: #2563eb; border-color: #bfdbfe; }

    /* ── Filtro de Periodo ── */
    .filtro-periodo-wrapper {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .quick-presets { display: flex; gap: 8px; flex-wrap: wrap; }
    .preset-btn {
      padding: 6px 14px;
      font-size: 12px;
      font-weight: 600;
      border-radius: 8px;
      border: 1.5px solid #e2e8f0;
      background: #fff;
      color: #64748b;
      cursor: pointer;
      transition: all .15s ease;
    }
    .preset-btn:hover { border-color: #6366f1; color: #6366f1; }
    .preset-btn.active { background: #6366f1; border-color: #6366f1; color: #fff; }

    .date-range-row { display: none; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
    .date-range-row.visible { display: flex; }

    .date-field { display: flex; flex-direction: column; gap: 4px; }
    .date-field label {
      font-size: 10px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.06em; color: #94a3b8;
    }
    .date-input {
      padding: 7px 10px; font-size: 13px;
      border: 1.5px solid #e2e8f0; border-radius: 8px;
      outline: none; background: #fff; color: #1e293b;
      transition: border-color .15s ease;
    }
    .date-input:focus { border-color: #6366f1; }

    .btn-buscar {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 16px; font-size: 13px; font-weight: 600;
      background: #6366f1; color: #fff; border: none;
      border-radius: 8px; cursor: pointer;
      transition: background .15s ease, opacity .15s ease;
    }
    .btn-buscar:hover { background: #4f46e5; }
    .btn-buscar:disabled { opacity: 0.6; cursor: not-allowed; }

    /* ── Totals Row ── */
    .totales-row { background: #f1f5f9; border-top: 2px solid #e2e8f0; }

    /* ── Spinner ── */
    .spinner-sm {
      display: inline-block; width: 14px; height: 14px;
      border: 2px solid #e2e8f0; border-top-color: #fff;
      border-radius: 50%; animation: spin .6s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Total link button ── */
    .total-link-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      background: #1e293b;
      color: #fff;
      border-radius: 8px;
      font-weight: 700;
      font-size: 13px;
      min-width: 100px;
      justify-content: space-between;
      transition: background .15s ease, transform .1s ease;
    }
    tr:hover .total-link-btn {
      background: #6366f1;
      transform: scale(1.02);
    }

    .btn-reporte-detallado {
      display: flex;
      align-items: center;
      padding: 6px 14px;
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-reporte-detallado:hover:not(:disabled) {
      background: #e2e8f0;
      color: #1e293b;
      border-color: #cbd5e1;
    }

    .btn-reporte-detallado:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `]
})
export class DashboardComponent implements OnInit {

  salesToday$!: Observable<number>;
  productCount$!: Observable<number>;
  lowStockCount$!: Observable<number>;
  showNewSaleModal = false;
  ventasHoy: number = 0;
  ventasAyer: number = 0;
  variacionVentas: number = 0;
  recaudosHoy: any[] = [];
  // Inicialización con fecha local (evita desfase UTC)
  fechaInicioRecaudos: string = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
  fechaFinRecaudos: string = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
  periodoActivo: 'HOY' | 'SEMANA' | 'MES' | 'CUSTOM' = 'HOY';
  periodoLabel: string = 'Hoy';
  loadingRecaudos: boolean = false;
  // Totals
  totalEfectivo: number = 0;
  totalTransferencia: number = 0;
  totalOtros: number = 0;
  totalGeneral: number = 0;
  productosVentasMes: any[] = [];
  coloresBarras = [
    '#6366f1',
    '#22c55e',
    '#f59e0b',
    '#ef4444',
    '#06b6d4',
    '#8b5cf6',
    '#ec4899',
    '#14b8a6',
    '#84cc16',
    '#f97316',
    '#3b82f6',
    '#10b981',
    '#a855f7',
    '#eab308',
    '#64748b'
  ];

  readonly chartColors = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#0ea5e9', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e', '#6366f1'];

  constructor(
    private salesService: SalesService,
    private inventoryService: InventoryService,
    private dashboardService: DashboardService,
    private router: Router,
    private uiService: UiService
  ) { }

  async ngOnInit() {
    this.uiService.setLoading(true);
    await Promise.all([
       this.loadStats(),
       this.loadVentasProductos(),
       this.loadRecaudosDiarios()
    ]);
    this.uiService.setLoading(false);
  }



  getChartColor(index: number): string {
    return this.chartColors[index % this.chartColors.length];
  }

  async loadVentasProductos() {
    try {
      const data = await this.dashboardService.getVentasProductosMes();

      // Versión segura con tipos y normalización de barras
      this.productosVentasMes = data.map((p: any) => ({
        ...p,
        porcentaje: Number(p.porcentaje || 0),
        total_ventas: Number(p.total_ventas || 0)
      }));

      const max = Math.max(...this.productosVentasMes.map(p => p.porcentaje), 0);

      this.productosVentasMes = this.productosVentasMes.map(p => ({
        ...p,
        width: max > 0 ? (p.porcentaje / max) * 100 : 0
      }));

    } catch (err) {
      console.error('Error cargando ranking de productos:', err);
      this.productosVentasMes = [];
    }
  }

  async loadStats() {
    try {
      // Real sales summary from RPC - returns an array
      const data = await this.dashboardService.getVentasResumen();

      if (data && data.length > 0) {
        this.ventasHoy = Number(data[0].ventas_hoy || 0);
        this.ventasAyer = Number(data[0].ventas_ayer || 0);
        this.variacionVentas = Number(data[0].variacion || 0);
      }

      // Use inventoryService instead of showcaseService
      const inventory$ = await this.inventoryService.getInventory();
      
      this.productCount$ = inventory$.pipe(
        map((items: InventoryItem[]) => {
          // Count unique products by productId
          const uniqueIds = new Set(items.map(i => i.productId));
          return uniqueIds.size;
        })
      );

      this.lowStockCount$ = inventory$.pipe(
        map((items: InventoryItem[]) => items.filter(item => item.status !== 'En Stock').length)
      );
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    }
  }

  /** Alias used by ngOnInit / refreshStats */
  async loadRecaudosDiarios() {
    await this.loadRecaudosPeriodo();
  }

  async loadRecaudosPeriodo() {
    this.loadingRecaudos = true;
    try {
      this.recaudosHoy = await this.dashboardService.getRecaudosPeriodo(
        this.fechaInicioRecaudos,
        this.fechaFinRecaudos
      );
      this.calcularTotales();
    } catch (err) {
      console.error('Error cargando recaudos:', err);
      this.recaudosHoy = [];
      this.calcularTotales();
    } finally {
      this.loadingRecaudos = false;
    }
  }

  calcularTotales() {
    this.totalEfectivo = this.recaudosHoy.reduce((s, r) => s + (Number(r.efectivo) || 0), 0);
    this.totalTransferencia = this.recaudosHoy.reduce((s, r) => s + (Number(r.transferencia) || 0), 0);
    this.totalOtros = this.recaudosHoy.reduce((s, r) => s + (Number(r.otros) || 0), 0);
    this.totalGeneral = this.recaudosHoy.reduce((s, r) => s + (Number(r.total) || 0), 0);
  }

  aplicarPreset(preset: 'HOY' | 'SEMANA' | 'MES') {
    const hoy = new Date();
    // Obtener fecha local en formato YYYY-MM-DD sin desfase UTC
    const offset = hoy.getTimezoneOffset() * 60000;
    const localFmt = (d: Date) => new Date(d.getTime() - offset).toISOString().split('T')[0];
    
    this.periodoActivo = preset;
    if (preset === 'HOY') {
      this.fechaInicioRecaudos = localFmt(hoy);
      this.fechaFinRecaudos = localFmt(hoy);
      this.periodoLabel = 'Hoy';
    } else if (preset === 'SEMANA') {
      const lunes = new Date(hoy);
      lunes.setDate(hoy.getDate() - hoy.getDay() + (hoy.getDay() === 0 ? -6 : 1));
      this.fechaInicioRecaudos = localFmt(lunes);
      this.fechaFinRecaudos = localFmt(hoy);
      this.periodoLabel = 'Esta Semana';
    } else if (preset === 'MES') {
      this.fechaInicioRecaudos = localFmt(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
      this.fechaFinRecaudos = localFmt(hoy);
      this.periodoLabel = 'Este Mes';
    }
    this.loadRecaudosPeriodo();
  }

  aplicarFiltroPersonalizado() {
    const parseLocal = (s: string) => {
       const [y, m, d] = s.split('-').map(Number);
       return `${d}/${m}/${y}`;
    };
    this.periodoLabel = `${parseLocal(this.fechaInicioRecaudos)} – ${parseLocal(this.fechaFinRecaudos)}`;
    this.periodoActivo = 'CUSTOM';
    this.loadRecaudosPeriodo();
  }

  verRecaudosAsesor(r: any) {
    this.router.navigate(['/cartera'], {
      queryParams: {
        asesorId: r.asesor_id,
        fechaDesde: this.fechaInicioRecaudos,
        fechaHasta: this.fechaFinRecaudos
      }
    });
  }

  async descargarReporteDetallado() {
    this.uiService.setLoading(true);
    try {
      const data = await this.dashboardService.getDetallePagosPeriodo(
        this.fechaInicioRecaudos,
        this.fechaFinRecaudos
      );

      if (!data || data.length === 0) {
        alert('No hay pagos detallados para exportar en este periodo.');
        return;
      }

      // Mapeo para nombres de columnas amigables en Excel
      const excelData = data.map((item: any) => ({
        'Fecha Pago': item.fecha_pago,
        'Asesor': item.asesor,
        'Cliente': item.cliente,
        'Factura (FAC)': item.numero_factura ? item.numero_factura.toString().padStart(6, '0') : '—',
        'Monto Recaudado': item.monto,
        'Método de Pago': item.metodo_pago,
        'Observación': item.observacion || '—'
      }));

      // Generar Excel
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Detalle de Recaudos');

      // Nombre del archivo con el periodo
      const filename = `Recaudos_Detallados_${this.fechaInicioRecaudos}_al_${this.fechaFinRecaudos}.xlsx`;
      XLSX.writeFile(wb, filename);

    } catch (err) {
      console.error('Error al generar reporte:', err);
      alert('Error al generar el reporte detallado.');
    } finally {
      this.uiService.setLoading(false);
    }
  }

  async descargarReporteComisiones() {
    this.uiService.setLoading(true);
    try {
      const data = await this.dashboardService.getReporteComisiones(
        this.fechaInicioRecaudos,
        this.fechaFinRecaudos
      );

      if (!data || data.length === 0) {
        alert('No hay comisiones para liquidar en este periodo.');
        return;
      }

      // Mapeo para nombres de columnas amigables en Excel
      const excelData = data.map((item: any) => ({
        'Asesor': item.asesor_nombre,
        'Fecha Pago': item.fecha_pago,
        'Monto Recaudado': item.monto_pago,
        'Nro Factura': item.numero_factura ? item.numero_factura.toString().padStart(6, '0') : '—',
        'Fecha Factura': item.fecha_factura,
        'Cliente': item.cliente_nombre,
        'Días transcurridos': item.dias_transcurridos,
        'Aplica Comisión': item.comisiona ? 'SÍ' : 'NO (Mora > 30 días)',
        '% Comisión': item.porcentaje_comision + '%',
        'VALOR COMISIÓN': item.valor_comision
      }));

      const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(excelData);
      
      // Ajustar anchos de columnas
      const wscols = [
        {wch: 25}, {wch: 12}, {wch: 15}, {wch: 12}, {wch: 12}, 
        {wch: 30}, {wch: 15}, {wch: 20}, {wch: 12}, {wch: 15}
      ];
      ws['!cols'] = wscols;

      const wb: XLSX.WorkBook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Liquidación Comisiones');
      XLSX.writeFile(wb, `Reporte_Comisiones_${this.fechaInicioRecaudos}_al_${this.fechaFinRecaudos}.xlsx`);
    } catch (err) {
      console.error('Error al exportar comisiones:', err);
      alert('Error al generar el reporte de comisiones.');
    } finally {
      this.uiService.setLoading(false);
    }
  }

  toggleNewSaleModal() {
    this.router.navigate(['/sales/new']);
  }

  async refreshStats() {
    this.uiService.setLoading(true);
    await Promise.all([
       this.loadStats(),
       this.loadVentasProductos(),
       this.loadRecaudosDiarios()
    ]);
    this.uiService.setLoading(false);
  }

  goToVentasHoy() {
    this.router.navigate(['/sales'], {
      queryParams: { today: true }
    });
  }

  goToProductos() {
    this.router.navigate(['/inventory']);
  }

  goToStockBajo() {
    this.router.navigate(['/inventory'], {
      queryParams: { lowStock: true }
    });
  }

}
