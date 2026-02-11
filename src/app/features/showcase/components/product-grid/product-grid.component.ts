import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ShowcaseService, Product } from '../../services/showcase.service';
import { ProductCardComponent } from '../product-card/product-card.component';

@Component({
  selector: 'app-product-grid',
  standalone: true,
  imports: [CommonModule, ProductCardComponent],
  template: `
    <div class="grid-container">
      
      <div class="products-section">
        <!-- Editorial Title -->
        <h2 class="collection-title">{{categoryTitle}}</h2>
        
        <div class="products-grid">
          <app-product-card 
            *ngFor="let product of products$ | async" 
            [product]="product">
          </app-product-card>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .grid-container {
      width: 100%;
      min-height: 100%;
      padding-bottom: 8rem;
    }

    .products-section {
      width: 100%;
      max-width: 1600px; /* Wider container for grid */
      margin: 0 auto;
      padding: 1rem 1rem; /* Reduced padding since hero is gone */
    }

    .collection-title {
      font-family: 'Cinzel', serif;
      font-size: 1.5rem; /* Smaller title to save space */
      font-weight: 400;
      color: var(--color-text-main);
      margin-bottom: 1.5rem;
      text-align: left;
      border-bottom: 1px solid var(--color-border);
      padding-bottom: 0.5rem;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      opacity: 0.9;
    }

    .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); /* Allows 2 columns on 360px+ screens */
      gap: 1rem;
      row-gap: 2rem;
    }

    @media (min-width: 768px) {
        .products-grid {
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 2rem;
            row-gap: 4rem;
        }
    }
  `]
})
export class ProductGridComponent implements OnInit {
  products$!: Observable<Product[]>;
  categoryTitle: string = 'Catálogo General';

  constructor(
    private route: ActivatedRoute,
    private showcaseService: ShowcaseService
  ) { }

  ngOnInit() {
    this.products$ = this.route.paramMap.pipe(
      switchMap(params => {
        const categoryId = params.get('category');
        if (categoryId && categoryId !== 'all') {
          this.categoryTitle = this.formatTitle(categoryId);
          return this.showcaseService.getProducts(categoryId);
        } else {
          this.categoryTitle = 'Colección Destacada';
          return this.showcaseService.getProducts();
        }
      })
    );
  }

  private formatTitle(id: string): string {
    return id.charAt(0).toUpperCase() + id.slice(1);
  }
}
