import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PurchasesService, Compra, PagoProveedor } from '../services/purchases.service';

import { PurchasePaymentModalComponent } from '../components/purchase-payment-modal/purchase-payment-modal.component';
import { AuthService } from '../../../core/services/auth.service';
import { UiService } from '../../../core/services/ui.service';
@Component({
  selector: 'app-purchases-list',
  standalone: true,
  imports: [CommonModule, RouterModule, CurrencyPipe, DatePipe, FormsModule, PurchasePaymentModalComponent],
  template: `
    <div class="p-4 md:p-6">
      
      <!-- Header -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 md:mb-6">
        <div>
          <h1 class="text-xl md:text-3xl font-bold text-slate-900 tracking-tight">Compras</h1>
          <p class="text-slate-500 mt-1 text-sm">Registro de recepciones de mercancía e ingresos de inventario.</p>
        </div>
        <button
          (click)="goToCreate()"
          class="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-200 transition-all text-sm">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Nueva Compra
        </button>
      </div>

      <!-- Financial Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <!-- Card 1: Total Debt -->
        <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div class="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
          <div class="relative flex items-start justify-between">
            <div>
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Total Cartera Pendiente</p>
              <p class="text-[9px] text-slate-400 mb-1.5 italic">Resumen general del distribuidor</p>
              <h2 class="text-3xl font-black text-slate-900 tabular-nums">
                {{ (summary()?.totalDeuda ?? 0) | currency:'COP':'symbol-narrow':'1.0-0' }}
              </h2>
              <div class="mt-2 flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                <span class="text-[11px] font-medium text-slate-500">Saldo total a pagar a proveedores</span>
              </div>
            </div>
            <div class="p-3 bg-indigo-100 rounded-xl text-indigo-600">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
            </div>
          </div>
        </div>

        <!-- Card 2: Overdue -->
        <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div class="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
          <div class="relative flex items-start justify-between">
            <div>
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Facturas Vencidas</p>
              <p class="text-[9px] text-slate-400 mb-1.5 italic">Resumen general del distribuidor</p>
              <h2 class="text-3xl font-black text-rose-600 tabular-nums">
                {{ summary()?.vencidas ?? 0 }}
              </h2>
              <div class="mt-2 flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                <span class="text-[11px] font-medium text-slate-500">Requieren atención inmediata</span>
              </div>
            </div>
            <div class="p-3 bg-rose-100 rounded-xl text-rose-600">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
          </div>
        </div>

        <!-- Card 3: Up to Date -->
        <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div class="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
          <div class="relative flex items-start justify-between">
            <div>
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Pagos al Día</p>
              <p class="text-[9px] text-slate-400 mb-1.5 italic">Resumen general del distribuidor</p>
              <h2 class="text-3xl font-black text-emerald-600 tabular-nums">
                {{ summary()?.alDia ?? 0 }}
              </h2>
              <div class="mt-2 flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span class="text-[11px] font-medium text-slate-500">Dentro del plazo de vencimiento</span>
              </div>
            </div>
            <div class="p-3 bg-emerald-100 rounded-xl text-emerald-600">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Filters Row -->
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-wrap gap-4 items-end">
        
        <!-- Search -->
        <div class="flex-1 min-w-[200px]">
          <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Buscar</label>
          <div class="relative">
            <svg class="absolute left-3 top-2.5 text-slate-400" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" [(ngModel)]="searchTerm" (ngModelChange)="applyFilters()"
              placeholder="Proveedor o N° Factura..."
              class="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all">
          </div>
        </div>

        <!-- Status Filter -->
        <div class="w-full sm:w-auto min-w-[140px]">
          <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Estado</label>
          <select [(ngModel)]="selectedStatus" (ngModelChange)="applyFilters()"
            class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all appearance-none cursor-pointer">
            <option value="">Todos</option>
            <option value="BORRADOR">Borrador</option>
            <option value="CONFIRMADA">Confirmada</option>
            <option value="ANULADA">Anulada</option>
          </select>
        </div>

        <!-- Bodega Filter -->
        <div class="w-full sm:w-auto min-w-[160px]">
          <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">BODEGA (solo aplica al listado)</label>
          <select [(ngModel)]="selectedBodega" (ngModelChange)="applyFilters()"
            class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all appearance-none cursor-pointer">
            <option value="">Todas las bodegas</option>
            <option *ngFor="let b of bodegas" [value]="b.id">{{ b.nombre }}</option>
          </select>
        </div>

        <!-- Date Range -->
        <div class="w-full flex flex-wrap items-end gap-2">
            <div class="flex-1 min-w-[130px]">
              <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Desde</label>
              <input type="date" [(ngModel)]="dateFrom"
                class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all">
            </div>
            <div class="flex-1 min-w-[130px]">
              <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Hasta</label>
              <input type="date" [(ngModel)]="dateTo"
                class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all">
            </div>
            <button (click)="applyFilters()"
              class="h-[38px] px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center whitespace-nowrap">
              Filtrar fecha
            </button>
            <button *ngIf="dateFrom || dateTo" (click)="clearDateFilter()"
              class="h-[38px] px-3 border border-slate-200 text-sm text-slate-500 rounded-lg hover:bg-slate-50 transition-all bg-white flex items-center justify-center whitespace-nowrap">
              Limpiar
            </button>
        </div>
        
        <!-- Filter Clarification Note -->
        <div class="w-full flex items-start gap-2 mt-1 px-1">
          <svg class="text-amber-500 flex-shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          <p class="text-[10px] font-bold text-amber-600 uppercase tracking-tight leading-tight">El resumen superior no se ve afectado por estos filtros</p>
        </div>

      </div>

      <!-- Loading -->
      <div *ngIf="loading" class="flex justify-center items-center py-16">
        <div class="animate-spin w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full"></div>
      </div>

      <!-- Error -->
      <div *ngIf="errorMessage && !loading"
           class="bg-red-50 border border-red-200 text-red-700 rounded-xl p-5 mb-6 flex items-start gap-3">
        <svg class="flex-shrink-0 mt-0.5" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span class="text-sm font-medium">{{ errorMessage }}</span>
      </div>

      <!-- Empty -->
      <div *ngIf="!loading && !errorMessage && filteredCompras.length === 0"
           class="text-center bg-white border border-dashed border-slate-300 rounded-2xl p-12">
        <svg class="mx-auto mb-4 text-slate-300" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
          <line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path>
        </svg>
        <p class="text-slate-400 font-medium mb-4">No se encontraron compras.</p>
        <button *ngIf="totalRecords() === 0" (click)="goToCreate()"
          class="text-indigo-600 font-semibold hover:underline text-sm">
          Crear la primera compra →
        </button>
      </div>

      <!-- Desktop: Table | Mobile: Cards -->
      <ng-container *ngIf="!loading && !errorMessage && filteredCompras.length > 0">

        <!-- TABLE — visible from md up -->
        <div class="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-widest font-bold border-b border-slate-200">
                <th class="p-4 border-b border-slate-200 text-center">Factura</th>
                <th class="p-4 border-b border-slate-200 text-center">Fecha</th>
                <th class="p-4 border-b border-slate-200 text-center">Proveedor</th>
                <th class="p-4 border-b border-slate-200 text-center">Bodega</th>
                <th class="p-4 border-b border-slate-200 text-center">Total</th>
                <th class="p-4 border-b border-slate-200 text-center">Cartera</th>
               <th class="p-4 border-b border-slate-200 text-center">Estado</th>
                <th class="p-4 border-b border-slate-200 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr *ngFor="let c of filteredCompras"
                  class="hover:bg-slate-50/70 transition-colors cursor-pointer"
                  (click)="goToDetail(c.id!)">
                @let cp = c.cuentas_por_pagar?.[0];
                <td class="p-4 text-slate-600 text-sm text-center">
                  <a (click)="$event.stopPropagation(); goToDetail(c.id!)" 
                     class="px-2 py-1 rounded bg-indigo-50 text-[11px] font-mono text-indigo-700 border border-indigo-100 hover:bg-indigo-100 transition-colors cursor-pointer">
                    #{{ c.numero_factura || 'Sin Factura' }}
                  </a>
                </td>
                <td class="p-4 text-slate-500 text-sm text-center">
                  {{ formatFecha(c.fecha) }}
                </td>
                <td class="p-4 font-semibold text-slate-900 text-sm text-left">
                  {{ c.proveedores?.nombre ?? '—' }}
                </td>
                <td class="p-4 text-slate-600 text-sm font-medium text-center">
                  {{ c.bodegas?.nombre || '—' }}
                </td>
                <td class="p-4 text-center font-bold text-slate-900">
                  {{ (c.total ?? 0) | currency:'COP':'symbol-narrow':'1.0-0' }}
                </td>
                <td class="p-4 text-center">
                  <div class="min-h-[60px] flex flex-col justify-center gap-1 items-center">
                    <ng-container *ngIf="c.cuentas_por_pagar?.[0] as cp; else sinCartera">
                      <!-- Línea 1: Saldo -->
                      <span class="font-bold text-slate-900 text-sm">
                        {{ cp.saldo_actual | currency:'COP':'symbol-narrow':'1.0-0' }}
                      </span>
                      
                      <!-- Línea 2: Estado Financiero Dinámico -->
                      @let estadoFin = getEstadoFinanciero(cp);
                      <span class="badge-premium rounded-full text-[10px] font-bold uppercase tracking-wider"
                        [class]="estadoFin === 'PAGADA' ? 'bg-emerald-600 text-white' : 
                                 estadoFin === 'VENCIDA' ? 'bg-rose-500 text-white' : 
                                 'bg-emerald-100 text-emerald-700 border border-emerald-200'">
                        {{ estadoFin }}
                      </span>
                      
                      <!-- Línea 3: Vencimiento -->
                      <div class="text-[10px] text-slate-500 font-medium">
                        Vence: {{ cp.fecha_vencimiento | date:'dd/MM/yyyy' }}
                      </div>
                    </ng-container>
                    <ng-template #sinCartera>
                      <span class="text-slate-400 text-sm">—</span>
                    </ng-template>
                  </div>
                </td>
                <td class="p-4 text-center">
                  <span [class]="estadoBadgeClass(c.estado)" class="inline-flex items-center justify-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider shadow-sm">
                    <span *ngIf="c.estado === 'CONFIRMADA'">✔ </span>
                    <span *ngIf="c.estado === 'BORRADOR'">🟡 </span>
                    <span *ngIf="c.estado === 'ANULADA'">✖ </span>
                    {{ c.estado }}
                  </span>
                </td>
                <td class="p-4 text-center">
                  <div class="flex items-center justify-center gap-3">
                    
                    <!-- Grupo 1: Documento -->
                    <div class="flex items-center gap-1">
                      <!-- Ver -->
                      <button (click)="$event.stopPropagation(); goToDetail(c.id!)"
                        class="p-2 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-lg transition-all" 
                        title="Ver">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                      </button>
                      
                      <!-- Editar -->
                      <button (click)="$event.stopPropagation(); goToEdit(c.id!)"
                        [disabled]="c.estado === 'ANULADA'"
                        class="p-2 bg-slate-50 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-all" 
                        title="Editar">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                      </button>
                    </div>

                    <!-- Separador -->
                    <div class="w-px h-5 bg-slate-200"></div>

                    <!-- Grupo 2: Financiero -->
                    <div class="flex items-center gap-1">
                      <button (click)="$event.stopPropagation(); openHistorialPagos(c.id!)"
                        [disabled]="!cp"
                        class="p-2 bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-all" 
                        title="Ver pagos">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20m10-10H2"></path></svg>
                      </button>
                      <button (click)="$event.stopPropagation(); openRegistrarPago(c)"
                        [disabled]="!cp || cp.estado === 'PAGADA'"
                        class="p-2 bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all shadow-sm" 
                        title="Registrar pago">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Footer con Paginación -->
          <div class="bg-slate-50/80 p-4 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
              <div class="text-[12px] text-slate-500 font-medium">
                  Mostrando <span class="font-bold text-slate-900">{{ (page * pageSize) + 1 }}</span> al 
                  <span class="font-bold text-slate-900">{{ Math.min((page + 1) * pageSize, totalRecords()) }}</span> 
                  de <span class="font-bold text-slate-900">{{ totalRecords() }}</span> compras
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
                      <span class="text-slate-400 text-[11px] font-medium px-2 uppercase tracking-tighter">de {{ totalPages }}</span>
                  </div>

                  <button (click)="nextPage()" 
                          [disabled]="(page + 1) * pageSize >= totalRecords() || loading"
                          class="btn-nav">
                    Siguiente
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </button>
              </div>
          </div>
        </div>

        <!-- CARDS — visible on mobile only -->
        <div class="flex flex-col gap-4 md:hidden">
          <div *ngFor="let c of filteredCompras"
               class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm cursor-pointer active:scale-[0.99] transition-transform"
               (click)="goToDetail(c.id!)">
            <div class="flex justify-between items-start mb-3">
              <div>
                <p class="font-bold text-slate-900 text-sm">{{ c.proveedores?.nombre ?? '—' }}</p>
                <p class="text-xs text-slate-400 mt-0.5">{{ formatFecha(c.fecha) }}</p>
                <p class="text-xs text-slate-500 font-medium mt-1">{{ c.bodegas?.nombre || '—' }}</p>
              </div>
              <span [class]="estadoBadgeClass(c.estado)" class="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide">
                {{ c.estado }}
              </span>
            </div>
            <div class="flex justify-between items-center pt-3 border-t border-slate-100">
              <div class="flex flex-col gap-1">
                <a (click)="$event.stopPropagation(); goToDetail(c.id!)" 
                   class="px-2 py-1 rounded bg-indigo-50 text-[11px] font-mono text-indigo-700 border border-indigo-100 transition-colors w-fit">
                  #{{ c.numero_factura || 'Sin factura' }}
                </a>
                <!-- Total siempre visible pero pequeño -->
                <span class="text-[10px] text-slate-500 font-medium">
                  Total Factura: {{ (c.total ?? 0) | currency:'COP':'symbol-narrow':'1.0-0' }}
                </span>
                
                <!-- Otros detalles de cartera si existen -->
                <div *ngIf="c.cuentas_por_pagar && c.cuentas_por_pagar[0]" class="text-[10px] text-slate-500 flex flex-col gap-0.5">
                   @let cpMob = c.cuentas_por_pagar[0];
                   <div class="flex items-center gap-1 font-medium">
                      <span>Vence: {{ cpMob.fecha_vencimiento | date:'dd/MM/yyyy' }}</span>
                      @let estadoFinMob = getEstadoFinanciero(cpMob);
                      <span [class]="estadoFinMob === 'PAGADA' ? 'text-emerald-600' : 
                                     estadoFinMob === 'VENCIDA' ? 'text-rose-600' : 
                                     'text-emerald-500'">
                        · {{ estadoFinMob }}
                      </span>
                   </div>
                </div>
              </div>

              <div class="flex flex-col items-end gap-1">
                <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Saldo Pendiente</p>
                <span class="font-bold text-slate-900 text-base tabular-nums">
                  <ng-container *ngIf="c.cuentas_por_pagar && c.cuentas_por_pagar[0]; else soloTotal">
                    {{ c.cuentas_por_pagar[0].saldo_actual | currency:'COP':'symbol-narrow':'1.0-0' }}
                  </ng-container>
                  <ng-template #soloTotal>
                    {{ (c.total ?? 0) | currency:'COP':'symbol-narrow':'1.0-0' }}
                  </ng-template>
                </span>
                <div *ngIf="c.cuentas_por_pagar && c.cuentas_por_pagar[0]" class="flex flex-col items-end gap-1">
                  @let estadoFinMobBadge = getEstadoFinanciero(c.cuentas_por_pagar[0]);
                  <span class="badge-premium mt-0.5 scale-90 origin-right rounded-full text-[10px] font-bold uppercase tracking-wider"
                        [class]="estadoFinMobBadge === 'PAGADA' ? 'bg-emerald-600 text-white' : 
                                 estadoFinMobBadge === 'VENCIDA' ? 'bg-rose-500 text-white' : 
                                 'bg-emerald-100 text-emerald-700 border border-emerald-200'">
                    {{ estadoFinMobBadge }}
                  </span>
                </div>
              </div>
            </div>
            <div class="mt-3 flex flex-wrap justify-end gap-2">
                <!-- Pago Actions (Mobile) -->
                <ng-container *ngIf="c.cuentas_por_pagar?.[0]; let cp">
                  <button (click)="$event.stopPropagation(); openHistorialPagos(c.id!)"
                    class="text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg">
                    Ver pagos
                  </button>
                  <button (click)="$event.stopPropagation(); openRegistrarPago(c)"
                    [disabled]="cp.estado === 'PAGADA'"
                    class="text-xs font-semibold text-white bg-indigo-600 border border-indigo-700 px-3 py-1.5 rounded-lg disabled:opacity-50">
                    Reg. Pago
                  </button>
                </ng-container>

                <!-- Borrador -->
                <button *ngIf="c.estado === 'BORRADOR'"
                  (click)="$event.stopPropagation(); goToEdit(c.id!)"
                  class="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg">
                  Editar
                </button>
                
                <!-- Confirmada -->
                <ng-container *ngIf="c.estado === 'CONFIRMADA'">
                  <button (click)="$event.stopPropagation(); goToDetail(c.id!)"
                    class="text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    Ver
                  </button>
                  <button (click)="$event.stopPropagation(); goToEdit(c.id!)"
                    class="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg">
                    Editar
                  </button>
                </ng-container>

                <!-- Anulada -->
                <button *ngIf="c.estado === 'ANULADA'"
                  (click)="$event.stopPropagation(); goToDetail(c.id!)"
                  class="text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  Ver
                </button>
            </div>
          </div>
        </div>
        </ng-container>

      <!-- HISTORIAL MODAL (Cartera Style) -->
      <div *ngIf="showHistorialModal()" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-in fade-in duration-200">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-200">
          <!-- Header -->
          <div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 class="text-lg font-bold text-slate-800">Historial de Pagos</h3>
            <button (click)="showHistorialModal.set(false)" class="text-slate-400 hover:text-slate-600 transition-colors">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <!-- Body -->
          <div class="p-6">
            <div class="mb-6 flex items-center justify-between">
              <div>
                <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Documento</p>
                <p class="text-sm font-mono font-bold text-indigo-600">Factura #{{ selectedCompra()?.numero_factura || '—' }}</p>
              </div>
              <div class="text-right">
                <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Pagado</p>
                <p class="text-lg font-bold text-slate-900 tabular-nums">
                  {{ totalPagado() | currency:'COP':'symbol':'1.0-0' }}
                </p>
              </div>
            </div>

            <!-- Loading State -->
            <div *ngIf="loadingPagos()" class="flex justify-center p-12">
              <div class="h-10 w-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>

            <div *ngIf="!loadingPagos()">
              <div *ngIf="pagos().length > 0; else sinPagos" class="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table class="w-full table-fixed text-sm border-collapse">
                  <thead>
                    <tr class="bg-slate-50 border-b border-slate-200">
                      <th class="p-3 w-28 text-xs font-semibold text-slate-500 uppercase tracking-wide text-left">Fecha</th>
                      <th class="p-3 w-24 text-xs font-semibold text-slate-500 uppercase tracking-wide text-left">Tipo</th>
                      <th class="p-3 w-32 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Monto</th>
                      <th class="p-3 w-32 text-xs font-semibold text-slate-500 uppercase tracking-wide text-left">Método</th>
                      <th class="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-left">Observación</th>
                      <th class="p-3 w-24 text-xs font-semibold text-slate-500 uppercase tracking-wide text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let p of pagos()" 
                        class="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition"
                        [class.opacity-60]="p.tipo_movimiento === 'REVERSO'">
                      <td class="p-3 align-middle text-slate-600 truncate">
                        {{ p.created_at | date:'dd/MM/yyyy' }}
                      </td>
                      <td class="p-3 align-middle">
                        <span *ngIf="p.tipo_movimiento === 'PAGO'" 
                              class="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700 font-medium whitespace-nowrap">
                          PAGO
                        </span>
                        <span *ngIf="p.tipo_movimiento === 'REVERSO'" 
                              class="px-2 py-0.5 text-xs rounded-full bg-red-50 text-red-600 border border-red-200 font-medium whitespace-nowrap">
                          REVERSO
                        </span>
                      </td>
                      <td class="p-3 align-middle text-right font-bold text-slate-900 tabular-nums">
                        {{ (p.tipo_movimiento === 'REVERSO' ? -p.monto : p.monto) | currency:'COP':'symbol':'1.0-0' }}
                      </td>
                      <td class="p-3 align-middle">
                        <span class="px-2 py-0.5 text-xs rounded-full bg-slate-200 text-slate-700 font-medium whitespace-nowrap uppercase">
                          {{ p.metodo_pago }}
                        </span>
                      </td>
                      <td class="p-3 align-middle text-slate-500 italic truncate" [title]="p.observacion || ''">
                        {{ p.observacion || '—' }}
                      </td>
                      <td class="p-3 align-middle text-center">
                        <button *ngIf="p.tipo_movimiento === 'PAGO' && !isPagoReversado(p)"
                                (click)="confirmarReverso(p)"
                                class="text-xs px-2 py-1 bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100 transition whitespace-nowrap">
                          Reversar
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <ng-template #sinPagos>
                <div class="text-center p-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p class="text-slate-400 italic text-sm">No hay pagos registrados para esta compra.</p>
                </div>
              </ng-template>
            </div>

            <!-- Footer -->
            <div class="pt-6 flex justify-end">
              <button (click)="showHistorialModal.set(false)" class="px-8 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all text-sm shadow-sm active:scale-95">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- PAGO MODAL -->
      <app-purchase-payment-modal
        [show]="showPagoModal()"
        [compra]="selectedCompra()"
        (onClose)="showPagoModal.set(false)"
        (onSaved)="onPagoSaved()">
      </app-purchase-payment-modal>
    </div>
  `,
  styles: [`
    .btn-nav { 
        @apply px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-all shadow-sm;
    }
    .badge-premium {
        font-size: 12px;
        line-height: 1;
        padding: 2px 8px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 20px;
    }
  `]
})
export class PurchasesListPage implements OnInit {
  filteredCompras: Compra[] = [];

  bodegas: { id: string; nombre: string }[] = [];

  loading = true;
  errorMessage: string | null = null;
  Math = Math;

  // Pagination
  page = 0;
  pageSize = 10;
  readonly totalRecords = signal(0);

  // Filters
  searchTerm: string = '';
  selectedStatus: string = '';
  selectedBodega: string = '';
  dateFrom: string = '';
  dateTo: string = '';

  // Modal states
  readonly showPagoModal = signal(false);
  readonly showHistorialModal = signal(false);
  readonly loadingPagos = signal(false);
  readonly pagos = signal<PagoProveedor[]>([]);
  readonly selectedCompra = signal<Compra | null>(null);
  readonly summary = signal<{ totalDeuda: number; vencidas: number; alDia: number } | null>(null);
  readonly totalPagado = computed(() => {
    return this.pagos().reduce((acc, p) => {
      if (p.tipo_movimiento === 'PAGO') return acc + Number(p.monto);
      if (p.tipo_movimiento === 'REVERSO') return acc - Number(p.monto);
      return acc;
    }, 0);
  });

  constructor(
    private readonly purchasesService: PurchasesService,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly uiService: UiService
  ) { }

  get isAdmin(): boolean {
    return this.authService.currentUserValue?.role === 'ADMIN';
  }

  async ngOnInit(): Promise<void> {
    this.uiService.setLoading(true);
    try {
      this.bodegas = await this.purchasesService.getBodegas();
      await Promise.all([
        this.loadCompras(),
        this.loadSummary()
      ]);
    } catch (err: any) {
      this.errorMessage = `Error al cargar datos iniciales: ${err.message}`;
      this.loading = false;
    }
    this.uiService.setLoading(false);
  }

  async loadCompras() {
    this.loading = true;
    this.uiService.setLoading(true);
    try {
      const result = await this.purchasesService.getPurchases({
        page: this.page,
        pageSize: this.pageSize,
        search: this.searchTerm,
        estado: this.selectedStatus as any,
        bodegaId: this.selectedBodega,
        fechaDesde: this.dateFrom,
        fechaHasta: this.dateTo
      });
      this.filteredCompras = result.data;
      this.totalRecords.set(result.total);
    } catch (err: any) {
      this.errorMessage = `Error al cargar compras: ${err.message}`;
    } finally {
      this.loading = false;
      this.uiService.setLoading(false);
    }
  }

  applyFilters() {
    this.page = 0;
    this.loadCompras();
  }

  nextPage() {
    if ((this.page + 1) * this.pageSize < this.totalRecords()) {
      this.page++;
      this.loadCompras();
    }
  }

  previousPage() {
    if (this.page > 0) {
      this.page--;
      this.loadCompras();
    }
  }

  get totalPages(): number {
    return Math.ceil(this.totalRecords() / this.pageSize);
  }

  clearDateFilter() {
    this.dateFrom = '';
    this.dateTo = '';
    this.applyFilters();
  }

  goToCreate(): void {
    this.router.navigate(['/purchases/new']);
  }

  async loadSummary() {
    try {
      const summary = await this.purchasesService.getFinancialSummary();
      this.summary.set(summary);
    } catch (err) {
      console.error('Error cargando resumen financiero', err);
    }
  }

  goToDetail(id: string): void {
    this.router.navigate(['/purchases', id]);
  }

  goToEdit(id: string): void {
    this.router.navigate(['/purchases', id, 'edit']);
  }

  estadoBadgeClass(estado?: string): string {
    const classes: Record<string, string> = {
      BORRADOR: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
      CONFIRMADA: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      ANULADA: 'bg-rose-50 text-rose-700 border border-rose-200',
    };
    return classes[estado ?? ''] ?? 'bg-slate-100 text-slate-600 border border-slate-200';
  }

  openRegistrarPago(c: Compra) {
    if (!c.cuentas_por_pagar?.[0] || c.cuentas_por_pagar[0].estado === 'PAGADA') return;
    this.selectedCompra.set(c);
    this.showPagoModal.set(true);
  }

  async onPagoSaved() {
    this.showPagoModal.set(false);
    await Promise.all([
      this.loadCompras(),
      this.loadSummary()
    ]);
    // TODO: Mostrar toast de éxito si hay un servicio de notificaciones global
  }

  async openHistorialPagos(id: string): Promise<void> {
    const compra = this.filteredCompras.find(c => c.id === id);
    if (!compra?.cuentas_por_pagar?.[0]) return;

    this.selectedCompra.set(compra);
    this.showHistorialModal.set(true);
    this.loadingPagos.set(true);
    try {
      const data = await this.purchasesService.getPagosByCompra(id);
      this.pagos.set(data);
    } catch (err) {
      console.error('Error cargando pagos', err);
      this.pagos.set([]);
    } finally {
      this.loadingPagos.set(false);
    }
  }

  isPagoReversado(pago: any): boolean {
    return this.pagos().some(p =>
      p.tipo_movimiento === 'REVERSO' &&
      p.pago_referencia_id === pago.id
    );
  }

  async confirmarReverso(pago: any) {
    const confirmacion = confirm('¿Está seguro de reversar este pago? Esta acción no se puede deshacer.');
    if (!confirmacion) return;

    try {
      this.loadingPagos.set(true);
      await this.purchasesService.reversarPago(pago.id);
      
      // Recargar historial de pagos
      if (this.selectedCompra()) {
        const data = await this.purchasesService.getPagosByCompra(this.selectedCompra()!.id!);
        this.pagos.set(data || []);
      }
      
      // Recargar lista principal para actualizar saldos
      await Promise.all([
        this.loadCompras(),
        this.loadSummary()
      ]);
    } catch (err: any) {
      console.error('Error al reversar pago:', err);
      alert('Error al reversar el pago: ' + (err.message || err));
    } finally {
      this.loadingPagos.set(false);
    }
  }

  getEstadoFinanciero(cuenta: any): string {
    if (!cuenta) return '';
    if (cuenta.estado === 'PAGADA') return 'PAGADA';
  
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const vencimiento = new Date(cuenta.fecha_vencimiento);
    vencimiento.setHours(0, 0, 0, 0);
  
    return vencimiento < hoy ? 'VENCIDA' : 'AL DIA';
  }

  formatFecha(fechaStr: string | undefined): string {
    if (!fechaStr) return '—';
    const parts = fechaStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return fechaStr;
  }
}
