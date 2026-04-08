import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../../services/showcase.service';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <article class="group relative bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 border border-slate-100 cursor-pointer"
             (click)="onView.emit(product)">
      
      <!-- Image Container -->
      <div class="relative aspect-[4/5] overflow-hidden bg-slate-50">
        <!-- New Badge -->
        <span *ngIf="product.isNew" 
              class="absolute top-4 left-4 z-10 px-3 py-1 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg shadow-lg">
          Nuevo
        </span>

        <!-- Product Image -->
        <img *ngIf="product.imageUrl && !imageError()"
             [src]="product.imageUrl" 
             [alt]="product.name"
             (error)="imageError.set(true)"
             class="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110">

        <!-- Image Fallback / No Image -->
        <div *ngIf="!product.imageUrl || imageError()" 
             class="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-200">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
          <span class="text-[10px] font-bold uppercase tracking-widest mt-2 text-slate-300">Sin imagen</span>
        </div>

        <!-- Hover Overlay -->
        <div class="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-3 backdrop-blur-[2px]">
          <button (click)="onView.emit(product); $event.stopPropagation()"
                  class="w-[140px] py-2.5 bg-white text-slate-900 text-[10px] md:text-xs font-bold uppercase tracking-widest rounded-full shadow-2xl transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 hover:bg-indigo-600 hover:text-white flex items-center justify-center gap-2">
            <span>🔍</span> Ver imagen
          </button>
          <button (click)="shareProduct(product); $event.stopPropagation()"
                  class="w-[140px] py-2.5 bg-slate-50/90 text-slate-700 text-[10px] md:text-xs font-bold uppercase tracking-widest rounded-full shadow-2xl transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 hover:bg-indigo-600 hover:text-white flex items-center justify-center gap-2">
            <span>📤</span> Compartir
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="p-5">
        <div class="mb-4">
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block group-hover:text-indigo-500 transition-colors">
            {{ product.category }}
          </span>
          <h3 class="text-sm font-extrabold text-slate-900 leading-tight uppercase line-clamp-2 h-10">
            {{ product.name }}
          </h3>
          <p class="text-[10px] text-slate-400 font-mono mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            SKU: {{ product.sku || 'N/A' }}
          </p>
        </div>

        <div class="flex items-center justify-between pt-4 border-t border-slate-50">
          <div class="flex flex-col">
            <span class="text-lg font-black text-slate-900 leading-tight">
              $ {{ product.price | number:'1.0-0' }}
            </span>
            <!-- Stock Status -->
            <div class="flex items-center gap-1.5 mt-1">
              <span class="relative flex h-2 w-2">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                      [ngClass]="{
                        'bg-emerald-400': product.stock > 10,
                        'bg-amber-400': product.stock > 0 && product.stock <= 10,
                        'bg-rose-400': product.stock === 0
                      }"></span>
                <span class="relative inline-flex rounded-full h-2 w-2"
                      [ngClass]="{
                        'bg-emerald-500': product.stock > 10,
                        'bg-amber-500': product.stock > 0 && product.stock <= 10,
                        'bg-rose-500': product.stock === 0
                      }"></span>
              </span>
              <span class="text-[10px] font-bold uppercase tracking-wider"
                    [ngClass]="{
                      'text-emerald-600': product.stock > 10,
                      'text-amber-600': product.stock > 0 && product.stock <= 10,
                      'text-rose-600': product.stock === 0
                    }">
                {{ getStockStatusLabel(product.stock) }}
              </span>
            </div>
          </div>
          <div class="p-2.5 bg-slate-50 text-slate-400 rounded-xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all transform group-hover:rotate-12">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M15 3h6v6"></path>
              <path d="M10 14 21 3"></path>
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            </svg>
          </div>
        </div>
      </div>
    </article>
  `,
  styles: [`
    :host { display: block; height: 100%; }
  `]
})
export class ProductCardComponent {
  @Input({ required: true }) product!: Product;
  @Output() onView = new EventEmitter<Product>();

  readonly imageError = signal(false);

  getStockStatusLabel(stock: number): string {
    if (stock === 0) return 'Agotado';
    if (stock <= 10) return 'Bajo stock';
    return 'Disponible';
  }

  async shareProduct(product: Product) {
    const url = `${window.location.origin}/showcase?q=${product.sku || product.name}`;
    const shareText = `Mira este producto de Pintucloud: ${product.name}`;

    try {
      // 1. Try to fetch the image and convert to File for rich sharing
      if (product.imageUrl && !this.imageError() && navigator.share && typeof File !== 'undefined') {
        try {
          const response = await fetch(product.imageUrl);
          const blob = await response.blob();
          const file = new File([blob], 'producto.jpg', { type: blob.type });

          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: product.name,
              text: shareText,
              url: url,
              files: [file]
            });
            return; // Success
          }
        } catch (e) {
          console.warn('Could not fetch image for sharing:', e);
          // Fallback to text share below
        }
      }

      // 2. Fallback to native text share if file share fails or isn't supported
      if (navigator.share) {
        await navigator.share({
          title: product.name,
          text: shareText,
          url: url
        });
      } else {
        // 3. Last fallback: Clipboard
        await navigator.clipboard.writeText(url);
        alert("¡Enlace copiado al portapapeles! Ya puedes compartirlo.");
      }
    } catch (error) {
      console.error('Error sharing product:', error);
    }
  }
}
