import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../../services/showcase.service';

@Component({
  selector: 'app-product-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm transition-opacity" 
         (click)="close.emit()">
      <div class="relative w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in duration-300" 
           (click)="$event.stopPropagation()">
        
        <!-- Close Button -->
        <button (click)="close.emit()" 
                class="absolute top-3 right-3 z-10 w-9 h-9 flex items-center justify-center bg-white hover:bg-slate-100 rounded-xl text-slate-900 shadow-lg border border-slate-100 transition-all active:scale-95 group">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="group-hover:rotate-90 transition-transform duration-300">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div class="flex flex-col md:flex-row h-full">
          <!-- Image Section -->
          <div class="w-full md:w-3/5 aspect-square bg-slate-100 flex items-center justify-center overflow-hidden relative">
            <img *ngIf="product.imageUrl && !imageError()"
                 [src]="product.imageUrl" 
                 [alt]="product.name"
                 (error)="imageError.set(true)"
                 class="w-full h-full object-cover">
                 
            <!-- Fallback -->
            <div *ngIf="!product.imageUrl || imageError()" 
                 class="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-200">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              <span class="text-xs font-bold uppercase tracking-widest mt-4 text-slate-300">Imagen no disponible</span>
            </div>
          </div>

          <!-- Info Section -->
          <div class="w-full md:w-2/5 p-8 flex flex-col justify-center">
            <div class="mb-6">
              <span class="text-[10px] font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded-md mb-3 inline-block">
                {{ product.category }}
              </span>
              <h2 class="text-xl font-semibold text-slate-900 leading-tight mb-2 uppercase">{{ product.name }}</h2>
              <p class="text-xs text-slate-400 font-mono tracking-tighter">SKU: {{ product.sku || 'N/A' }}</p>
            </div>

            <div class="mb-4 md:mb-0">
              <p class="text-[26px] font-bold text-slate-900 leading-none">$ {{ product.price | number:'1.0-0' }}</p>
              <p class="text-[11px] font-medium text-slate-500 mt-2">Precio catálogo</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class ProductModalComponent {
  @Input({ required: true }) product!: Product;
  @Output() close = new EventEmitter<void>();

  readonly imageError = signal(false);
}
