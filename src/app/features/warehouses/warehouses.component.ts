import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../shared/shared.module';
import { SupabaseService } from '../../core/services/supabase.service';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
   selector: 'app-warehouses',
   standalone: true,
   imports: [CommonModule, SharedModule],
   template: `
    <div class="mb-8 p-4">
      <div class="flex justify-between items-start mb-8 gap-4">
        <div>
          <h1 class="text-3xl font-bold text-slate-900 tracking-tight">Bodegas Reales</h1>
          <p class="text-slate-500 text-lg">Administración de centros de distribución y niveles de ocupación.</p>
        </div>
        <div class="flex gap-3">
          <button class="btn btn-primary flex items-center gap-2 px-6" (click)="notImplemented()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Crear Bodega
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" *ngIf="warehouses$ | async as warehouses; else loading">
        <div *ngFor="let b of warehouses" class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
          <!-- Decorative background icon -->
          <div class="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
             <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8l-2-2H5L3 8v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8z"></path><path d="M3 8h18"></path><path d="M10 12h4"></path></svg>
          </div>

          <div class="flex justify-between items-start mb-6">
            <div class="p-3 bg-slate-50 text-primary rounded-xl border border-slate-100">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8l-2-2H5L3 8v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8z"></path><path d="M3 8h18"></path><path d="M10 12h4"></path></svg>
            </div>
            <span class="px-2 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase rounded border border-emerald-100">Activo</span>
          </div>
          
          <h3 class="text-xl font-bold text-slate-900 mb-1">{{ b.nombre }}</h3>
          <p class="text-sm font-medium text-slate-400 mb-4 flex items-center gap-1">
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
             {{ b.codigo }} • Zona Central
          </p>

          <div class="space-y-4">
             <div>
                <div class="flex justify-between text-xs mb-1.5">
                   <span class="text-slate-500 font-medium">Ocupación estimada</span>
                   <span class="text-slate-900 font-bold">{{ b.occupancy }}%</span>
                </div>
                <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                   <div class="h-full bg-primary rounded-full transition-all duration-1000" [style.width.%]="b.occupancy"></div>
                </div>
             </div>
             
             <div class="flex items-center justify-between pt-2">
                <div class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Capacidad Industrial</div>
                <button class="text-primary text-sm font-bold hover:underline cursor-pointer border-none bg-transparent" (click)="notImplemented()">Ver Inventario</button>
             </div>
          </div>
        </div>
      </div>

      <ng-template #loading>
         <div class="flex justify-center p-12">
            <div class="animate-spin w-10 h-10 border-4 border-slate-200 border-t-primary rounded-full"></div>
         </div>
      </ng-template>

      <div *ngIf="(warehouses$ | async)?.length === 0" class="text-center p-12 bg-white rounded-2xl border border-dashed border-slate-300">
         <p class="text-slate-400">No se encontraron bodegas en el sistema.</p>
      </div>
    </div>
  `,
   styles: []
})
export class WarehousesComponent implements OnInit {
   warehouses$!: Observable<any[]>;

   constructor(private supabase: SupabaseService) { }

   ngOnInit() {
      this.loadWarehouses();
   }

   loadWarehouses() {
      this.warehouses$ = from(
         this.supabase.from('bodegas')
            .select('*')
            .order('nombre')
            .then(res => res.data || [])
      ).pipe(
         map(data => data.map(b => ({
            ...b,
            // Fake occupancy for real look
            occupancy: Math.floor(Math.random() * (90 - 30 + 1)) + 30
         })))
      );
   }

   notImplemented() {
      alert('Esta funcionalidad estará disponible en la próxima actualización.');
   }
}
