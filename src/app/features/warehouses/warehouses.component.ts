import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SharedModule } from '../../shared/shared.module';
import { WarehousesService } from './services/warehouses.service';
import { Observable } from 'rxjs';

@Component({
   selector: 'app-warehouses',
   standalone: true,
   imports: [CommonModule, SharedModule, ReactiveFormsModule],
   template: `
    <div class="mb-8 p-4">
      <div class="flex justify-between items-start mb-8 gap-4">
        <div>
          <h1 class="text-3xl font-bold text-slate-900 tracking-tight">Bodegas</h1>
          <p class="text-slate-500 text-lg">Administración de centros de distribución y niveles de ocupación.</p>
        </div>
        <div class="flex gap-3">
          <button class="btn btn-primary flex items-center gap-2 px-6" (click)="abrirFormulario()">
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
            <span class="px-2 py-1 text-[10px] font-bold uppercase rounded border"
              [class]="b.activo ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-100 text-slate-400 border-slate-200'">
              {{ b.activo ? 'Activa' : 'Inactiva' }}
            </span>
          </div>
          
          <h3 class="text-xl font-bold text-slate-900 mb-1">{{ b.nombre }}</h3>
          <p class="text-sm font-medium text-slate-400 mb-4 flex items-center gap-1">
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
             {{ b.codigo }}<span *ngIf="b.direccion"> &bull; {{ b.direccion }}</span>
          </p>

          <div class="space-y-4">
             <div>
                <div class="flex justify-between text-xs mb-1.5">
                   <span class="text-slate-500 font-medium">Productos distintos</span>
                   <span class="text-slate-900 font-bold">{{ b.productos_distintos ?? 0 }}</span>
                </div>
                <div class="flex justify-between text-xs">
                   <span class="text-slate-500 font-medium">Unidades totales</span>
                   <span class="text-slate-900 font-bold">{{ b.total_unidades ?? 0 }}</span>
                </div>
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

    <!-- ─── Modal: Crear Bodega ─── -->
    <div *ngIf="mostrarFormulario" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white border border-slate-200 rounded-xl w-full max-w-lg shadow-2xl">
        
        <div class="p-5 border-b border-slate-200 flex justify-between items-center">
          <h2 class="text-xl font-bold text-slate-900">Nueva Bodega</h2>
          <button (click)="cerrarFormulario()" class="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <form [formGroup]="warehouseForm" (ngSubmit)="crearBodega()" class="p-6 space-y-5 text-left">

          <div>
            <label class="block text-sm font-bold text-slate-700 mb-1.5">Nombre de la Bodega *</label>
            <input formControlName="nombre" type="text" class="input-premium w-full" placeholder="Ej. Bodega Central Norte">
            <p *ngIf="warehouseForm.get('nombre')?.invalid && warehouseForm.get('nombre')?.touched"
               class="text-red-500 text-xs mt-1">El nombre es obligatorio.</p>
          </div>

          <div>
            <label class="block text-sm font-bold text-slate-700 mb-1.5">Código *</label>
            <input formControlName="codigo" type="text" class="input-premium w-full" placeholder="Ej. BOD-002">
            <p *ngIf="warehouseForm.get('codigo')?.invalid && warehouseForm.get('codigo')?.touched"
               class="text-red-500 text-xs mt-1">El código es obligatorio.</p>
          </div>

          <div>
            <label class="block text-sm font-bold text-slate-700 mb-1.5">Dirección <span class="text-slate-400 font-normal">(opcional)</span></label>
            <input formControlName="direccion" type="text" class="input-premium w-full" placeholder="Ej. Calle 45 #12-34, Bogotá">
          </div>

          <div *ngIf="errorCreacion" class="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {{ errorCreacion }}
          </div>

          <div class="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button type="button" (click)="cerrarFormulario()" class="btn btn-outline" [disabled]="isCreating">Cancelar</button>
            <button type="submit" [disabled]="warehouseForm.invalid || isCreating"
              class="btn btn-primary flex items-center gap-2 px-8 min-w-[140px] justify-center">
              <span *ngIf="isCreating" class="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></span>
              {{ isCreating ? 'Creando...' : 'Crear Bodega' }}
            </button>
          </div>

        </form>
      </div>
    </div>
  `,
   styles: []
})
export class WarehousesComponent implements OnInit {
   warehouses$!: Observable<any[]>;
   mostrarFormulario = false;
   isCreating = false;
   errorCreacion: string | null = null;
   warehouseForm: FormGroup;

   constructor(
      private warehousesService: WarehousesService,
      private fb: FormBuilder
   ) {
      this.warehouseForm = this.fb.group({
         nombre: ['', Validators.required],
         codigo: ['', Validators.required],
         direccion: ['']
      });
   }

   ngOnInit() {
      this.loadWarehouses();
   }

   loadWarehouses() {
      this.warehouses$ = this.warehousesService.getWarehouses();
   }

   abrirFormulario() {
      this.warehouseForm.reset();
      this.errorCreacion = null;
      this.mostrarFormulario = true;
   }

   cerrarFormulario() {
      this.mostrarFormulario = false;
   }

   async crearBodega() {
      if (this.warehouseForm.invalid) return;
      this.isCreating = true;
      this.errorCreacion = null;

      const { nombre, codigo, direccion } = this.warehouseForm.value;

      const { error } = await this.warehousesService.createWarehouse(
         nombre.trim(),
         codigo.trim().toUpperCase(),
         direccion?.trim() || null
      );

      if (error) {
         this.errorCreacion = error.message;
         this.isCreating = false;
         return;
      }

      this.isCreating = false;
      this.cerrarFormulario();
      this.loadWarehouses();
   }
}
