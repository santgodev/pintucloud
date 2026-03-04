import { Component, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Client } from '../../services/clients.service';

@Component({
   selector: 'app-client-detail-modal',
   standalone: true,
   imports: [CommonModule],
   template: `
    <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
       <div class="bg-white border border-slate-200 rounded-xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
          
          <div class="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
             <h2 class="text-xl font-bold text-main">Detalle del Cliente</h2>
             <button (click)="onClose.emit()" class="text-muted hover:text-main">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
             </button>
          </div>

          <div class="p-6 space-y-4" *ngIf="client">
             <div class="flex items-center gap-4 mb-6">
                <div class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold border border-primary/20">
                    {{ client.razon_social.charAt(0) }}
                </div>
                <div>
                     <h3 class="font-bold text-xl text-main">{{ client.razon_social }}</h3>
                     <span class="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">{{ client.codigo }}</span>
                     <p class="text-xs text-muted mt-0.5">{{ client.ciudad }}</p>
                </div>
             </div>

             <div class="space-y-3">
                 <div class="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <label class="block text-xs uppercase text-muted font-bold mb-1">Asesor Asignado</label>
                    <div class="flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="text-primary" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        <span class="font-medium text-main">{{ client.advisorName }}</span>
                    </div>
                 </div>

                 <div class="grid grid-cols-2 gap-3">
                    <div class="p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <label class="block text-xs uppercase text-muted font-bold mb-1">Email</label>
                         <p class="text-sm text-main truncate" [title]="client.email">{{ client.email || 'N/A' }}</p>
                    </div>
                     <div class="p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <label class="block text-xs uppercase text-muted font-bold mb-1">Teléfono</label>
                         <p class="text-sm text-main">{{ client.phone || 'N/A' }}</p>
                    </div>
                 </div>
                 
                 <div class="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <label class="block text-xs uppercase text-muted font-bold mb-1">Dirección</label>
                     <p class="text-sm text-main">{{ client.address }}</p>
                </div>

                 <div class="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <label class="block text-xs uppercase text-muted font-bold mb-1">Última Compra</label>
                     <p class="text-sm text-main">{{ client.lastBuy }}</p>
                 </div>
             </div>
             
             <div class="pt-4 mt-2 grid grid-cols-2 gap-3">
                 <button class="btn btn-outline flex items-center justify-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                    Contactar
                 </button>
                 <button class="btn btn-primary flex items-center justify-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                    Editar
                 </button>
             </div>
          </div>
       </div>
    </div>
  `
})
export class ClientDetailModalComponent {
   @Input() client: Client | null = null;
   @Output() onClose = new EventEmitter<void>();
}
