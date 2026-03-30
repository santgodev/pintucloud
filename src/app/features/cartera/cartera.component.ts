import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormControl, FormGroup, AbstractControl } from '@angular/forms';
import { SharedModule } from '../../shared/shared.module';
import { CarteraService, CarteraItem } from './services/cartera.service';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import * as XLSX from 'xlsx';
import { SupabaseService } from '../../core/services/supabase.service';
import { AuthService } from '../../core/services/auth.service';
import { UiService } from '../../core/services/ui.service';

@Component({
    selector: 'app-cartera',
    standalone: true,
    imports: [CommonModule, SharedModule, ReactiveFormsModule, FormsModule],
    template: `
    <div class="cartera-container p-6 animate-in fade-in duration-500">
       <div class="flex justify-between items-center mb-6">
          <h1 class="text-2xl font-bold text-slate-900">Cuentas por Cobrar (Cartera)</h1>
       </div>
       
       <!-- Contenedor Principal de Filtros -->
       <div class="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-100">
         <!-- Filtros Avanzados -->
         <div class="mb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <!-- Búsqueda Debounced -->
          <div class="relative lg:col-span-2">
             <div class="relative w-full">
                <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35m2.35-5.65a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                <input type="text" 
                       class="w-full h-10 pl-10 pr-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-all text-sm" 
                       [formControl]="searchControl" 
                       placeholder="Buscar cliente o factura..." />
             </div>
          </div>

          <!-- Filtro Estado -->
          <div>
             <select [(ngModel)]="filters.estado" (change)="onFilterChange()" class="input-premium w-full">
                <option value="">Todos los estados</option>
                <option value="PENDIENTE">Pendiente</option>
                <option value="PARCIAL">Parcial</option>
                <option value="VENCIDA">Vencida</option>
                <option value="PAGADA">Pagada</option>
                <option value="ANULADA">Anulada</option>
             </select>
          </div>

          <!-- Filtro Asesor -->
          <div>
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
           <div class="flex gap-2">
           <button (click)="exportarCartera()" class="h-10 px-4 border border-slate-200 text-sm font-medium text-slate-700 rounded-lg hover:bg-slate-50 transition-all bg-white flex items-center gap-2">
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
             Exportar cartera
           </button>
           <button (click)="filtrarPorFecha()"
                   [disabled]="!fechaInicio || !fechaFin"
                   class="h-10 px-4 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-all">
              Filtrar
           </button>
           <button *ngIf="fechaInicio || fechaFin" (click)="limpiarFiltro()"
                   class="h-10 px-3 border border-slate-200 text-sm text-slate-500 rounded-lg hover:bg-slate-50 transition-all bg-white">
              Limpiar
           </button>
        </div>
       </div>

       <!-- Resumen de cartera filtradas -->
       <div class="flex flex-wrap gap-6 mb-4 px-1 text-sm text-slate-700">
         <div class="flex items-center gap-1.5">
           <span class="font-semibold text-slate-500 uppercase text-[11px] tracking-wide">Documentos pendientes:</span>
           <span class="font-bold text-slate-900">{{ documentosPendientes }}</span>
         </div>
         <div class="flex items-center gap-1.5">
           <span class="font-semibold text-slate-500 uppercase text-[11px] tracking-wide">Total cartera:</span>
           <span class="font-bold text-red-600">{{ totalCarteraFiltrada | currency:'COP':'symbol-narrow':'1.0-0' }}</span>
         </div>
       </div>

       <!-- Tabla de Resultados -->
       <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
           <table class="w-full text-left border-collapse">
              <thead>
                 <tr class="bg-slate-50 text-muted uppercase text-[10px] tracking-widest font-bold">
                    <th class="p-4 border-b border-slate-200">Factura</th>
                    <th class="p-4 border-b border-slate-200">Cliente</th>
                    <th class="p-4 border-b border-slate-200">Fecha</th>
                    <th class="p-4 border-b border-slate-200 text-right">TOTAL</th>
                    <th class="p-4 border-b border-slate-200 text-right">SALDO</th>
                    <th class="p-4 border-b border-slate-200 w-[140px] text-center">Vencimiento</th>
                    <th class="p-4 border-b border-slate-200 text-center">Estado</th>
                    <th class="p-4 border-b border-slate-200 text-right">Acciones</th>
                 </tr>
              </thead>
              <tbody class="relative">
                 <!-- Loading State -->
                 <tr *ngIf="loading" class="absolute inset-x-0 top-0 h-1 bg-indigo-500/20 animate-pulse"></tr>

                 <tr *ngFor="let item of carteras" class="border-b border-slate-100 hover:bg-slate-50/50 transition-colors group">
                     <td class="p-4 font-mono text-sm font-bold text-indigo-600">
                        {{ formatFactura(item.numero_factura) }}
                    </td>
                    <td class="p-4">
                        <div class="text-sm font-medium text-slate-900">{{ item.cliente }}</div>
                    </td>
                    <td class="p-4 text-sm text-slate-800">
                        {{ formatFechaColombia(item.fecha) }}
                    </td>
                    <td class="p-4 text-right font-medium">
                        {{ item.total_factura | currency:'COP':'symbol':'1.0-0' }}
                    </td>
                    <td class="p-4 text-right font-semibold text-red-600">
                        {{ item.saldo_pendiente | currency:'COP':'symbol':'1.0-0' }}
                    </td>                     <td class="p-4 text-sm text-slate-800 text-center">
                        {{ item.fecha_vencimiento | date:'dd-MMM-yyyy' | lowercase }}
                    </td>
                    <td class="p-4 text-center">
                        <span class="badge-premium" 
                            [class.info]="getDisplayEstado(item) === 'PENDIENTE'"
                            [class.warning]="getDisplayEstado(item) === 'PARCIAL'"
                            [class.danger]="getDisplayEstado(item) === 'VENCIDA'"
                            [class.success]="getDisplayEstado(item) === 'PAGADO' || item.saldo_pendiente === 0"
                            [class.neutral]="getDisplayEstado(item) === 'ANULADA'">
                            {{ getDisplayEstado(item) }}
                        </span>
                    </td>
                    <td class="p-4 text-right">
                        <div class="flex justify-end gap-2">
                            <!-- Registrar Pago (Solo Admins/Distribuidores) -->
                            <button *ngIf="isAdmin"
                                    (click)="registrarPago(item)"
                                    [disabled]="item.saldo_pendiente <= 0 || item.estado === 'PAGADO'"
                                    class="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-lg hover:bg-indigo-100 transition-all border border-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed" 
                                    title="Registrar Pago">
                                Registrar pago
                            </button>
                            
                            <!-- Ver Pagos -->
                            <button (click)="openPagosModal(item)"
                                    class="px-3 py-1.5 bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-100 transition-all border border-slate-200" 
                                    title="Ver Historial de Pagos">
                                Ver pagos
                            </button>
                        </div>
                    </td>
                 </tr>
                 <tr *ngIf="!loading && carteras.length === 0">
                     <td colspan="8" class="text-center p-12 text-muted italic bg-slate-50/50">
                        No hay cuentas por cobrar pendientes.
                     </td>
                 </tr>
              </tbody>
           </table>
       </div>
    </div>

    <!-- Modal Registrar Pago -->
    <div *ngIf="showPagoModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <!-- Header -->
            <div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 class="text-lg font-bold text-slate-800">Registrar Pago</h3>
                <button (click)="cerrarModalPago()" class="text-slate-400 hover:text-slate-600 transition-colors">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
            
            <!-- Body -->
            <div class="p-6">
                <div class="mb-5 space-y-3">
                    <div class="flex justify-between items-center text-sm">
                        <span class="text-slate-500 font-medium">Factura:</span>
                        <span class="font-bold text-indigo-700 font-mono">{{ formatFactura(pagoDoc?.numero_factura) }}</span>
                    </div>
                    <div class="flex justify-between items-center text-sm">
                        <span class="text-slate-500 font-medium">Cliente:</span>
                        <span class="font-semibold text-slate-800 text-right">{{ pagoDoc?.cliente }}</span>
                    </div>
                    <div class="flex justify-between items-center text-sm p-3 bg-red-50 rounded-lg border border-red-100 mt-2">
                        <span class="text-red-600 font-bold">Saldo Pendiente:</span>
                        <span class="font-bold text-red-700 text-lg">{{ pagoDoc?.saldo_pendiente | currency:'COP':'symbol':'1.0-0' }}</span>
                    </div>
                </div>

                <!-- Formulario -->
                <form [formGroup]="pagoForm" (ngSubmit)="procesarPago()" class="space-y-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Monto a pagar</label>
                        <div class="relative">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">$</span>
                            <input type="number" formControlName="monto" 
                                   class="w-full h-11 pl-8 pr-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition-all font-semibold text-slate-800" 
                                   placeholder="0" step="any">
                        </div>
                        <div *ngIf="pagoForm.get('monto')?.invalid && pagoForm.get('monto')?.touched" class="text-xs text-red-500 mt-1 font-medium">
                            <span *ngIf="pagoForm.get('monto')?.errors?.['required']">El monto es obligatorio.</span>
                            <span *ngIf="pagoForm.get('monto')?.errors?.['min']">El monto debe ser mayor a 0.</span>
                            <span *ngIf="pagoForm.get('monto')?.errors?.['max']">El monto no puede ser mayor al saldo pendiente.</span>
                        </div>
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Método de pago</label>
                        <select formControlName="metodo_pago" class="w-full h-11 px-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition-all font-medium text-slate-700">
                            <option value="EFECTIVO">Efectivo</option>
                            <option value="TRANSFERENCIA">Transferencia</option>
                        </select>
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Observación (Opcional)</label>
                        <textarea formControlName="observacion" rows="2" 
                                  class="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition-all text-sm resize-none" 
                                  placeholder="Detalles del pago..."></textarea>
                    </div>

                    <div *ngIf="pagoError" class="p-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg border border-red-100">
                        {{ pagoError }}
                    </div>

                    <div *ngIf="pagoExito" class="p-3 bg-green-50 text-green-700 text-sm font-medium rounded-lg border border-green-100 flex items-center justify-center gap-2">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                        Pago registrado correctamente
                    </div>

                    <!-- Footer -->
                    <div class="pt-4 flex gap-3">
                        <button type="button" (click)="cerrarModalPago()" class="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors">
                            Cancelar
                        </button>
                        <button type="submit" [disabled]="pagoForm.invalid || guardandoPago" class="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                            <span *ngIf="guardandoPago" class="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            {{ guardandoPago ? 'Procesando...' : 'Registrar Pago' }}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Modal Ver Pagos -->
    <div *ngIf="showVerPagosModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden animate-in zoom-in-95 duration-200">
            <!-- Header -->
            <div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 class="text-lg font-bold text-slate-800">Historial de Pagos</h3>
                <button (click)="cerrarModalVerPagos()" class="text-slate-400 hover:text-slate-600 transition-colors">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
            
            <!-- Body -->
            <div class="p-6">
                <!-- Loading State -->
                <div *ngIf="cargandoPagos" class="flex justify-center p-8">
                    <div class="h-8 w-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                </div>

                <!-- Error State -->
                <div *ngIf="errorPagos" class="p-4 bg-red-50 text-red-600 text-sm font-medium rounded-lg border border-red-100 mb-4">
                    {{ errorPagos }}
                </div>

                <!-- Tabla de Pagos -->
                <div *ngIf="!cargandoPagos && !errorPagos" class="border border-slate-200 rounded-xl overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-slate-50 text-muted uppercase text-[10px] tracking-widest font-bold">
                                <th class="p-3 border-b border-slate-200 whitespace-nowrap">Fecha</th>
                                <th class="p-3 border-b border-slate-200 text-center whitespace-nowrap">Tipo</th>
                                <th class="p-3 border-b border-slate-200 text-right whitespace-nowrap">Monto</th>
                                <th class="p-3 border-b border-slate-200 text-center whitespace-nowrap">Método</th>
                                <th class="p-3 border-b border-slate-200 whitespace-nowrap">Registrado por</th>
                                 <th class="p-3 border-b border-slate-200 whitespace-nowrap">Observación</th>
                                <th *ngIf="isAdmin" class="p-3 border-b border-slate-200 text-right pr-4 whitespace-nowrap">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr *ngFor="let pago of pagos" class="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                                <td class="p-3 text-sm text-slate-800 whitespace-nowrap">
                                    {{ pago.fecha_pago | date:'dd-MMM-yyyy' }}
                                </td>
                                <td class="p-3 text-center">
                                    <span class="badge-premium" 
                                        [class.success]="pago.tipo_movimiento === 'PAGO'"
                                        [class.danger]="pago.tipo_movimiento === 'REVERSO'">
                                        {{ pago.tipo_movimiento }}
                                    </span>
                                </td>
                                <td class="p-3 text-right font-bold whitespace-nowrap"
                                    [class.text-red-600]="pago.tipo_movimiento === 'REVERSO'"
                                    [class.text-slate-700]="pago.tipo_movimiento === 'PAGO'">
                                    {{ pago.monto | currency:'COP':'symbol':'1.0-0' }}
                                </td>
                                <td class="p-3 text-center">
                                    <span class="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded shadow-sm border border-slate-200">
                                        {{ pago.metodo_pago }}
                                    </span>
                                </td>
                                <td class="p-3 text-sm text-slate-700 whitespace-nowrap">
                                    {{ pago.usuarios?.nombre || 'Sistema' }}
                                </td>
                                 <td class="p-3 text-sm text-slate-600 whitespace-nowrap">
                                    {{ pago.observacion || '—' }}
                                </td>
                                <td *ngIf="isAdmin" class="p-3 text-right whitespace-nowrap">
                                    <button *ngIf="pago.tipo_movimiento === 'PAGO'" 
                                            (click)="reversarPago(pago)"
                                            class="px-3 py-1 bg-red-50 text-red-600 text-[10px] font-bold uppercase rounded border border-red-100 hover:bg-red-100 transition-colors">
                                        Reversar
                                    </button>
                                </td>
                            </tr>
                             <tr *ngIf="pagos.length === 0">
                                <td [attr.colspan]="isAdmin ? 7 : 6" class="text-center p-8 text-muted italic bg-slate-50/50">
                                    No hay pagos registrados para esta factura.
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Footer -->
                <div class="pt-6 flex justify-end">
                    <button type="button" (click)="cerrarModalVerPagos()" class="px-6 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    </div>
  `,
    styles: [`
    .cartera-container {
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
    .info { background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }
    .neutral { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
    .input-premium {
        @apply bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition-all shadow-sm;
    }
  `]
})
export class CarteraComponent implements OnInit {
    carteras: CarteraItem[] = [];
    loading = false;
    totalCarteraFiltrada: number = 0;
    documentosPendientes: number = 0;

    searchControl = new FormControl('');
    filters = {
        search: '',
        estado: '',
        fechaDesde: '',
        fechaHasta: '',
        asesorId: ''
    };

    asesores: any[] = [];
    fechaInicio: string = '';
    fechaFin: string = '';

    // Variables Modal Pago
    showPagoModal = false;
    pagoDoc: CarteraItem | null = null;
    pagoForm: any;
    guardandoPago = false;
    pagoError = '';
    pagoExito = false;

    // Variables Modal Ver Pagos
    showVerPagosModal = false;
    pagos: any[] = [];
    cargandoPagos = false;
    errorPagos = '';

     constructor(
        private carteraService: CarteraService,
        private supabase: SupabaseService,
        private authService: AuthService,
        private uiService: UiService
    ) { }

    get isAdmin(): boolean {
        return this.authService.currentUserValue?.role === 'ADMIN';
    }

    async ngOnInit() {
        this.uiService.setLoading(true);
        try {
            this.initPagoForm();
            await this.loadInitialData();

            this.searchControl.valueChanges
                .pipe(
                    debounceTime(400),
                    distinctUntilChanged()
                )
                .subscribe(value => {
                    this.loadCartera();
                });

            await this.loadCartera();
        } catch (err) {
            console.error('Error inicializando cartera', err);
            this.uiService.setLoading(false);
        }
    }

    initPagoForm() {
        this.pagoForm = new FormGroup({
            monto: new FormControl('', {
                validators: [
                    this.requiredValidator,
                    this.minValidator(0.01)
                ]
            }),
            metodo_pago: new FormControl('EFECTIVO'),
            observacion: new FormControl('')
        });
    }

    // Custom simpler validators to avoid importing extra Validator modules if not needed
    requiredValidator(control: AbstractControl) {
        return control.value === null || control.value === '' ? { required: true } : null;
    }

    minValidator(min: number) {
        return (control: AbstractControl) => {
            return control.value !== null && Number(control.value) < min ? { min: true } : null;
        };
    }

    maxValidator(max: number) {
        return (control: AbstractControl) => {
            // Se permite una tolerancia de redondeo de hasta 1 peso
            return control.value !== null && Number(control.value) > (max + 1) ? { max: true } : null;
        };
    }

    async loadInitialData() {
        const { data: users } = await this.supabase.from('usuarios').select('*').order('nombre_completo');
        this.asesores = users || [];
    }

    async loadCartera() {
        this.loading = true;
        this.uiService.setLoading(true);
        try {
            this.filters.search = this.searchControl.value || '';
            
            // Si el filtro es VENCIDA, pedimos PENDIENTE y PARCIAL al backend para filtrar luego localmente
            const originalEstadoFilter = this.filters.estado;
            const needsLocalFilter = originalEstadoFilter === 'VENCIDA';
            
            let searchParams = { ...this.filters };
            if (needsLocalFilter) {
                // El backend no conoce VENCIDA, así que buscamos PENDIENTES y PARCIALES
                searchParams.estado = ''; // Traemos todos para filtrar luego o podríamos optimizar pidiendo ambos
            }

            let results = await this.carteraService.getCartera(searchParams);

            if (needsLocalFilter) {
                // Filtrado local para VENCIDA
                results = results.filter(item => this.getDisplayEstado(item) === 'VENCIDA');
            }

            this.carteras = results;
            
            this.totalCarteraFiltrada = this.carteras.reduce(
                (sum: number, item: CarteraItem) => sum + Number(item.saldo_pendiente || 0), 0
            );
            this.documentosPendientes = this.carteras.filter(
                (item: CarteraItem) => Number(item.saldo_pendiente || 0) > 0
            ).length;
        } catch (error) {
            console.error('Error loading cartera', error);
        } finally {
            this.loading = false;
            this.uiService.setLoading(false);
        }
    }

    /**
     * Calcula el estado visual dinámico (VENCIDA)
     */
    getDisplayEstado(item: CarteraItem): string {
        if (!item) return '';
        
        // El backend devuelve PAGADO si saldo es 0, pero por seguridad visual:
        if (item.saldo_pendiente <= 0 || item.estado === 'PAGADO') return 'PAGADO';
        if (item.estado === 'ANULADA') return 'ANULADA';

        // Lógica para VENCIDA: PENDIENTE/PARCIAL + Fecha vencimiento pasada
        if (['PENDIENTE', 'PARCIAL'].includes(item.estado)) {
            if (item.fecha_vencimiento) {
                const hoy = new Date();
                hoy.setHours(0, 0, 0, 0); // Solo fecha
                
                // Forzar la fecha de vencimiento a medianoche local para comparar solo fechas
                const fechaVenc = new Date(item.fecha_vencimiento);
                fechaVenc.setHours(0, 0, 0, 0);
                
                if (fechaVenc < hoy) {
                    return 'VENCIDA';
                }
            }
        }

        return item.estado;
    }

    onFilterChange() {
        this.loadCartera();
    }

    filtrarPorFecha() {
        if (!this.fechaInicio || !this.fechaFin) return;
        this.filters.fechaDesde = this.fechaInicio;
        this.filters.fechaHasta = this.fechaFin;
        this.loadCartera();
    }

    limpiarFiltro() {
        this.fechaInicio = '';
        this.fechaFin = '';
        this.filters.fechaDesde = '';
        this.filters.fechaHasta = '';
        this.loadCartera();
    }

    formatFactura(num: number | null | undefined) {
        return num ? `#${num.toString().padStart(6, '0')}` : '—';
    }

    /**
     * Formatea una fecha ISO UTC a la zona horaria de Colombia usando Intl.DateTimeFormat
     * Resultado esperado: 17/03/2026, 5:41 p. m.
     */
    formatFechaColombia(fecha: string | null | undefined): string {
        if (!fecha) return '—';

        try {
            // Si llega un string de fecha sin zona, forzarlo a UTC para que Intl lo mueva a Bogota
            let valueToParse = fecha;
            if (typeof fecha === 'string' && fecha.includes('T') && !fecha.endsWith('Z') && !fecha.includes('+')) {
                valueToParse = fecha + 'Z';
            }

            const dateObj = new Date(valueToParse);

            return new Intl.DateTimeFormat('es-CO', {
                timeZone: 'America/Bogota',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }).format(dateObj);
        } catch (e) {
            console.error('Error formatting date for Colombia:', e);
            return fecha;
        }
    }

    registrarPago(item: CarteraItem) {
        this.pagoDoc = item;
        this.pagoError = '';
        this.pagoExito = false;

        // Reset form and update dynamic max validator
        this.pagoForm.reset({ metodo_pago: 'EFECTIVO', observacion: '' });

        const controlMonto = this.pagoForm.get('monto');
        if (controlMonto) {
            controlMonto.setValidators([
                this.requiredValidator,
                this.minValidator(0.01),
                this.maxValidator(Number(item.saldo_pendiente))
            ]);
            controlMonto.updateValueAndValidity();
        }

        this.showPagoModal = true;
    }

    cerrarModalPago() {
        if (this.guardandoPago) return;
        this.showPagoModal = false;
        this.pagoDoc = null;
    }

    async procesarPago() {
        if (this.pagoForm.invalid || !this.pagoDoc) return;

        this.guardandoPago = true;
        this.pagoError = '';
        this.pagoExito = false;

        const val = this.pagoForm.value;

        try {
            await this.carteraService.registrarPago(
                this.pagoDoc.venta_id,
                Number(val.monto),
                val.metodo_pago,
                val.observacion
            );

            this.pagoExito = true;

            // Esperar un segundo para que el usuario vea el mensaje de éxito
            setTimeout(() => {
                this.guardandoPago = false;
                this.cerrarModalPago();
                this.pagoForm.reset();
                this.loadCartera();
            }, 1200);

        } catch (err: any) {
            console.error(err);
            const msg = err.message || '';
            if (msg.includes('No tienes permisos para registrar pagos')) {
                this.pagoError = 'No tienes permisos para realizar esta acción';
            } else {
                this.pagoError = 'Error al registrar el pago';
            }
            this.guardandoPago = false;
        }
    }
    async openPagosModal(venta: CarteraItem) {
        this.pagoDoc = venta; // Guardamos referencia para refrescar
        this.showVerPagosModal = true;
        this.cargandoPagos = true;
        this.errorPagos = '';
        this.pagos = [];

        try {
            const { data, error } = await this.supabase
                .from('pagos_cartera')
                .select(`
                    id,
                    monto,
                    metodo_pago,
                    observacion,
                    fecha_pago,
                    tipo_movimiento,
                    usuario_id,
                    usuarios(nombre:nombre_completo)
                `)
                .eq('venta_id', venta.venta_id)
                .order('fecha_pago', { ascending: false });

            if (error) {
                console.error('Error cargando pagos:', error);
                this.errorPagos = 'Error al cargar pagos';
                return;
            }

            this.pagos = data || [];
        } catch (err) {
            console.error('Error cargando pagos:', err);
            this.errorPagos = 'Error al cargar pagos';
        } 
        
        this.cargandoPagos = false;
    }

    getUserName(userId: string) {
        if (!userId) return 'Sistema';
        const user = this.asesores.find(u => u.id === userId);
        return user ? user.nombre_completo : 'Usuario';
    }

    async reversarPago(pago: any) {
        if (!confirm('¿Está seguro de reversar este pago? Esta acción no se puede deshacer.')) return;
        
        try {
            const { error } = await this.supabase.rpc('reversar_pago_cartera', {
                p_pago_id: pago.id,
                p_observacion: 'Reverso desde sistema'
            });

            if (error) throw error;

            // Refrescar datos
            if (this.pagoDoc) {
                await this.openPagosModal(this.pagoDoc);
            }
            await this.loadCartera();

        } catch (err: any) {
            console.error('Error al reversar pago:', err);
            alert('Error al reversar el pago: ' + (err.message || err));
        }
    }

    cerrarModalVerPagos() {
        this.showVerPagosModal = false;
        this.pagos = [];
    }

    exportarCartera() {
        const data = this.carteras.map(item => ({
            Factura: item.numero_factura,
            Cliente: item.cliente,
            Fecha: item.fecha,
            Total: item.total_factura,
            Saldo: item.saldo_pendiente,
            Vencimiento: item.fecha_vencimiento,
            Estado: this.getDisplayEstado(item)
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(wb, ws, 'Cartera');

        XLSX.writeFile(wb, 'cartera.xlsx');
    }
}
