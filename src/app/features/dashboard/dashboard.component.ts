import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../shared/shared.module';
import { SalesService } from '../sales/services/sales.service';
import { ShowcaseService } from '../showcase/services/showcase.service';
import { InventoryService } from '../inventory/services/inventory.service';
import { SalesCaptureComponent } from '../sales/components/sales-capture/sales-capture.component';
import { Observable, map } from 'rxjs';

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
         <app-card customClass="p-0 overflow-hidden relative" class="slide-in-1">
            <div class="absolute top-0 right-0 p-4 opacity-10">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            </div>
            <div class="stat-box">
               <div>
                 <div class="stat-label mb-1">Ventas Hoy</div>
                 <div class="stat-value text-primary">{{ (salesToday$ | async) | currency:'COP':'symbol-narrow':'1.0-0' }}</div>
               </div>
            </div>
            <div class="stat-footer bg-primary-soft-solid">
               <span class="text-primary font-bold flex items-center gap-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                  +15%
               </span>
               <span class="opacity-70 ml-1">vs ayer</span>
            </div>
         </app-card>

         <!-- Product Count -->
         <app-card customClass="p-0 overflow-hidden relative" class="slide-in-2">
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
         <app-card customClass="p-0 overflow-hidden relative" class="slide-in-3">
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
         
         <!-- Mock Visits -->
         <app-card customClass="p-0 overflow-hidden relative" class="slide-in-4">
             <div class="absolute top-0 right-0 p-4 opacity-10 text-info">
                 <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
             </div>
            <div class="stat-box">
               <div>
                 <div class="stat-label mb-1">Visitas</div>
                 <div class="stat-value text-info">54</div>
               </div>
            </div>
             <div class="stat-footer border-t border-slate-200">
               <span class="text-muted">Pendientes hoy</span>
            </div>
         </app-card>
      </div>

      <!-- Main Content Grid -->
      <div class="dashboard-main-grid">
          <!-- Left: Hero Map -->
          <app-card header="Ruta en Tiempo Real" class="slide-in-5 map-card h-full">
          <div class="map-container relative h-full min-h-[400px] w-full bg-slate-50 rounded-lg overflow-hidden border border-slate-200">
                   <!-- Grid Pattern Background -->
                  <div class="absolute inset-0" style="background-image: linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px); background-size: 40px 40px;"></div>
                  
                  <!-- Mock Map UI -->
                  <div class="absolute top-4 left-4 bg-white/90 backdrop-blur-md p-3 rounded-lg border border-slate-200 shadow-sm max-w-[200px]">
                      <div class="text-xs text-muted uppercase font-bold tracking-wider mb-1">Vendedor Activo</div>
                      <div class="flex items-center gap-2">
                          <img src="https://ui-avatars.com/api/?name=Carlos+R&background=random" class="w-6 h-6 rounded-full">
                          <span class="text-sm font-semibold text-main">Carlos Rodriguez</span>
                      </div>
                  </div>

                  <!-- Pulsing Dots (Locations) -->
                  <div class="map-marker" style="top: 30%; left: 40%">
                      <div class="pulsing-dot bg-success"></div>
                      <div class="marker-label">Cliente A</div>
                  </div>
                   <div class="map-marker" style="top: 55%; left: 65%">
                      <div class="pulsing-dot bg-warning"></div>
                      <div class="marker-label">Cliente B</div>
                  </div>
                  
                  <!-- Route Line (SVG) -->
                  <svg class="absolute inset-0 w-full h-full pointer-events-none">
                      <path d="M400 200 Q 550 300 650 350" stroke="var(--color-primary)" stroke-width="2" stroke-dasharray="5,5" fill="none" opacity="0.6"></path>
                  </svg>
              </div>
          </app-card>

          <!-- Right: Activity Feed -->
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
                       <div class="feed-icon bg-primary-soft">
                           <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
                       </div>
                       <div class="feed-content">
                           <div class="feed-title">Pedido en Ruta</div>
                           <div class="feed-desc">Pedido #INV-2024 asignado a Carlos.</div>
                           <div class="feed-time">Hace 32 min</div>
                       </div>
                   </div>

                   <div class="feed-item">
                       <div class="feed-icon bg-secondary-soft">
                           <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
                       </div>
                       <div class="feed-content">
                           <div class="feed-title">Nuevo Cliente</div>
                           <div class="feed-desc">Registrado "Constructora A&M".</div>
                           <div class="feed-time">Hace 1 hora</div>
                       </div>
                   </div>
               </div>
               
               <div class="mt-4 pt-4 border-t border-white/5 text-center">
                  <button class="btn btn-outline w-full text-sm py-2">Ver Todo el Historial</button>
               </div>
          </app-card>
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

    /* Main Grid Layout */
    .dashboard-main-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 1.5rem;
        height: auto;
    }
    @media (min-width: 1024px) {
        .dashboard-main-grid { 
            grid-template-columns: 2fr 1fr; 
            height: 500px; /* Fixed height for Hero feel on desktop */
        }
    }

    /* Map Styles */
    .map-marker { position: absolute; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; transform: translate(-50%, -50%); }
    .marker-label { background: rgba(255,255,255,0.9); padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.1); color: var(--text-main); font-weight: 600; }
    
    .pulsing-dot { width: 12px; height: 12px; border-radius: 50%; box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.4); animation: pulse 2s infinite; }
    .pulsing-dot.bg-success { background: var(--color-success); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
    .pulsing-dot.bg-warning { background: var(--color-warning); box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); }

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
  `]
})
export class DashboardComponent implements OnInit {

    salesToday$!: Observable<number>;
    productCount$!: Observable<number>;
    lowStockCount$!: Observable<number>;
    showNewSaleModal = false;

    constructor(
        private salesService: SalesService,
        private showcaseService: ShowcaseService,
        private inventoryService: InventoryService
    ) { }

    ngOnInit() {
        this.loadStats();
    }

    async loadStats() {
        this.salesToday$ = this.salesService.getSalesToday();

        this.productCount$ = this.showcaseService.getProducts().pipe(
            map(products => products.length)
        );

        const inventory = await this.inventoryService.getInventory();
        // Since inventory is now an Observable, we need to pipe from it
        this.lowStockCount$ = inventory.pipe(
            map(items => items.filter(item => item.status !== 'En Stock').length)
        );
    }

    toggleNewSaleModal() {
        this.showNewSaleModal = !this.showNewSaleModal;
    }

    refreshStats() {
        this.loadStats();
    }
}
