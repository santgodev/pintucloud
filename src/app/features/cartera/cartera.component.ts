import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormControl, FormGroup, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
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
    <div class="cartera-container p-4 md:p-6 animate-in fade-in duration-500">
       <div class="flex justify-between items-center mb-4 md:mb-6">
           <h1 class="text-xl md:text-2xl font-bold text-slate-900">Cuentas por Cobrar (Cartera)</h1>
           <button *ngIf="isAdmin" (click)="abrirModalMigracion()" class="px-4 py-2 bg-slate-800 text-white font-semibold rounded-xl shadow-sm hover:bg-slate-900 flex items-center gap-2 transition-all">
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
             Carga Inicial
           </button>
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
           <div class="flex gap-2 items-end pt-5 flex-wrap">
           <button (click)="exportarCartera()" class="h-10 px-3 border border-slate-200 text-sm font-medium text-slate-700 rounded-lg hover:bg-slate-50 transition-all bg-white flex items-center gap-2 whitespace-nowrap">
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
             Exportar
           </button>
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
       <div class="bg-white rounded-xl border border-slate-200 shadow-sm" style="overflow: hidden;">
           <!-- Scroll horizontal en móvil -->
           <div style="overflow-x: auto; -webkit-overflow-scrolling: touch;">
           <table style="min-width: 680px;" class="w-full text-left border-collapse">
              <thead>
                 <tr class="bg-slate-50 text-muted uppercase text-[10px] tracking-widest font-bold">
                    <th class="p-4 border-b border-slate-200 whitespace-nowrap">Factura</th>
                    <th class="p-4 border-b border-slate-200" style="min-width:130px">Cliente</th>
                    <th class="p-4 border-b border-slate-200 whitespace-nowrap">Fecha</th>
                    <th class="p-4 border-b border-slate-200 text-right whitespace-nowrap">TOTAL</th>
                    <th class="p-4 border-b border-slate-200 text-right whitespace-nowrap">SALDO</th>
                    <th class="p-4 border-b border-slate-200 w-[130px] text-center whitespace-nowrap">Vencimiento</th>
                    <th class="p-4 border-b border-slate-200 text-center whitespace-nowrap">Estado</th>
                    <th class="p-4 border-b border-slate-200 text-right whitespace-nowrap">Acciones</th>
                 </tr>
              </thead>
              <tbody class="relative">
                 <!-- Loading State -->
                 <tr *ngIf="loading" class="absolute inset-x-0 top-0 h-1 bg-indigo-500/20 animate-pulse"></tr>

                 <tr *ngFor="let item of carteras" class="border-b border-slate-100 hover:bg-slate-50/50 transition-colors group">
                     <td class="p-4 font-mono text-sm font-bold text-indigo-600 whitespace-nowrap">
                        <button (click)="verOrden(item)" class="hover:underline hover:text-indigo-800 transition-all">
                          {{ formatFactura(item.numero_factura) }}
                        </button>
                    </td>
                    <td class="p-4" style="max-width: 160px;">
                        <div class="text-sm font-medium text-slate-900" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" [title]="item.cliente">{{ item.cliente }}</div>
                    </td>
                    <td class="p-4 text-sm text-slate-800 whitespace-nowrap">
                        {{ formatFechaColombia(item.fecha) }}
                    </td>
                    <td class="p-4 text-right font-medium whitespace-nowrap">
                        {{ item.total_factura | currency:'COP':'symbol':'1.0-0' }}
                    </td>
                    <td class="p-4 text-right font-semibold text-red-600 whitespace-nowrap">
                        {{ item.saldo_pendiente | currency:'COP':'symbol':'1.0-0' }}
                    </td>
                    <td class="p-4 text-sm text-slate-800 text-center whitespace-nowrap">
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
                            <!-- Registrar Pago (Admins o Asesores autorizados como Medellín) -->
                                <button *ngIf="canRegisterPayment"
                                    (click)="registrarPago(item)"
                                    [disabled]="item.saldo_pendiente <= 0 || item.estado === 'PAGADO'"
                                    class="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-lg hover:bg-indigo-100 transition-all border border-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap" 
                                    title="Registrar Pago">
                                Registrar pago
                            </button>
                            
                            <!-- Editar (Solo Admins y Migraciones) -->
                            <button *ngIf="isAdmin && esMigracion(item)"
                                    (click)="editarMigracion(item)"
                                    class="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg hover:bg-blue-100 transition-all border border-blue-200 whitespace-nowrap flex items-center gap-1" 
                                    title="Editar Carga Inicial">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                Editar
                            </button>
                                                        <!-- Ver Pagos -->
                             <button (click)="openPagosModal(item)"
                                     class="px-3 py-1.5 bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-100 transition-all border border-slate-200 whitespace-nowrap" 
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
    </div>

    <!-- Modal Carga Inicial / Migración -->
    <div *ngIf="showMigracionModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <!-- Header -->
            <div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-800 text-white">
                <div>
                    <h3 class="text-lg font-bold">{{ editandoVentaId ? 'Editar' : 'Migración de' }} Cartera Antigua</h3>
                    <p class="text-xs text-slate-300">Este proceso NO afecta el inventario físico ni los reportes de ventas actuales.</p>
                </div>
                <button (click)="cerrarModalMigracion()" class="text-slate-300 hover:text-white transition-colors">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
            
            <!-- Body -->
            <div class="flex-1 overflow-y-auto p-6">
                <!-- Información General -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div class="relative">
                        <label class="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Cliente</label>
                        <div class="relative">
                            <input type="text" [formControl]="clientSearchControl" 
                                (focus)="showClientResults = true"
                                (blur)="hideClientResults()"
                                placeholder="Buscar por nombre o código..." 
                                class="input-premium w-full text-xs pr-10">
                            
                            <!-- Resultados de búsqueda -->
                            <div *ngIf="showClientResults && filteredClientes.length > 0" 
                                class="absolute z-[60] left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto shadow-indigo-500/10 mb-4">
                                <div *ngFor="let c of filteredClientes" 
                                    (click)="seleccionarCliente(c)"
                                    class="px-4 py-2 hover:bg-indigo-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors">
                                    <div class="text-[10px] font-bold text-indigo-600 uppercase">{{ c.codigo || 'S/C' }}</div>
                                    <div class="text-xs text-slate-900 font-semibold">{{ c.razon_social }}</div>
                                </div>
                            </div>
                            <!-- Botón limpiar -->
                            <button *ngIf="clientSearchControl.value" (click)="clientSearchControl.setValue(''); migracionForm.cliente_id = ''; showClientResults = false" 
                                    class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Factura Manual #</label>
                        <input type="text" [(ngModel)]="migracionForm.numero_factura_manual" placeholder="Ej: 4501" class="input-premium w-full text-xs">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Fecha de Factura</label>
                        <input type="date" [(ngModel)]="migracionForm.fecha" class="input-premium w-full text-xs">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Plazo (Días)</label>
                        <select [(ngModel)]="migracionForm.dias_credito" class="input-premium w-full text-xs">
                            <option [ngValue]="8">8 Días</option>
                            <option [ngValue]="15">15 Días</option>
                            <option [ngValue]="30">30 Días</option>
                        </select>
                    </div>
                </div>

                <!-- Detalle de Productos -->
                <div class="mb-4">
                    <h4 class="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                        Productos en la Factura (Informativo)
                    </h4>
                    
                    <div class="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <!-- Buscador Inteligente de Productos -->
                        <div class="relative mb-4">
                            <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1">Añadir Producto</label>
                            <div class="relative">
                                <input type="text" [formControl]="productSearchControl" 
                                    (focus)="showProductResults = true"
                                    (blur)="hideProductResults()"
                                    placeholder="Escribe nombre o referencia (SKU)..." 
                                    class="input-premium w-full text-xs pr-10 h-10">
                                
                                <!-- Resultados de búsqueda -->
                                <div *ngIf="showProductResults && filteredProductos.length > 0" 
                                    class="absolute z-[60] left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto shadow-indigo-500/10">
                                    <div *ngFor="let p of filteredProductos" 
                                        (click)="seleccionarProducto(p)"
                                        class="px-4 py-2 hover:bg-indigo-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors">
                                        <div class="flex justify-between items-center mb-0.5">
                                            <span class="text-[10px] font-bold text-indigo-600 uppercase">{{ p.sku }}</span>
                                            <span class="text-[10px] font-bold text-slate-400">{{ p.precio_base | currency:'COP':'symbol':'1.0-0' }}</span>
                                        </div>
                                        <div class="text-xs text-slate-900 font-semibold">{{ p.nombre }}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Tabla de Items -->
                        <table class="w-full text-xs">
                            <thead>
                                <tr class="text-slate-500 font-bold border-b border-slate-200">
                                    <th class="py-2 text-left">Producto</th>
                                    <th class="py-2 text-center w-24">Cant.</th>
                                    <th class="py-2 text-right w-32">Precio Unit.</th>
                                    <th class="py-2 text-right w-32">Subtotal</th>
                                    <th class="py-2 text-center w-12"></th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr *ngFor="let item of migracionForm.items; let i = index" class="border-b border-slate-100 italic">
                                    <td class="py-2">{{ item.nombre }}</td>
                                    <td class="py-2 text-center">
                                        <input type="number" [(ngModel)]="item.cantidad" (change)="calcularFilaMigracion(i)" class="w-16 h-8 border border-slate-200 rounded text-center">
                                    </td>
                                    <td class="py-2 text-right">
                                        <input type="number" [(ngModel)]="item.precio" (change)="calcularFilaMigracion(i)" class="w-24 h-8 border border-slate-200 rounded text-right px-2">
                                    </td>
                                    <td class="py-2 text-right font-bold">{{ item.subtotal | currency:'COP':'symbol':'1.0-0' }}</td>
                                    <td class="py-2 text-center">
                                        <button (click)="eliminarItemMigracion(i)" class="text-red-400 hover:text-red-600">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                        </button>
                                    </td>
                                </tr>
                                <tr *ngIf="migracionForm.items.length === 0">
                                    <td colspan="5" class="py-8 text-center text-slate-400 italic">No has añadido productos aún.</td>
                                </tr>
                            </tbody>
                            <tfoot>
                                <tr class="bg-indigo-50/50 font-bold text-sm">
                                    <td colspan="3" class="py-3 px-4 text-right uppercase">TOTAL DEUDA</td>
                                    <td class="py-3 text-right text-indigo-700">{{ calcularTotalMigracion() | currency:'COP':'symbol':'1.0-0' }}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Observaciones Adicionales</label>
                    <textarea [(ngModel)]="migracionForm.observaciones" rows="2" class="input-premium w-full text-xs resize-none"></textarea>
                </div>
            </div>

            <!-- Footer -->
            <div class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button (click)="cerrarModalMigracion()" class="px-6 py-2 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-100 transition-colors">
                    Cancelar
                </button>
                <button (click)="guardarMigracion()" [disabled]="!migracionForm.cliente_id || !migracionForm.numero_factura_manual || migracionForm.items.length === 0 || guardandoMigracion" 
                        class="px-8 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-md disabled:opacity-50 flex items-center gap-2">
                    <span *ngIf="guardandoMigracion" class="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    {{ guardandoMigracion ? 'Guardando...' : (editandoVentaId ? 'Actualizar Cambios' : 'Confirmar Carga') }}
                </button>
            </div>
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
 
    // Variables Modal Migración
    showMigracionModal = false;
    editandoVentaId: string | null = null;
    clientes: any[] = [];
    filteredClientes: any[] = [];
    showClientResults = false;
    clientSearchControl = new FormControl('');
    productos: any[] = [];
    filteredProductos: any[] = [];
    showProductResults = false;
    productSearchControl = new FormControl('');
    migracionForm = {
        cliente_id: '',
        numero_factura_manual: '',
        fecha: '',
        dias_credito: 30,
        observaciones: 'Migración inicial de cartera',
        items: [] as any[]
    };
    guardandoMigracion = false;

     constructor(
        private carteraService: CarteraService,
        private supabase: SupabaseService,
        private authService: AuthService,
        private uiService: UiService,
        private route: ActivatedRoute,
        private router: Router
    ) { }

    get isAdmin(): boolean {
        return this.authService.currentUserValue?.role === 'admin_distribuidor';
    }

    get canRegisterPayment(): boolean {
        const user = this.authService.currentUserValue;
        if (!user) return false;
        if (user.role === 'admin_distribuidor') return true;
        
        // Asesores: Permitir si NO son del distribuidor de Santa Marta (Guzman)
        const SANTA_MARTA_ID = 'e9855cef-e734-4b56-8737-c86c581342cc';
        return user.role === 'asesor' && user.distribuidor_id !== SANTA_MARTA_ID;
    }

    verOrden(item: CarteraItem) {
        this.router.navigate(['/sales', item.venta_id, 'invoice']);
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

            // Buscador de clientes para migración
            this.clientSearchControl.valueChanges.subscribe(val => {
                if (typeof val === 'string') {
                    this.filtrarClientes(val);
                }
            });

            // Buscador de productos para migración
            this.productSearchControl.valueChanges.subscribe(val => {
                if (typeof val === 'string') {
                    this.filtrarProductos(val);
                }
            });

            // Leer parámetro de búsqueda de la URL (para redirección desde notificaciones)
            const searchParam = this.route.snapshot.queryParamMap.get('search');
            if (searchParam) {
                this.searchControl.setValue(searchParam);
            }

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
            
            // Si la fecha es YYYY-MM-DD (10 caracteres), la tratamos como fecha local pura
            // para que no importe en qué zona horaria esté el navegador.
            if (typeof fecha === 'string' && (fecha.length === 10 || fecha.includes('T00:00:00'))) {
                const datePart = fecha.substring(0, 10);
                const [year, month, day] = datePart.split('-').map(Number);
                // Mes 0-indexed en JS
                const localDate = new Date(year, month - 1, day);
                return new Intl.DateTimeFormat('es-CO', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                }).format(localDate);
            }

            // Para fechas con hora real (ventas nuevas), usamos el formateador normal
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

    // Lógica de Migración
    esMigracion(item: CarteraItem): boolean {
        // Las facturas de migración suelen tener el vendedor "Sistema" 
        // y una observación específica o no tener fecha de autorización.
        return item.vendedor === 'Sistema' || 
               item.observaciones?.includes('Migración') === true;
    }

    async editarMigracion(item: CarteraItem) {
        this.uiService.setLoading(true);
        try {
            this.editandoVentaId = item.venta_id;
            
            // Cargar datos completos del producto (necesitamos los items)
            // Reutilizamos el servicio de ventas que ya tiene getById con items
            const { data: venta, error } = await this.supabase
                .from('ventas')
                .select(`
                    id, 
                    cliente_id, 
                    numero_factura, 
                    fecha, 
                    dias_credito, 
                    observaciones,
                    clientes(razon_social),
                    detalle_ventas(
                        id,
                        producto_id,
                        cantidad,
                        precio_unitario,
                        subtotal,
                        productos(nombre)
                    )
                `)
                .eq('id', item.venta_id)
                .single();

            if (error) throw error;

            // Poblar el formulario
            this.migracionForm = {
                cliente_id: venta.cliente_id,
                numero_factura_manual: venta.numero_factura?.toString() || '',
                fecha: venta.fecha,
                dias_credito: venta.dias_credito || 30,
                observaciones: venta.observaciones || '',
                items: (venta.detalle_ventas || []).map((d: any) => {
                    const prodObj: any = d.productos;
                    const prodNombre = Array.isArray(prodObj) ? prodObj[0]?.nombre : prodObj?.nombre;
                    return {
                        producto_id: d.producto_id,
                        nombre: prodNombre || 'Producto',
                        cantidad: d.cantidad,
                        precio: d.precio_unitario,
                        subtotal: d.subtotal
                    };
                })
            };

            // Preparar buscadores
            await this.abrirModalMigracion(); // Esto carga clis/prods y abre el modal
            
            // Ajustar el nombre del cliente en el buscador
            const clienteObj: any = venta.clientes;
            const nombreCliente = Array.isArray(clienteObj) ? clienteObj[0]?.razon_social : clienteObj?.razon_social;
            this.clientSearchControl.setValue(nombreCliente || '', { emitEvent: false });
            
        } catch (err) {
            console.error('Error cargando para editar:', err);
            alert('No se pudo cargar la información para editar.');
        } finally {
            this.uiService.setLoading(false);
        }
    }

    async abrirModalMigracion() {
        this.showMigracionModal = true;
        
        // Si no estamos editando, resetear el formulario
        if (!this.editandoVentaId) {
            this.migracionForm.fecha = new Date().toISOString().split('T')[0];
        }

        this.uiService.setLoading(true);
        try {
            // Cargar clientes y productos para el selector si no están cargados
            if (this.clientes.length === 0 || this.productos.length === 0) {
                const [{ data: clis }, { data: prods }] = await Promise.all([
                    this.supabase.from('clientes').select('id, codigo, razon_social').order('razon_social'),
                    this.supabase.from('productos').select('id, nombre, sku, precio_base').eq('activo', true).order('nombre')
                ]);
                this.clientes = clis || [];
                this.filteredClientes = this.clientes;
                this.productos = prods || [];
                this.filteredProductos = this.productos;
            }
        } catch (err) {
            console.error('Error loading migration data', err);
        } finally {
            this.uiService.setLoading(false);
        }
    }

    filtrarClientes(term: string) {
        if (!term) {
            this.filteredClientes = this.clientes;
            return;
        }
        const s = term.toLowerCase();
        this.filteredClientes = this.clientes.filter(c => 
            (c.razon_social?.toLowerCase().includes(s)) || (c.codigo?.toLowerCase().includes(s))
        );
        this.showClientResults = true;
    }

    seleccionarCliente(cliente: any) {
        this.migracionForm.cliente_id = cliente.id;
        this.clientSearchControl.setValue(cliente.razon_social, { emitEvent: false });
        this.showClientResults = false;
    }

    filtrarProductos(term: string) {
        if (!term) {
            this.filteredProductos = this.productos;
            return;
        }
        const s = term.toLowerCase();
        this.filteredProductos = this.productos.filter(p => 
            (p.nombre?.toLowerCase().includes(s)) || (p.sku?.toLowerCase().includes(s))
        );
        this.showProductResults = true;
    }

    seleccionarProducto(producto: any) {
        // Evitar duplicados
        const exists = this.migracionForm.items.find(i => i.producto_id === producto.id);
        if (exists) {
            exists.cantidad++;
            exists.subtotal = exists.cantidad * exists.precio;
        } else {
            this.migracionForm.items.push({
                producto_id: producto.id,
                nombre: producto.nombre,
                cantidad: 1,
                precio: Number(producto.precio_base || 0),
                subtotal: Number(producto.precio_base || 0)
            });
        }
        
        this.productSearchControl.setValue('', { emitEvent: false });
        this.showProductResults = false;
    }

    hideClientResults() {
        // Pequeño delay para permitir que el click en la lista se procese antes de ocultarla
        setTimeout(() => this.showClientResults = false, 200);
    }

    hideProductResults() {
        setTimeout(() => this.showProductResults = false, 200);
    }

    cerrarModalMigracion() {
        if (this.guardandoMigracion) return;
        this.showMigracionModal = false;
        this.editandoVentaId = null;
        this.clientSearchControl.setValue('');
        this.productSearchControl.setValue('');
        this.showClientResults = false;
        this.showProductResults = false;
        this.migracionForm = {
            cliente_id: '',
            numero_factura_manual: '',
            fecha: new Date().toISOString().split('T')[0],
            dias_credito: 30,
            observaciones: 'Migración inicial de cartera',
            items: []
        };
    }


    calcularFilaMigracion(index: number) {
        const item = this.migracionForm.items[index];
        item.subtotal = item.cantidad * item.precio;
    }

    eliminarItemMigracion(index: number) {
        this.migracionForm.items.splice(index, 1);
    }

    calcularTotalMigracion() {
        return this.migracionForm.items.reduce((sum, i) => sum + i.subtotal, 0);
    }

    async guardarMigracion() {
        if (this.guardandoMigracion) return;
        const total = this.calcularTotalMigracion();
        if (total <= 0) return;

        this.guardandoMigracion = true;
        try {
            if (this.editandoVentaId) {
                // Modo Edición
                await this.carteraService.actualizarFacturaAntigua(this.editandoVentaId, {
                    ...this.migracionForm,
                    total: total
                });
            } else {
                // Modo Creación
                await this.carteraService.cargarFacturaAntigua({
                    ...this.migracionForm,
                    total: total
                });
            }

            // 1. Resetear el estado de carga y cerrar visualmente de inmediato
            this.guardandoMigracion = false;
            this.showMigracionModal = false;
            
            // 2. Limpiar el formulario manualmente
            this.migracionForm = {
                cliente_id: '',
                numero_factura_manual: '',
                fecha: new Date().toISOString().split('T')[0],
                dias_credito: 30,
                observaciones: 'Migración inicial de cartera',
                items: []
            };

            // 3. Notificar y refrescar
            const wasEditing = !!this.editandoVentaId;
            this.editandoVentaId = null;
            
            setTimeout(() => {
                alert(wasEditing ? 'Migración actualizada correctamente.' : 'Carga de cartera histórica completada.');
                this.loadCartera();
            }, 100);
        } catch (err: any) {
            console.error('Error en migración:', err);
            this.guardandoMigracion = false;
            alert('Error al procesar: ' + (err.message || 'Error desconocido'));
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
