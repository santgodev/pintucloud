import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product, ShowcaseService } from '../../services/showcase.service';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <article class="mobile-catalog-card" (click)="toggleActive()" [class.active]="isActive" [class.zoom-out]="product.category === 'brochas'">
      <div class="image-frame">
        <span class="badge-new" *ngIf="product.isNew">NUEVO</span>
        <img [src]="product.imageUrl" [alt]="product.name" class="product-image">
        
        <!-- Interaction Overlay -->
        <div class="interaction-overlay" *ngIf="isActive">
          <div class="action-buttons">
            <button class="action-btn primary" (click)="onAddQuantity($event)">
              <span class="icon">+</span>
              <span>Añadir Cantidad</span>
            </button>
            <button class="action-btn secondary" (click)="onCheckInventory($event)" [disabled]="isLoadingStock">
              <span class="icon" *ngIf="!isLoadingStock">?</span>
              <span class="icon animate-spin" *ngIf="isLoadingStock">⟳</span>
              <span *ngIf="stock === null">Consultar Inventario</span>
              <span *ngIf="stock !== null">Stock: {{ stock }}</span>
            </button>
          </div>
        </div>
      </div>

      <div class="minimal-info">
        <h3 class="product-name">{{ product.name }}</h3>
        <span class="price">$ {{ product.price | number:'1.0-0' }}</span>
      </div>
    </article>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }

    .mobile-catalog-card {
      display: flex;
      flex-direction: column;
      height: 100%;
      cursor: pointer;
      position: relative;
    }

    /* IMAGE FRAME */
    .image-frame {
      position: relative;
      width: 100%;
      aspect-ratio: 3/4;
      overflow: hidden;
      background-color: var(--color-bg-surface);
      border-radius: var(--radius-sm);
    }

    .product-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transform: scale(1.03) translateZ(0); /* Normalized zoom for all rollers/others */
      transition: transform 0.4s ease;
      will-change: transform;
    }

    .mobile-catalog-card.zoom-out .product-image {
        /* Brushes specific zoom */
        transform: scale(1.01) translateZ(0); 
    }

    .mobile-catalog-card:hover .product-image {
        transform: scale(1.08);
    }
    
    .mobile-catalog-card.zoom-out:hover .product-image {
        transform: scale(1.05); 
    }

    .badge-new {
      position: absolute;
      top: 0.5rem;
      left: 0.5rem;
      background: var(--color-accent);
      color: white;
      font-size: 0.6rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      padding: 0.2rem 0.5rem;
      z-index: 2;
      border-radius: 2px;
    }

    /* INTERACTION OVERLAY */
    .interaction-overlay {
      position: absolute;
      inset: 0;
      background: rgba(18, 18, 18, 0.85); /* Dark matte overlay */
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
      animation: fadeIn 0.2s ease-out;
    }

    .action-buttons {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      width: 80%;
    }

    .action-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.75rem;
      border: none;
      font-weight: 600;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      cursor: pointer;
      transition: all 0.2s;
      border-radius: var(--radius-sm);
      width: 100%;

      .icon {
        font-size: 1.1rem;
        line-height: 1;
      }
      
      &.animate-spin {
         animation: spin 1s linear infinite;
      }
    }

    .action-btn.primary {
      background-color: var(--color-accent);
      color: white;
      box-shadow: 0 4px 12px rgba(212, 77, 40, 0.3);

      &:active {
        transform: scale(0.96);
      }
    }

    .action-btn.secondary {
      background-color: transparent;
      border: 1px solid rgba(255,255,255,0.3);
      color: white;

      &:active {
        background-color: rgba(255,255,255,0.1);
      }
    }

    /* MINIMAL INFO */
    .minimal-info {
      padding-top: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .product-name {
      font-size: 0.9rem;
      font-weight: 500;
      color: var(--color-text-main);
      margin: 0;
      line-height: 1.2;
      letter-spacing: 0.01em;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .price {
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--color-accent);
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
  `]
})
export class ProductCardComponent {
  @Input() product!: Product;
  isActive: boolean = false;
  stock: number | null = null;
  isLoadingStock = false;

  constructor(private showcaseService: ShowcaseService) { }

  toggleActive() {
    this.isActive = !this.isActive;
    // Reset stock view on toggle if desired, or keep it
  }

  onAddQuantity(event: Event) {
    event.stopPropagation();
    console.log('Add quantity for', this.product.name);
  }

  onCheckInventory(event: Event) {
    event.stopPropagation();

    if (this.stock !== null) return; // Already loaded

    this.isLoadingStock = true;
    this.showcaseService.getStock(this.product.id).subscribe({
      next: (qty) => {
        this.stock = qty;
        this.isLoadingStock = false;
      },
      error: (err) => {
        console.error(err);
        this.isLoadingStock = false;
        this.stock = 0; // Default to 0 on error
      }
    });
  }
}
