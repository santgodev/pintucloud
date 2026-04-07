import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { SalesService, Sale } from './services/sales.service';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { SalesCaptureComponent } from './components/sales-capture/sales-capture.component';
import { SupabaseService } from '../../core/services/supabase.service';
import { UiService } from '../../core/services/ui.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
   selector: 'app-sales',
   standalone: true,
   imports: [CommonModule, ReactiveFormsModule, FormsModule, SharedModule, SalesCaptureComponent],
   providers: [DatePipe],
   template: `
    <div class="sales-container p-6 animate-in fade-in duration-500">
       <div class="flex justify-between items-center mb-6">
          <h1 class="text-2xl font-bold text-slate-900">Gestión de Ventas</h1>
          <button *ngIf="!showNewSaleModal" class="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl shadow-sm hover:bg-indigo-700 flex items-center justify-center transition-all" (click)="toggleNewSaleModal()">
            <svg class="mr-2" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Nueva Venta
          </button>
       </div>
       <!-- VISTA DE NUEVA VENTA -->
       <app-sales-capture *ngIf="showNewSaleModal" (onClose)="toggleNewSaleModal()" (saleCompleted)="onSaleCompleted()"></app-sales-capture>
       
       <!-- VISTA DE LISTADO (Solo si no hay Nueva Venta) -->
       <div *ngIf="!showNewSaleModal" class="animate-in fade-in duration-500">
          <!-- Contenedor Principal de Filtros -->
          <div class="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-100">
            <!-- Filtros Avanzados -->
            <div class="mb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
             
             <!-- Búsqueda Debounced -->
             <div class="relative lg:col-span-2">
                <div class="relative w-full">
                   <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35m2.35-5.65a7 7 0 11-14 0 7 7 0 0114 0z"/>
                   </svg>
                   <input type="text" 
                          class="w-full h-10 pl-10 pr-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-all text-sm" 
                          [formControl]="searchControl" 
                          placeholder="Buscar por factura o cliente..." />
                </div>
             </div>

             <!-- Filtro Estado -->
             <div>
                <select [(ngModel)]="filters.estado" (change)="onFilterChange()" class="input-premium w-full">
                   <option value="">Todos los estados</option>
                   <option value="BORRADOR">Borrador</option>
                   <option value="CONFIRMADA">Confirmada</option>
                   <option value="AUTORIZADO">Autorizado</option>
                   <option value="ANULADA">Anulada</option>
                </select>
             </div>

             <!-- Filtro Bodega (Si hay varias) -->
             <div *ngIf="bodegas.length > 1">
                <select [(ngModel)]="filters.bodegaId" (change)="onFilterChange()" class="input-premium w-full">
                   <option value="">Todas las bodegas</option>
                   <option *ngFor="let b of bodegas" [value]="b.id">{{ b.nombre }}</option>
                </select>
             </div>

             <!-- Filtro Asesor (Si es Admin) -->
           <div *ngIf="isAdmin()">
                <select [(ngModel)]="filters.asesorId" (change)="onFilterChange()" class="input-premium w-full">
                   <option value="">Todos los asesores</option>
                   <option *ngFor="let u of asesores" [value]="u.id">{{ u.nombre_completo }}</option>
                </select>
              </div>
           </div>

           <!-- Filtro Rango de Fechas -->
           <div class="mb-4 flex flex-wrap items-start gap-3">
              <div class="flex flex-col gap-1 flex-1 min-w-[130px]">
                 <label class="text-xs font-bold text-muted uppercase tracking-wider">Desde</label>
                 <input type="date" [(ngModel)]="fechaInicio"
                        class="h-10 w-full px-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:outline-none" />
              </div>
              <div class="flex flex-col gap-1 flex-1 min-w-[130px]">
                 <label class="text-xs font-bold text-muted uppercase tracking-wider">Hasta</label>
                 <input type="date" [(ngModel)]="fechaFin"
                        class="h-10 w-full px-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:outline-none" />
              </div>
              <div class="flex gap-2 items-end pt-5">
                 <button (click)="filtrarPorFecha()"
                         [disabled]="!fechaInicio || !fechaFin"
                         class="h-10 px-4 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-all whitespace-nowrap">
                    Filtrar
                 </button>
                 <button *ngIf="fechaInicio || fechaFin" (click)="limpiarFiltro()"
                         class="h-10 px-3 border border-slate-200 text-sm text-slate-500 rounded-lg hover:bg-slate-50 transition-all bg-white whitespace-nowrap">
                    Limpiar
                 </button>
              </div>
           </div>
          </div>


           <!-- Resumen de ventas filtradas -->
           <div class="flex flex-wrap gap-6 mb-4 px-1 text-sm text-slate-700">
             <div class="flex items-center gap-1.5">
               <span class="font-semibold text-slate-500 uppercase text-[11px] tracking-wide">Ventas encontradas:</span>
               <span class="font-bold text-slate-900">{{ totalRecords }}</span>
             </div>
             <div class="flex items-center gap-1.5">
               <span class="font-semibold text-slate-500 uppercase text-[11px] tracking-wide">Total vendido:</span>
               <span class="font-bold text-indigo-700">{{ totalVentasFiltradas | currency:'COP':'symbol-narrow':'1.0-0' }}</span>
             </div>
           </div>
           <!-- Tabla de Resultados -->
          <div class="bg-white rounded-xl border border-slate-200 shadow-sm table-responsive">
              <table class="w-full text-left border-collapse">
                 <thead>
                    <tr class="bg-slate-50 text-muted uppercase text-[10px] tracking-widest font-bold">
                       <th class="p-4 border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap" (click)="sortBy('numero_factura')">
                          <div class="flex items-center gap-1">Factura <span *ngIf="sortField === 'numero_factura'" class="text-indigo-600">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span><span *ngIf="sortField !== 'numero_factura'" class="text-slate-300 opacity-50">↕</span></div>
                       </th>
                       <th class="p-4 border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap" (click)="sortBy('fecha')">
                          <div class="flex items-center gap-1">Fecha <span *ngIf="sortField === 'fecha'" class="text-indigo-600">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span><span *ngIf="sortField !== 'fecha'" class="text-slate-300 opacity-50">↕</span></div>
                       </th>
                       <th class="p-4 border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors" style="min-width: 140px;" (click)="sortBy('clientName')">
                          <div class="flex items-center gap-1">Cliente <span *ngIf="sortField === 'clientName'" class="text-indigo-600">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span><span *ngIf="sortField !== 'clientName'" class="text-slate-300 opacity-50">↕</span></div>
                       </th>
                       <th class="p-4 border-b border-slate-200 whitespace-nowrap">Bodega</th>
                       <th class="p-4 border-b border-slate-200 whitespace-nowrap">Asesor</th>
                       <th class="p-4 border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap" (click)="sortBy('total')">
                          <div class="flex items-center gap-1">Total <span *ngIf="sortField === 'total'" class="text-indigo-600">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span><span *ngIf="sortField !== 'total'" class="text-slate-300 opacity-50">↕</span></div>
                       </th>
                       <th class="p-4 border-b border-slate-200 text-center whitespace-nowrap">Estado</th>
                       <th class="p-4 border-b border-slate-200 text-right whitespace-nowrap">Acciones</th>
                    </tr>
                 </thead>
                 <tbody class="relative">
                    <!-- Loading State -->
                    <tr *ngIf="loading" class="absolute inset-x-0 top-0 h-1 bg-indigo-500/20 animate-pulse"></tr>

                    <tr *ngFor="let sale of paginatedSales" class="border-b border-slate-100 hover:bg-slate-50/50 transition-colors group">
                        <td class="p-4 font-mono text-sm font-bold text-indigo-600 cursor-pointer hover:underline whitespace-nowrap" (click)="verDetalle(sale.id)">
                           {{ formatFactura(sale.numero_factura) }}
                       </td>
                       <td class="p-4 text-sm text-slate-800 whitespace-nowrap">
                           {{ sale.fecha | date:'dd/MM/yyyy' }}
                       </td>
                       <td class="p-4" style="max-width: 160px;">
                           <div class="text-sm font-medium text-slate-900" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" [title]="sale.clientName">{{ sale.clientName }}</div>
                       </td>
                        <td class="p-4 text-sm text-slate-500 whitespace-nowrap">{{ sale.bodegaName }}</td>
                        <td class="p-4 text-sm text-slate-600 whitespace-nowrap">
                            {{ sale.vendedorName }}
                        </td>
                       <td class="p-4 font-bold text-slate-900 whitespace-nowrap">
                           \${{ sale.total | number: '1.0-0' }}
                       </td>
                       <td class="p-4 text-center">
                           <span class="badge-premium" 
                               [class.authorized]="sale.estado === 'AUTORIZADO'"
                               [class.success]="sale.estado === 'CONFIRMADA'"
                               [class.warning]="sale.estado === 'BORRADOR'"
                               [class.danger]="sale.estado === 'ANULADA'">
                               <span *ngIf="sale.estado === 'AUTORIZADO'">★ </span>
                               <span *ngIf="sale.estado === 'CONFIRMADA'">✔ </span>
                               <span *ngIf="sale.estado === 'BORRADOR'">⏳ </span>
                               <span *ngIf="sale.estado === 'ANULADA'">✖ </span>
                               {{ sale.estado }}
                           </span>
                       </td>
                       <td class="p-4 text-right">
                           <div class="flex justify-end gap-2">
                               <!-- EDITAR -->
                                <button *ngIf="sale.estado !== 'ANULADA' && sale.estado !== 'AUTORIZADO' && isAdmin()" 
                                        (click)="editarVenta(sale)" 
                                       class="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-all" 
                                        title="Editar">
                                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                       <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                       <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                   </svg>
                               </button>
                               

                               <!-- VER (Siempre visible) -->
                               <button (click)="verDetalle(sale.id)" 
                                       class="p-2 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-lg transition-all" 
                                       title="Ver Factura">
                                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                       <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                       <circle cx="12" cy="12" r="3"></circle>
                                   </svg>
                               </button>

                           </div>
                       </td>
                    </tr>
                    <tr *ngIf="!loading && sales.length === 0">
                        <td colspan="7" class="text-center p-12 text-muted italic bg-slate-50/50">
                           No se encontraron ventas con los filtros seleccionados.
                        </td>
                    </tr>
                 </tbody>
              </table>

              <!-- Footer con Paginación -->
              <div class="bg-slate-50/80 p-4 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
                 <div class="text-[12px] text-muted">
                    Mostrando <span class="font-bold text-slate-900">{{ (page * pageSize) + 1 }}</span> al 
                    <span class="font-bold text-slate-900">{{ Math.min((page + 1) * pageSize, totalRecords) }}</span> 
                    de <span class="font-bold text-slate-900">{{ totalRecords }}</span> ventas
                 </div>
                 
                 <div class="flex items-center gap-3">
                    <button (click)="previousPage()" 
                            [disabled]="page === 0 || loading"
                            class="btn-nav">
                       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                           <path d="M15 18l-6-6 6-6"/>
                       </svg>
                       Anterior
                    </button>

                    <div class="flex gap-1 items-center">
                        <span class="min-w-[32px] h-8 flex items-center justify-center bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-sm">{{ page + 1 }}</span>
                        <span class="text-muted text-[11px] font-medium px-2 uppercase tracking-tighter">de {{ totalPages }}</span>
                    </div>

                    <button (click)="nextPage()" 
                            [disabled]="(page + 1) * pageSize >= totalRecords || loading"
                            class="btn-nav">
                       Siguiente
                       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                           <path d="M9 18l6-6-6-6"/>
                       </svg>
                    </button>
                 </div>
              </div>
          </div>
       </div>
    </div>


   `,
   styles: [`
    .sales-container {
        background: #fff;
    }
    .text-indigo-600 { color: #4f46e5; }
    .text-muted { color: var(--color-text-muted); }
    
    .badge-premium { 
        @apply px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider shadow-sm;
    }
    .authorized { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
    .success { background: #fef9c3; color: #854d0e; border: 1px solid #fef08a; }
    .warning { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
    .danger { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
    
    .btn-nav { 
        @apply px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-all shadow-sm;
    }
    .input-premium {
        @apply bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition-all shadow-sm;
    }
  `]
})
export class SalesComponent implements OnInit {
   sales: any[] = [];
   totalRecords = 0;
   totalVentasFiltradas: number = 0;
   loading = false;
   page = 0;
   pageSize = 10;
   showNewSaleModal = false;

   private authService = inject(AuthService);
   isAdmin = this.authService.isAdmin;
   private salesService = inject(SalesService);
   private supabase = inject(SupabaseService);
   private router = inject(Router);
   private route = inject(ActivatedRoute);
   private uiService = inject(UiService);


   searchControl = new FormControl('');
   filters = {
      search: '',
      estado: '' as any,
      fechaDesde: '',
      fechaHasta: '',
      asesorId: '',
      bodegaId: ''
   };

   // Para los dropdowns de filtros
   bodegas: any[] = [];
   asesores: any[] = [];
   Math = Math; // Para usar en el template

   // Filtro por rango de fechas
   fechaInicio: string = '';
   fechaFin: string = '';

   // Ordenamiento
   sortField: string = 'fecha';
   sortDirection: 'asc' | 'desc' = 'desc';

   constructor() { }

   toggleNewSaleModal() {
      this.showNewSaleModal = !this.showNewSaleModal;
   }

   onSaleCompleted() {
      this.showNewSaleModal = false;
      this.loadSales();
   }


   async ngOnInit() {
      this.uiService.setLoading(true);
      try {
         // Ya no necesitamos checkUserRole manual, usamos el signal centralizado del AuthService

         const { data } = await this.supabase.auth.getUser();
         console.log('AUTH USER ID:', data?.user?.id);

         this.searchControl.valueChanges
            .pipe(
               debounceTime(400),
               distinctUntilChanged()
            )
            .subscribe(value => {
               this.page = 0;
               this.loadSales();
            });

         // Leer parámetros de consulta para filtros automáticos
         this.route.queryParams.subscribe(params => {
            if (params['today']) {
               const today = new Date();
               const fechaLocal =
                  today.getFullYear() + '-' +
                  String(today.getMonth() + 1).padStart(2, '0') + '-' +
                  String(today.getDate()).padStart(2, '0');

               this.filters.fechaDesde = fechaLocal;
               this.filters.fechaHasta = fechaLocal;
               this.fechaInicio = fechaLocal;
               this.fechaFin = fechaLocal;
               this.loadSales();
            }
         });

         await this.loadInitialData();
         await this.loadSales();
      } catch (err) {
         console.error('Error in ngOnInit sales:', err);
         this.uiService.setLoading(false);
      }
   }


   async loadInitialData() {
      if (this.isAdmin()) {
         const { data: bods } = await this.supabase.from('bodegas').select('*').order('nombre');
         this.bodegas = bods || [];

         const { data: users } = await this.supabase.from('usuarios').select('*').order('nombre_completo');
         this.asesores = users || [];
      }
   }

   async loadSales() {
      this.loading = true;
      this.uiService.setLoading(true);
      try {
         // Asegurar que el search esté actualizado del control
         this.filters.search = this.searchControl.value || '';

         const result = await this.salesService.getSales({
            page: this.page,
            pageSize: this.pageSize,
            sortField: this.sortField,
            sortDirection: this.sortDirection,
            ...this.filters
         });
         this.sales = result.data as any;
         this.totalRecords = result.total;

         // Obtener el total global filtrado desde la base de datos
         const { data: totalGlobal, error: errorTotal } = await this.supabase.rpc('ventas_total_filtrado', {
            p_estado: this.filters.estado || null,
            p_fecha_desde: this.filters.fechaDesde || null,
            p_fecha_hasta: this.filters.fechaHasta || null
         });

         if (errorTotal) {
            console.error('Error al obtener total filtrado:', errorTotal);
            // Fallback al cálculo local si falla el RPC (aunque solo sume la página actual)
            this.totalVentasFiltradas = result.data.reduce(
               (sum: number, sale: any) => sum + Number(sale.total || 0), 0
            );
         } else {
            this.totalVentasFiltradas = totalGlobal || 0;
         }
      } catch (err) {
         console.error('Error loading sales', err);
      } finally {
         this.loading = false;
         this.uiService.setLoading(false);
      }
   }

   onFilterChange() {
      this.page = 0;
      this.loadSales();
   }

   sortBy(field: string) {
      if (this.sortField === field) {
         this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
         this.sortField = field;
         this.sortDirection = 'asc';
      }
      this.page = 0;
      this.loadSales();
   }

   filtrarPorFecha() {
      if (!this.fechaInicio || !this.fechaFin) return;
      this.filters.fechaDesde = this.fechaInicio;
      this.filters.fechaHasta = this.fechaFin;
      this.page = 0;
      this.loadSales();
   }

   limpiarFiltro() {
      this.fechaInicio = '';
      this.fechaFin = '';
      this.filters.fechaDesde = '';
      this.filters.fechaHasta = '';
      this.page = 0;
      this.loadSales();
   }

   nextPage() {
      if ((this.page + 1) * this.pageSize < this.totalRecords) {
         this.page++;
         this.loadSales();
      }
   }

   previousPage() {
      if (this.page > 0) {
         this.page--;
         this.loadSales();
      }
   }

   get totalItems(): number {
      return this.totalRecords;
   }

   get paginatedSales(): any[] {
      return this.sales;
   }

   get totalPages(): number {
      return Math.ceil(this.totalRecords / this.pageSize);
   }

   formatFactura(num: number | null) {
      return num ? `#${num.toString().padStart(6, '0')}` : '—';
   }



   refreshSales() {
      this.page = 0;
      this.loadSales();
   }


    // Acciones
   async editarVenta(sale: any) {
      if (sale.estado === 'BORRADOR') {
         this.router.navigate(['/sales', sale.id, 'edit']);
         return;
      }

      if (sale.estado === 'CONFIRMADA') {
         if (!this.isAdmin()) {
            this.router.navigate(['/sales', sale.id, 'invoice']);
            return;
         }
         try {
            await this.salesService.revertirVenta(sale.id);
            this.router.navigate(['/sales', sale.id, 'edit']);
         } catch (err) {
            console.error('[Sales] Error al revertir venta:', err);
         }
         return;
      }

      // ANULADA
      this.router.navigate(['/sales', sale.id, 'invoice']);
   }

   verDetalle(id: string) {
      this.router.navigate(['/sales', id, 'invoice']);
   }
}
