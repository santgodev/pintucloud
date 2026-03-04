import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../../../shared/shared.module';

@Component({
    selector: 'app-sales-receipt',
    standalone: true,
    imports: [CommonModule, SharedModule],
    template: `
    <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
        
        <!-- Success Animation Header (Screen Only) -->
        <div class="bg-success/10 p-6 flex flex-col items-center justify-center text-center border-b border-success/10 print:hidden shrink-0">
          <div class="w-12 h-12 bg-success text-white rounded-full flex items-center justify-center mb-2 shadow-lg shadow-success/30 animate-bounce-short">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>
          <h2 class="text-xl font-bold text-success-dark">¡Venta Exitosa!</h2>
        </div>

        <!-- Receipt Content (Scrollable on screen, Full on print) -->
        <div class="flex-1 overflow-y-auto bg-white relative p-6 print:p-0 print:overflow-visible" id="receipt-content">
            <!-- decorative ticket edges (Screen Only) -->
            <div class="absolute top-0 left-0 w-full h-4 -mt-2 bg-transparent bg-[length:20px_20px] bg-[radial-gradient(circle,transparent_50%,#fff_50%)] print:hidden"></div>

            <div class="space-y-4 print:space-y-2">
                
                <!-- Print Header -->
                <div class="hidden print:block text-center mb-6">
                    <h1 class="text-xl font-bold uppercase tracking-widest">BROCHAS Y RODILLOS SUPERIOR</h1>
                    <p class="text-sm text-slate-500">Comprobante de Venta</p>
                </div>

                <!-- Meta Info -->
                <div class="grid grid-cols-2 gap-4 text-sm border-b border-dashed border-slate-200 pb-4">
                    <div>
                        <span class="block text-muted text-xs uppercase">Fecha</span>
                        <span class="font-medium">{{ date | date:'short' }}</span>
                    </div>
                    <div class="text-right">
                        <span class="block text-muted text-xs uppercase">Factura</span>
                        <span class="font-mono font-bold text-primary">#{{ (numeroFactura || 0).toString().padStart(6, '0') }}</span>
                    </div>
                    <div>
                        <span class="block text-muted text-xs uppercase">Cliente</span>
                        <span class="font-medium truncate block">{{ clientName }}</span>
                    </div>
                    <div class="text-right">
                         <span class="block text-muted text-xs uppercase">Medio Pago</span>
                         <span class="font-medium">{{ paymentMethod }}</span>
                    </div>
                    <div>
                         <span class="block text-muted text-xs uppercase">Condición</span>
                         <span class="font-medium">{{ condicionPago }}</span>
                    </div>
                    <div class="text-right" *ngIf="condicionPago === 'CREDITO'">
                         <span class="block text-muted text-xs uppercase">Vencimiento</span>
                         <span class="font-medium text-amber-600">{{ fechaVencimiento | date:'dd MMM yyyy' }}</span>
                    </div>
                </div>

                <!-- Items Table -->
                <div class="py-2">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="text-muted text-xs uppercase tracking-wider text-left border-b border-slate-100">
                                <th class="pb-2 font-semibold">Desc</th>
                                <th class="pb-2 font-semibold text-center">Cant</th>
                                <th class="pb-2 font-semibold text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50">
                            <tr *ngFor="let item of items">
                                <td class="py-2 pr-2 leading-tight">
                                    <div class="font-medium text-main">{{ item.product.productName }}</div>
                                    <div class="text-[10px] text-muted">{{ item.product.price | currency:'COP':'symbol-narrow':'1.0-0' }} c/u</div>
                                </td>
                                <td class="py-2 px-1 text-center font-mono">{{ item.quantity }}</td>
                                <td class="py-2 pl-2 text-right font-medium">{{ item.subtotal | currency:'COP':'symbol-narrow':'1.0-0' }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                <!-- Totals -->
                <div class="border-t-2 border-slate-800 pt-2 mt-4">
                    <div class="flex justify-between items-center text-lg font-bold">
                        <span>TOTAL</span>
                        <span>{{ total | currency:'COP':'symbol-narrow':'1.0-0' }}</span>
                    </div>
                </div>

                <div class="text-center text-xs text-muted pt-6 print:pt-10">
                    <p>¡Gracias por su compra!</p>
                    <p class="mt-1">Brochas y Rodillos Superior</p>
                </div>
            </div>
        </div>

        <!-- Actions (Screen Only) -->
        <div class="p-6 bg-slate-50 border-t border-slate-100 flex flex-col gap-3 shrink-0 print:hidden">
            <button (click)="printReceipt()" class="btn btn-outline w-full flex items-center justify-center gap-2 py-3 hover:bg-white hover:border-primary hover:text-primary transition-all">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                Imprimir / Guardar PDF
            </button>
            
            <div class="grid grid-cols-2 gap-3">
                <button (click)="onNewSale.emit()" class="btn btn-primary w-full py-3">
                    Nueva Venta
                </button>
                <button (click)="onClose.emit()" class="px-4 py-3 rounded-lg border border-slate-200 text-slate-600 font-medium hover:bg-slate-100 transition-colors">
                    Cerrar
                </button>
            </div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .text-success-dark { color: #065f46; }
    .bg-success { background-color: #10b981; }
    .text-success { color: #10b981; }
    
    @keyframes bounce-short {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10%); }
    }
    .animate-bounce-short {
        animation: bounce-short 1s ease-in-out infinite;
    }

    @media print {
        :host {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: white;
            z-index: 9999;
             display: flex;
            align-items: flex-start;
            justify-content: center;
        }
        .print\\:hidden { display: none !important; }
        .print\\:block { display: block !important; }
        .print\\:p-0 { padding: 0 !important; }
        .print\\:space-y-2 > :not([hidden]) ~ :not([hidden]) { --tw-space-y-reverse: 0; margin-top: 0.5rem; margin-bottom: 0.5rem; }
        .print\\:overflow-visible { overflow: visible !important; }
        .print\\:pt-10 { padding-top: 2.5rem !important; }

        /* Reset styles for print cleanliness */
        body * { visibility: hidden; }
        #receipt-content, #receipt-content * { visibility: visible; }
        #receipt-content { position: absolute; left: 0; top: 0; width: 100%; max-width: 100%; }
        
        /* Ensure black text */
        * { color: black !important; text-shadow: none !important; box-shadow: none !important; }
    }
  `]
})
export class SalesReceiptComponent {
    @Input() saleId: string | null = null;
    @Input() numeroFactura: number | null = null;
    @Input() total: number = 0;
    @Input() items: any[] = [];
    @Input() clientName: string = '';
    @Input() paymentMethod: string = '';
    @Input() condicionPago: string = '';
    @Input() fechaVencimiento: string | null = null;

    @Output() onClose = new EventEmitter<void>();
    @Output() onNewSale = new EventEmitter<void>();

    date = new Date();

    printReceipt() {
        window.print();
    }
}
