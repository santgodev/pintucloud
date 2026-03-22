import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Compra, PurchasesService } from '../../services/purchases.service';

@Component({
  selector: 'app-purchase-payment-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="show" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" (click)="close()"></div>
      
      <!-- Modal Container -->
      <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <!-- Header -->
        <div class="bg-indigo-600 px-6 py-4 flex justify-between items-center text-white">
          <div>
            <h3 class="font-bold text-lg">Registrar Pago</h3>
            <p class="text-indigo-100 text-[10px] uppercase tracking-wider font-medium">
              Factura: {{ compra?.numero_factura || 'Sin Factura' }}
            </p>
          </div>
          <button (click)="close()" class="hover:bg-white/10 p-1.5 rounded-full transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="p-6">
          <!-- Info Alert -->
          <div class="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-6 flex items-start gap-3">
             <div class="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20m10-10H2"></path></svg>
             </div>
             <div>
                <p class="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-0.5">Saldo Pendiente</p>
                <p class="text-lg font-bold text-slate-900">{{ saldoActual | currency:'COP':'symbol-narrow':'1.0-0' }}</p>
             </div>
          </div>

          <!-- Form Area -->
          <div class="space-y-4">
            <!-- Monto -->
            <div>
              <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Monto a pagar</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold">$</div>
                <input type="number" 
                       [(ngModel)]="monto" 
                       class="w-full pl-7 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold tabular-nums"
                       placeholder="0"
                       step="1000">
              </div>
              <p *ngIf="monto > saldoActual" class="mt-1.5 text-[11px] text-red-600 font-medium flex items-center gap-1">
                 <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                 El monto no puede superar el saldo pendiente.
              </p>
            </div>

            <!-- Método de Pago -->
            <div>
              <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Método de pago</label>
              <select [(ngModel)]="metodoPago" 
                      class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium">
                <option *ngFor="let m of metodosPago" [value]="m">{{ m }}</option>
              </select>
            </div>

            <!-- Observación -->
            <div>
              <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Observación (Opcional)</label>
              <textarea [(ngModel)]="observacion" 
                        class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm resize-none"
                        rows="2"
                        placeholder="Nota o referencia..."></textarea>
            </div>
          </div>

          <!-- Error Global -->
          <div *ngIf="error" class="mt-4 p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-xs font-medium animate-in fade-in duration-200">
              {{ error }}
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 bg-slate-50 flex gap-3 justify-end items-center border-t border-slate-100">
          <button (click)="close()" 
                  class="px-4 py-2 rounded-xl text-slate-600 font-semibold text-sm hover:bg-slate-200 transition-colors">
            Cancelar
          </button>
          <button (click)="guardarPago()" 
                  [disabled]="!isValid() || saving"
                  class="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 shadow-md shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2">
            <span *ngIf="saving" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            {{ saving ? 'Procesando...' : 'Guardar Pago' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class PurchasePaymentModalComponent {
  @Input() show = false;
  @Input() compra: Compra | null = null;
  
  @Output() onClose = new EventEmitter<void>();
  @Output() onSaved = new EventEmitter<void>();

  readonly metodosPago = ['EFECTIVO', 'TRANSFERENCIA'];

  // Use simple properties for two-way binding with ngModel
  monto: number = 0;
  metodoPago: string = 'EFECTIVO';
  observacion: string = '';

  saving = false;
  error: string | null = null;

  constructor(private purchasesService: PurchasesService) {}

  get saldoActual(): number {
    return this.compra?.cuentas_por_pagar?.[0]?.saldo_actual ?? 0;
  }

  isValid(): boolean {
    return this.monto > 0 && this.monto <= this.saldoActual && !!this.metodoPago;
  }

  close() {
    if (this.saving) return;
    this.resetForm();
    this.onClose.emit();
  }

  resetForm() {
    this.monto = 0;
    this.metodoPago = 'EFECTIVO';
    this.observacion = '';
    this.error = null;
  }

  async guardarPago() {
    if (!this.isValid() || !this.compra?.id) return;

    try {
      this.saving = true;
      this.error = null;

      await this.purchasesService.registrarPago({
        compraId: this.compra.id,
        monto: this.monto,
        metodo: this.metodoPago,
        observacion: this.observacion
      });

      this.resetForm();
      this.onSaved.emit();
    } catch (err: any) {
      this.error = typeof err === 'string' ? err : err.message || 'Error al registrar el pago';
    } finally {
      this.saving = false;
    }
  }
}
