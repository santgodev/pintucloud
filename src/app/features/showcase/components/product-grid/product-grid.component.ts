import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Observable, combineLatest } from 'rxjs';
import { map, startWith, switchMap } from 'rxjs/operators';
import { ShowcaseService, Product } from '../../services/showcase.service';
import { ProductCardComponent } from '../product-card/product-card.component';
import { ProductModalComponent } from '../product-modal/product-modal.component';

@Component({
  selector: 'app-product-grid',
  standalone: true,
  imports: [CommonModule, ProductCardComponent, ProductModalComponent],
  template: `
    <div class="px-4 md:px-8 pb-24 pt-2 max-w-[1600px] mx-auto animate-in fade-in duration-700">
      
      <!-- Section Header -->
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 border-b border-slate-100 pb-6">
        <div>
          <h2 class="text-3xl font-black text-slate-900 uppercase tracking-tighter">{{ categoryTitle() }}</h2>
          <p class="text-slate-400 text-sm mt-1">Explora nuestra colección de alta calidad</p>
        </div>
        <div class="text-right">
          <span class="bg-indigo-50 text-indigo-700 text-[11px] font-bold uppercase tracking-wider px-4 py-2 rounded-full border border-indigo-100 shadow-sm transition-all animate-in zoom-in duration-300">
            {{ productCountLabel() }}
          </span>
        </div>
      </div>
      
      <!-- Responsive Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-12">
        <app-product-card 
          *ngFor="let product of filteredProducts$ | async; trackBy: trackById" 
          [product]="product"
          (onView)="selectedProduct.set($event)">
        </app-product-card>
      </div>

      <!-- Empty State -->
      <div *ngIf="(filteredProducts$ | async)?.length === 0" 
           class="py-32 flex flex-col items-center justify-center text-center">
        <div class="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-200">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
        <h3 class="text-xl font-bold text-slate-900 mb-1">No encontramos productos</h3>
        <p class="text-slate-400 max-w-xs">Intenta con otros términos de búsqueda o cambia de categoría.</p>
      </div>

      <!-- Product Modal -->
      <app-product-modal 
        *ngIf="selectedProduct()" 
        [product]="selectedProduct()!"
        (close)="selectedProduct.set(null)">
      </app-product-modal>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }
  `]
})
export class ProductGridComponent implements OnInit {
  filteredProducts$!: Observable<Product[]>;
  readonly categoryTitle = signal('Todo el Catálogo');
  readonly productCountLabel = signal('Cargando productos...');
  readonly selectedProduct = signal<Product | null>(null);

  constructor(
    private route: ActivatedRoute,
    private showcaseService: ShowcaseService
  ) { }

  ngOnInit() {
    // 1. Get query params for search and category
    const search$ = this.route.queryParamMap.pipe(
      map(params => params.get('q')?.toLowerCase() || ''),
      startWith('')
    );

    const category$ = this.route.queryParamMap.pipe(
      map(params => params.get('cat') || 'all'),
      startWith('all')
    );

    // 2. Load all products and filter locally for maximum responsiveness
    this.filteredProducts$ = combineLatest([this.showcaseService.getProducts(), search$, category$]).pipe(
      map(([products, search, category]) => {
        // Update Title UI
        this.categoryTitle.set(category === 'all' ? 'Todo el Catálogo' : this.formatTitle(category));

        const filtered = products.filter(p => {
          const matchesSearch = !search ||
            p.name.toLowerCase().includes(search) ||
            p.sku?.toLowerCase().includes(search);

          const matchesCategory = category === 'all' ||
            p.category.toLowerCase() === category.toLowerCase();

          return matchesSearch && matchesCategory;
        });

        // Update Dynamic Label
        const total = filtered.length;
        if (search) {
          this.productCountLabel.set(`${total} ${total === 1 ? 'producto encontrado' : 'productos encontrados'}`);
        } else if (category !== 'all') {
          this.productCountLabel.set(`${total} ${total === 1 ? 'producto en' : 'productos en'} ${this.formatTitle(category)}`);
        } else {
          this.productCountLabel.set(`${total} ${total === 1 ? 'producto disponible' : 'productos disponibles'}`);
        }

        return filtered;
      })
    );
  }

  private formatTitle(id: string): string {
    return id.charAt(0).toUpperCase() + id.slice(1);
  }

  trackById(_: number, p: Product): string {
    return p.id;
  }
}
