import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../shared/shared.module';
import { SalesService } from '../sales/services/sales.service';
import { ShowcaseService } from '../showcase/services/showcase.service';
import { InventoryService } from '../inventory/services/inventory.service';
import { SalesCaptureComponent } from '../sales/components/sales-capture/sales-capture.component';
import { DashboardService } from './services/dashboard.service';
import { Chart } from 'chart.js/auto';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Observable, map } from 'rxjs';
import { Router } from '@angular/router';
import { UiService } from '../../core/services/ui.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, SharedModule, SalesCaptureComponent],
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
          <!-- Ventas por Producto -->
          <div class="col-span-12 lg:col-span-9 card bg-white rounded-xl border border-slate-200 p-6 shadow-sm slide-in-5 flex flex-col min-h-[500px]">
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

          <!-- Right: Activity Feed -->
          <div class="col-span-12 lg:col-span-3 h-full">
            <app-card header="Actividad Reciente" class="slide-in-6 h-full">
               <div class="feed-list">
                   <div class="feed-item">
                       <div class="feed-icon bg-success-soft-solid">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                       </div>
                       <div class="feed-content">
                           <div class="feed-title">Pago Recibido</div>
                           <div class="feed-desc">Ferretería El Tornillo pagó <span class="text-primary font-mono font-bold">$450k</span></div>
                           <div class="feed-time">Hace 2 min</div>
                       </div>
                   </div>

                   <div class="feed-item">
                       <div class="feed-icon bg-warning-soft-solid">
                           <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                       </div>
                       <div class="feed-content">
                           <div class="feed-title">Stock Bajo</div>
                           <div class="feed-desc">Cemento Argos por debajo del mínimo.</div>
                           <div class="feed-time">Hace 15 min</div>
                       </div>
                   </div>
                   
                   <div class="feed-item">
                       <div class="feed-icon bg-info-soft">
                           <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                       </div>
                       <div class="feed-content">
                           <div class="feed-title">Inventario Actualizado</div>
                           <div class="feed-desc">Se cargaron 50 unidades de Rodillo Felpón.</div>
                           <div class="feed-time">Hace 32 min</div>
                       </div>
                   </div>

                   <div class="feed-item">
                       <div class="feed-icon bg-secondary-soft">
                           <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
                       </div>
                       <div class="feed-content">
                           <div class="feed-title">Nuevo Cliente</div>
                           <div class="feed-desc">Registrado \"Constructora A&M\".</div>
                           <div class="feed-time">Hace 1 hora</div>
                       </div>
                   </div>
               </div>
               
               <div class="mt-4 pt-4 border-t border-white/5 text-center">
                  <button class="btn btn-outline w-full text-sm py-2">Ver Todo el Historial</button>
               </div>
            </app-card>
        </div>
      </div>

      <!-- New Sale Modal -->
      <app-sales-capture *ngIf="showNewSaleModal" (onClose)="toggleNewSaleModal()" (saleCompleted)="refreshStats()"></app-sales-capture>
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
  `]
})
export class DashboardComponent implements OnInit {

  salesToday$!: Observable<number>;
  productCount$!: Observable<number>;
  lowStockCount$!: Observable<number>;
  showNewSaleModal = false;
  productosVentasMes: any[] = [];
  ventasHoy: number = 0;
  ventasAyer: number = 0;
  variacionVentas: number = 0;
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
    private showcaseService: ShowcaseService,
    private inventoryService: InventoryService,
    private dashboardService: DashboardService,
    private router: Router,
    private uiService: UiService
  ) { }

  async ngOnInit() {
    this.uiService.setLoading(true);
    await Promise.all([
       this.loadStats(),
       this.loadVentasProductos()
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

      this.productCount$ = this.showcaseService.getProducts().pipe(
        map(products => products.length)
      );

      const inventory = await this.inventoryService.getInventory();
      this.lowStockCount$ = inventory.pipe(
        map(items => items.filter(item => item.status !== 'En Stock').length)
      );
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    }
  }

  toggleNewSaleModal() {
    this.showNewSaleModal = !this.showNewSaleModal;
  }

  async refreshStats() {
    this.uiService.setLoading(true);
    await Promise.all([
       this.loadStats(),
       this.loadVentasProductos()
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
