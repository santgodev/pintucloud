import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SalesService } from './services/sales.service';
import { SharedModule } from '../../shared/shared.module';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-sales-detail',
    standalone: true,
    imports: [CommonModule, RouterModule, SharedModule],
    template: `
    <div class="p-6 bg-slate-50 min-h-screen animate-in fade-in duration-500" *ngIf="sale">
      <!-- Header -->
      <div class="flex justify-between items-center mb-6">
        <div class="flex items-center gap-4">
          <button (click)="goBack()" class="p-2 hover:bg-white rounded-full transition-all text-slate-400 hover:text-indigo-600">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <div>
            <h1 class="text-2xl font-bold text-slate-900">Factura #{{ sale.numero_factura?.toString().padStart(6, '0') || '---' }}</h1>
            <p class="text-sm text-slate-500">{{ sale.fecha | date:'dd-MMM-yyyy' | lowercase }}</p>
          </div>
        </div>

        <div class="flex gap-3">
          <button 
            *ngIf="sale.estado === 'CONFIRMADA' && isAdmin()"
            (click)="anularVenta()"
            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-semibold shadow-sm flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
            Anular Venta
          </button>
        </div>
      </div>

      <!-- Content Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <!-- Info Principal -->
        <div class="lg:col-span-2 space-y-6">
          <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 class="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Detalle de Productos</h3>
            <table class="w-full">
              <thead>
                <tr class="text-left text-slate-400 text-xs uppercase tracking-tighter border-b border-slate-100">
                  <th class="pb-3 font-semibold">Producto</th>
                  <th class="pb-3 font-semibold text-center">Cant</th>
                  <th class="pb-3 font-semibold text-right">Precio</th>
                  <th class="pb-3 font-semibold text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-50">
                <tr *ngFor="let item of sale.detalle_ventas" class="text-sm">
                  <td class="py-4">
                    <p class="font-bold text-slate-800">{{ item.productos?.nombre }}</p>
                    <p class="text-[11px] text-slate-400 uppercase">{{ item.productos?.sku }}</p>
                  </td>
                  <td class="py-4 text-center font-medium">{{ item.cantidad }}</td>
                  <td class="py-4 text-right text-slate-600">{{ item.precio_unitario | currency:'COP':'symbol-narrow':'1.0-0' }}</td>
                  <td class="py-4 text-right font-bold text-slate-900">{{ item.subtotal | currency:'COP':'symbol-narrow':'1.0-0' }}</td>
                </tr>
              </tbody>
            </table>

            <div class="mt-8 flex justify-end border-t border-slate-100 pt-6">
              <div class="w-full max-w-[240px] space-y-3">
                <div class="flex justify-between text-slate-500 text-sm font-medium">
                  <span>Subtotal</span>
                  <span>{{ sale.total | currency:'COP':'symbol-narrow':'1.0-0' }}</span>
                </div>
                <div class="flex justify-between text-slate-900 text-lg font-black pt-2">
                  <span>TOTAL</span>
                  <span class="text-indigo-600">{{ sale.total | currency:'COP':'symbol-narrow':'1.0-0' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar Info -->
        <div class="space-y-6">
          <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 class="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Resumen</h3>
            
            <div class="space-y-4">
              <div>
                <label class="text-[11px] text-slate-400 uppercase font-bold tracking-widest block mb-1">Estado</label>
                <span class="px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest border"
                      [ngClass]="{
                        'bg-green-100 text-green-700 border-green-200': sale.estado === 'CONFIRMADA',
                        'bg-yellow-100 text-yellow-700 border-yellow-200': sale.estado === 'BORRADOR',
                        'bg-red-100 text-red-700 border-red-200': sale.estado === 'ANULADA'
                      }">
                  {{ sale.estado }}
                </span>
              </div>

              <div>
                <label class="text-[11px] text-slate-400 uppercase font-bold tracking-widest block mb-1">Cliente</label>
                <p class="text-sm font-bold text-slate-800">{{ sale.clientName }}</p>
              </div>

              <div>
                <label class="text-[11px] text-slate-400 uppercase font-bold tracking-widest block mb-1">Asesor</label>
                <p class="text-sm font-bold text-slate-800">{{ sale.vendedorName || 'Sistema' }}</p>
              </div>

              <div>
                <label class="text-[11px] text-slate-400 uppercase font-bold tracking-widest block mb-1">ID Transacción</label>
                <p class="text-[11px] font-mono text-slate-400 break-all bg-slate-50 p-2 rounded border border-slate-100 italic">{{ sale.id }}</p>
              </div>
            </div>
          </div>

          <div class="bg-indigo-600 rounded-2xl p-6 shadow-lg shadow-indigo-200 text-white">
            <h3 class="text-sm font-bold text-indigo-200 uppercase tracking-wider mb-2">Ayuda Posventa</h3>
            <p class="text-xs text-indigo-100 leading-relaxed mb-4">Recuerda que las ventas anuladas no pueden revertirse y devuelven el stock automáticamente a la bodega correspondiente.</p>
            <div class="h-1 w-full bg-white/20 rounded-full"></div>
          </div>
        </div>

      </div>
    </div>

    <!-- Loading state -->
    <div *ngIf="!sale" class="flex flex-col items-center justify-center min-h-screen gap-4">
       <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
       <p class="text-slate-500 font-medium animate-pulse">Cargando detalle de venta...</p>
    </div>
  `
})
export class SalesDetailComponent implements OnInit {
    sale: any;
    private authService = inject(AuthService);
    private salesService = inject(SalesService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);

    isAdmin = this.authService.isAdmin;

    constructor() { }

    async ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id');
        if (!id) {
            this.router.navigate(['/sales']);
            return;
        }

        try {
            this.sale = await this.salesService.getById(id);


            // Fallback para nombres virtuales si no vienen del servicio
            if (!this.sale.vendedorName && this.sale.usuarios) {
                this.sale.vendedorName = this.sale.usuarios.nombre_completo;
            }
        } catch (error) {
            console.error('Error al cargar venta:', error);
            this.router.navigate(['/sales']);
        }
    }

    goBack() {
        this.router.navigate(['/sales']);
    }

    async anularVenta() {
        if (!confirm('¿Confirmar anulación de esta venta? Esta acción es irreversible.')) return;

        try {
            await this.salesService.anularVenta(this.sale.id);
            alert('Venta anulada correctamente.');
            this.router.navigate(['/sales']);
        } catch (error) {
            console.error('Error al anular la venta:', error);
            alert('Error al anular la venta.');
        }
    }
}
