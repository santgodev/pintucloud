import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { PurchasesService, Compra } from '../services/purchases.service';

@Component({
  selector: 'app-purchases-list',
  standalone: true,
  imports: [CommonModule, RouterModule, CurrencyPipe, DatePipe],
  template: `
    <div class="p-4 md:p-6 max-w-7xl mx-auto">

      <!-- Header -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 class="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Compras</h1>
          <p class="text-slate-500 mt-1 text-sm md:text-base">Registro de recepciones de mercancía e ingresos de inventario.</p>
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
      <div *ngIf="!loading && !errorMessage && compras.length === 0"
           class="text-center bg-white border border-dashed border-slate-300 rounded-2xl p-12">
        <svg class="mx-auto mb-4 text-slate-300" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
          <line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path>
        </svg>
        <p class="text-slate-400 font-medium mb-4">No hay compras registradas aún.</p>
        <button (click)="goToCreate()"
          class="text-indigo-600 font-semibold hover:underline text-sm">
          Crear la primera compra →
        </button>
      </div>

      <!-- Desktop: Table | Mobile: Cards -->
      <ng-container *ngIf="!loading && !errorMessage && compras.length > 0">

        <!-- TABLE — visible from md up -->
        <div class="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200">
                <th class="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Proveedor</th>
                <th class="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">N° Factura</th>
                <th class="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha</th>
                <th class="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                <th class="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Total</th>
                <th class="px-5 py-3.5"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr *ngFor="let c of compras"
                  class="hover:bg-slate-50/70 transition-colors cursor-pointer"
                  (click)="goToDetail(c.id!)">
                <td class="px-5 py-4 font-semibold text-slate-900 text-sm">
                  {{ c.proveedores?.nombre ?? '—' }}
                </td>
                <td class="px-5 py-4 text-slate-600 text-sm">
                  <span class="px-2 py-1 rounded bg-slate-100 text-[11px] font-mono text-slate-600 border border-slate-200">
                    {{ c.numero_factura ?? '—' }}
                  </span>
                </td>
                <td class="px-5 py-4 text-slate-500 text-sm">
                  {{ c.created_at | date:'dd/MM/yyyy HH:mm' }}
                </td>
                <td class="px-5 py-4">
                  <span [class]="estadoClass(c.estado)" class="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide">
                    {{ c.estado }}
                  </span>
                </td>
                <td class="px-5 py-4 text-right font-bold text-slate-900">
                  {{ (c.total ?? 0) | currency:'COP':'symbol-narrow':'1.0-0' }}
                </td>
                <td class="px-5 py-4 text-right">
                  <button *ngIf="c.estado === 'BORRADOR'"
                    (click)="$event.stopPropagation(); goToDetail(c.id!)"
                    class="text-xs font-semibold text-amber-600 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg transition-colors">
                    Continuar →
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- CARDS — visible on mobile only -->
        <div class="flex flex-col gap-4 md:hidden">
          <div *ngFor="let c of compras"
               class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm cursor-pointer active:scale-[0.99] transition-transform"
               (click)="goToDetail(c.id!)">
            <div class="flex justify-between items-start mb-3">
              <div>
                <p class="font-bold text-slate-900 text-sm">{{ c.proveedores?.nombre ?? '—' }}</p>
                <p class="text-xs text-slate-400 mt-0.5">{{ c.created_at | date:'dd/MM/yyyy HH:mm' }}</p>
              </div>
              <span [class]="estadoClass(c.estado)" class="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide">
                {{ c.estado }}
              </span>
            </div>
            <div class="flex justify-between items-center pt-3 border-t border-slate-100">
              <span class="px-2 py-1 rounded bg-slate-100 text-[11px] font-mono text-slate-600 border border-slate-200">
                {{ c.numero_factura ?? 'Sin factura' }}
              </span>
              <div class="flex items-center gap-3">
                <span class="font-bold text-slate-900 text-base">
                  {{ (c.total ?? 0) | currency:'COP':'symbol-narrow':'1.0-0' }}
                </span>
                <button *ngIf="c.estado === 'BORRADOR'"
                  (click)="$event.stopPropagation(); goToDetail(c.id!)"
                  class="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
                  Continuar →
                </button>
              </div>
            </div>
          </div>
        </div>

      </ng-container>
    </div>
  `,
})
export class PurchasesListPage implements OnInit {
  compras: Compra[] = [];
  loading = true;
  errorMessage: string | null = null;

  constructor(
    private purchasesService: PurchasesService,
    private router: Router
  ) { }

  async ngOnInit(): Promise<void> {
    try {
      this.compras = await this.purchasesService.getAll();
    } catch (err: any) {
      this.errorMessage = `Error al cargar compras: ${err.message}`;
    } finally {
      this.loading = false;
    }
  }

  goToCreate(): void {
    this.router.navigate(['/purchases/new']);
  }

  goToDetail(id: string): void {
    this.router.navigate(['/purchases', id]);
  }

  estadoClass(estado?: string): string {
    const classes: Record<string, string> = {
      BORRADOR: 'bg-amber-50 text-amber-700 border border-amber-200',
      CONFIRMADA: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      ANULADA: 'bg-rose-50 text-rose-700 border border-rose-200',
    };
    return classes[estado ?? ''] ?? 'bg-slate-100 text-slate-600 border border-slate-200';
  }
}
