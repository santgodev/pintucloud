import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { SalesService, Sale } from './services/sales.service';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { SalesCaptureComponent } from './components/sales-capture/sales-capture.component';
import { SupabaseService } from '../../core/services/supabase.service';

@Component({
   selector: 'app-sales',
   standalone: true,
   imports: [CommonModule, ReactiveFormsModule, FormsModule, SharedModule, SalesCaptureComponent],
   template: `
    <div class="sales-container p-6 animate-in fade-in duration-500">
       <div class="flex justify-between items-center mb-6">
          <h1 class="text-2xl font-bold text-slate-900">Gestión de Ventas</h1>
          <button class="px-6 py-2.5 bg-indigo-600 text-white rounded-xl shadow-sm hover:bg-indigo-700 flex items-center justify-center gap-2 transition-all" (click)="toggleNewSaleModal()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Nueva Venta
          </button>
       </div>
       
       <!-- Filtros Avanzados -->
       <div class="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          
          <!-- Búsqueda Debounced -->
          <div class="relative lg:col-span-2">
             <div class="relative w-full">
                <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35m2.35-5.65a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                <input type="text" 
                       class="w-full h-10 pl-10 pr-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-all text-sm" 
                       [formControl]="searchControl" 
                       (keyup.enter)="loadSales()"
                       placeholder="Buscar por factura o cliente..." />
             </div>
          </div>

          <!-- Filtro Estado -->
          <div>
             <select [(ngModel)]="filters.estado" (change)="onFilterChange()" class="input-premium w-full">
                <option value="">Todos los estados</option>
                <option value="BORRADOR">Borrador</option>
                <option value="CONFIRMADA">Confirmada</option>
                <option value="ANULADA">Anulada</option>
             </select>
          </div>

          <!-- Filtro Bodega (Si es Admin) -->
          <div *ngIf="isAdmin">
             <select [(ngModel)]="filters.bodegaId" (change)="onFilterChange()" class="input-premium w-full">
                <option value="">Todas las bodegas</option>
                <option *ngFor="let b of bodegas" [value]="b.id">{{ b.nombre }}</option>
             </select>
          </div>

          <!-- Filtro Asesor (Si es Admin) -->
          <div *ngIf="isAdmin">
             <select [(ngModel)]="filters.asesorId" (change)="onFilterChange()" class="input-premium w-full">
                <option value="">Todos los asesores</option>
                <option *ngFor="let u of asesores" [value]="u.id">{{ u.nombre_completo }}</option>
             </select>
           </div>
        </div>

        <!-- Filtro Rango de Fechas -->
        <div class="mb-4 flex flex-wrap items-center gap-3">
           <div class="flex items-center gap-2">
              <label class="text-xs font-bold text-muted uppercase tracking-wider whitespace-nowrap">Desde</label>
              <input type="date" [(ngModel)]="fechaInicio"
                     class="h-10 px-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:outline-none" />
           </div>
           <div class="flex items-center gap-2">
              <label class="text-xs font-bold text-muted uppercase tracking-wider whitespace-nowrap">Hasta</label>
              <input type="date" [(ngModel)]="fechaFin"
                     class="h-10 px-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:outline-none" />
           </div>
           <button (click)="filtrarPorFecha()"
                   [disabled]="!fechaInicio || !fechaFin"
                   class="h-10 px-4 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-all">
              Filtrar por fecha
           </button>
           <button *ngIf="isFiltering || fechaInicio || fechaFin" (click)="limpiarFiltro()"
                   class="h-10 px-3 border border-slate-200 text-sm text-slate-500 rounded-lg hover:bg-slate-50 transition-all">
              Limpiar
           </button>
        </div>

        <!-- Tabla de Resultados -->
       <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
           <table class="w-full text-left border-collapse">
              <thead>
                 <tr class="bg-slate-50 text-muted uppercase text-[10px] tracking-widest font-bold">
                    <th class="p-4 border-b border-slate-200">Factura</th>
                    <th class="p-4 border-b border-slate-200">Fecha</th>
                    <th class="p-4 border-b border-slate-200">Cliente</th>
                    <th class="p-4 border-b border-slate-200">Asesor</th>
                    <th class="p-4 border-b border-slate-200">Total</th>
                    <th class="p-4 border-b border-slate-200 text-center">Estado</th>
                    <th class="p-4 border-b border-slate-200 text-right">Acciones</th>
                 </tr>
              </thead>
              <tbody class="relative">
                 <!-- Loading State -->
                 <tr *ngIf="loading" class="absolute inset-x-0 top-0 h-1 bg-indigo-500/20 animate-pulse"></tr>

                 <tr *ngFor="let sale of paginatedSales" class="border-b border-slate-100 hover:bg-slate-50/50 transition-colors group">
                     <td class="p-4 font-mono text-sm font-bold text-indigo-600">
                        {{ formatFactura(sale.numero_factura) }}
                    </td>
                    <td class="p-4 text-sm text-slate-800">
                        {{ formatFecha(sale.fecha) }}
                    </td>
                    <td class="p-4">
                        <div class="text-sm font-medium text-slate-900">{{ sale.clientName }}</div>
                    </td>
                    <td class="p-4 text-sm text-slate-600">
                        {{ sale.vendedorName }}
                    </td>
                    <td class="p-4 font-bold text-slate-900">
                        {{ sale.total | currency:'COP':'symbol-narrow':'1.0-0' }}
                    </td>
                    <td class="p-4 text-center">
                        <span class="badge-premium" 
                            [class.success]="sale.estado === 'CONFIRMADA'"
                            [class.warning]="sale.estado === 'BORRADOR'"
                            [class.danger]="sale.estado === 'ANULADA'">
                            {{ sale.estado | titlecase }}
                        </span>
                    </td>
                    <td class="p-4 text-right">
                        <div class="flex justify-end gap-1">
                            <!-- EDITAR -->
                             <button *ngIf="sale.estado !== 'ANULADA'" 
                                     (click)="editarVenta(sale)" 
                                    class="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" 
                                     title="Editar">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                            </button>
                            
                            <!-- VER (Siempre visible) -->
                            <button (click)="verDetalle(sale.id)" 
                                    class="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" 
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

    <!-- New Sale Modal -->
    <app-sales-capture *ngIf="showNewSaleModal" (onClose)="toggleNewSaleModal()" (saleCompleted)="refreshSales()"></app-sales-capture>
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
    .success { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
    .warning { background: #fef9c3; color: #854d0e; border: 1px solid #fef08a; }
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
   loading = false;
   page = 0;
   pageSize = 10;
   showNewSaleModal = false;

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
   isAdmin = false;
   Math = Math; // Para usar en el template

   // Filtro por rango de fechas
   fechaInicio: string = '';
   fechaFin: string = '';
   isFiltering: boolean = false;
   filteredSales: any[] = [];

   constructor(
      private salesService: SalesService,
      private supabase: SupabaseService,
      private router: Router
   ) { }

   async ngOnInit() {
      await this.checkUserRole();

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

      await this.loadInitialData();
      await this.loadSales();
   }

   async checkUserRole() {
      const user = await this.supabase.auth.getUser();
      const userId = user.data.user?.id;
      if (userId) {
         const { data } = await this.supabase.from('usuarios').select('rol').eq('id', userId).single();
         this.isAdmin = data?.rol === 'admin_distribuidor';
      }
   }

   async loadInitialData() {
      if (this.isAdmin) {
         const { data: bods } = await this.supabase.from('bodegas').select('*').order('nombre');
         this.bodegas = bods || [];

         const { data: users } = await this.supabase.from('usuarios').select('*').order('nombre_completo');
         this.asesores = users || [];
      }
   }

   async loadSales() {
      this.loading = true;
      try {
         // Asegurar que el search esté actualizado del control
         this.filters.search = this.searchControl.value || '';

         const result = await this.salesService.getSales({
            page: this.page,
            pageSize: this.pageSize,
            ...this.filters
         });
         this.sales = result.data as any;
         this.totalRecords = result.total;
      } catch (err) {
         console.error('Error loading sales', err);
      } finally {
         this.loading = false;
      }
   }

   onFilterChange() {
      this.page = 0;
      this.loadSales();
   }

   async filtrarPorFecha() {
      if (!this.fechaInicio || !this.fechaFin) return;
      this.loading = true;
      this.page = 0;
      this.isFiltering = true;
      const { data, error } = await this.salesService.getSalesByDateRange(
         this.fechaInicio, this.fechaFin
      );
      this.loading = false;
      if (!error && data) {
         this.filteredSales = (data as any[]).map((item: any) => ({
            ...item,
            clientName: item.cliente?.razon_social || 'Cliente Desconocido'
         }));
      }
   }

   limpiarFiltro() {
      this.fechaInicio = '';
      this.fechaFin = '';
      this.isFiltering = false;
      this.filteredSales = [];
      this.page = 0;
      this.loadSales();
   }

   nextPage() {
      if (this.isFiltering) {
         if ((this.page + 1) * this.pageSize < this.filteredSales.length) this.page++;
      } else {
         if ((this.page + 1) * this.pageSize < this.totalRecords) {
            this.page++;
            this.loadSales();
         }
      }
   }

   previousPage() {
      if (this.page > 0) {
         this.page--;
         if (!this.isFiltering) this.loadSales();
      }
   }

   get totalItems(): number {
      return this.isFiltering ? this.filteredSales.length : this.totalRecords;
   }

   get paginatedSales(): any[] {
      if (this.isFiltering) {
         const start = this.page * this.pageSize;
         return this.filteredSales.slice(start, start + this.pageSize);
      }
      return this.sales;
   }

   get totalPages(): number {
      return Math.ceil(this.totalItems / this.pageSize);
   }

   formatFactura(num: number | null) {
      return num ? `#${num.toString().padStart(6, '0')}` : '—';
   }

   formatFecha(fecha: string) {
      // Parseamos manualmente para evitar conversión UTC→local que retrocede un día
      const [anio, mes, dia] = fecha.split('T')[0].split('-').map(Number);
      const date = new Date(anio, mes - 1, dia); // mes-1 porque Date usa 0-based
      const diaStr = date.getDate().toString().padStart(2, '0');
      const mesStr = date.toLocaleString('es-CO', { month: 'short' }).replace('.', '').toLowerCase();
      return `${diaStr}-${mesStr}-${anio}`;
   }

   toggleNewSaleModal() {
      this.showNewSaleModal = !this.showNewSaleModal;
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
         if (!this.isAdmin) {
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
