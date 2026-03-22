import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ShowcaseService } from './services/showcase.service';

@Component({
  selector: 'app-showcase-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      <!-- Premium Top Bar -->
      <header class="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm transition-all duration-300">
        <div class="max-w-[1600px] mx-auto px-4 h-20 flex items-center justify-between gap-4 md:gap-8">
          
          <!-- Logo & Back -->
          <div class="flex items-center gap-4 md:gap-6">
            <button routerLink="/inventory" 
                    class="flex items-center gap-3 px-3 py-2 md:px-4 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-100 transition-all group shadow-sm border border-indigo-100/50">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="group-hover:-translate-x-1 transition-transform">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              <span class="hidden sm:block text-[10px] md:text-xs font-bold uppercase tracking-wider">Volver a Inventario</span>
              <span class="sm:hidden text-xs font-bold uppercase tracking-wider">Volver</span>
            </button>
            <div class="h-8 w-[1px] bg-slate-100 hidden lg:block"></div>
            <div class="flex flex-col hidden sm:flex">
              <span class="text-sm md:text-lg font-black text-slate-900 tracking-tighter uppercase leading-none">Pintucloud</span>
              <span class="text-[9px] md:text-[10px] font-bold text-indigo-600 uppercase tracking-[0.2em] leading-none mt-1">Catálogo Comercial</span>
            </div>
          </div>

          <!-- Middle Filter Area -->
          <div class="flex-1 max-w-3xl flex items-center gap-2 md:gap-4">
            <!-- Search Bar -->
            <div class="flex-1 relative group">
              <div class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </div>
              <input type="text" 
                     [(ngModel)]="searchQuery" 
                     (ngModelChange)="onFilterChange()"
                     placeholder="Buscar producto..."
                     class="w-full h-11 md:h-12 bg-slate-50 border border-slate-100 rounded-2xl pl-11 md:pl-12 pr-4 text-xs md:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all">
            </div>

            <!-- Custom Dynamic Category Selector (Floating) -->
            <div class="relative min-w-[140px] md:min-w-[220px]">
              <!-- Trigger -->
              <button (click)="toggleMenu()"
                      class="flex items-center justify-between w-full h-11 md:h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 md:px-5 text-[10px] md:text-xs font-bold text-slate-600 uppercase tracking-widest hover:bg-white hover:border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer">
                <span class="truncate">{{ selectedCategory === 'all' ? 'Todas las categorías' : selectedCategory }}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" 
                     [class.rotate-180]="isMenuOpen()" 
                     class="transition-transform duration-300 text-slate-400">
                  <path d="M7 10l5 5 5-5z"></path>
                </svg>
              </button>

              <!-- Floating Menu -->
              <div *ngIf="isMenuOpen()" 
                   class="absolute top-[calc(100%+8px)] left-0 w-full bg-white border border-slate-100 rounded-2xl shadow-2xl py-2 z-[9999] max-height-[400px] overflow-y-auto animate-in slide-in-from-top-2 duration-200">
                <button (click)="selectCategory('all')"
                        class="w-full px-5 py-3 text-left text-[10px] md:text-xs font-bold uppercase tracking-widest transition-colors"
                        [class.text-indigo-600]="selectedCategory === 'all'"
                        [class.bg-indigo-50]="selectedCategory === 'all'"
                        [class.text-slate-500]="selectedCategory !== 'all'"
                        [class.hover:bg-slate-50]="selectedCategory !== 'all'">
                  Todas las categorías
                </button>
                <button *ngFor="let cat of categories()"
                        (click)="selectCategory(cat)"
                        class="w-full px-5 py-3 text-left text-[10px] md:text-xs font-bold uppercase tracking-widest transition-colors truncate"
                        [class.text-indigo-600]="selectedCategory === cat"
                        [class.bg-indigo-50]="selectedCategory === cat"
                        [class.text-slate-500]="selectedCategory !== cat"
                        [class.hover:bg-slate-50]="selectedCategory !== cat">
                  {{ cat }}
                </button>
              </div>

              <!-- Click Outside Backdrop (Overlay behind dropdown) -->
              <div *ngIf="isMenuOpen()" 
                   (click)="isMenuOpen.set(false)" 
                   class="fixed inset-0 z-[-1] bg-transparent">
              </div>
            </div>
          </div>

          <!-- Branding Sign (Desktop Only) -->
          <div class="hidden xl:flex items-center gap-3 text-slate-300">
            <span class="text-[10px] font-bold uppercase tracking-widest">Est. 2026</span>
          </div>
        </div>
      </header>

      <!-- Content -->
      <main class="flex-1 overflow-y-auto">
        <router-outlet></router-outlet>
      </main>

      <!-- Simple Footer -->
      <footer class="py-8 border-t border-slate-100 flex flex-col items-center gap-2">
         <p class="text-[10px] font-bold text-slate-300 uppercase tracking-[0.3em]">Industrial Supply Co.</p>
         <div class="w-8 h-[1px] bg-slate-200"></div>
      </footer>
    </div>
  `,
  styles: [`
    :host { display: block; }
    /* Hide search query params from select arrows in some browers */
    select { cursor: pointer; }
  `]
})
export class ShowcaseLayoutComponent implements OnInit {
  searchQuery = '';
  selectedCategory = 'all';
  isMenuOpen = signal(false);
  readonly categories = signal<string[]>([]);

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private showcaseService: ShowcaseService
  ) { }

  ngOnInit() {
    // 1. Initial Categories Load
    this.showcaseService.getProducts().subscribe(products => {
      const uniqueCats = [...new Set(products.map(p => p.category))]
        .filter((cat): cat is string => !!cat)
        .sort((a, b) => a.localeCompare(b));
      this.categories.set(uniqueCats);
    });

    // 2. Sync UI with URL
    this.route.queryParamMap.subscribe(params => {
      this.searchQuery = params.get('q') || '';
      this.selectedCategory = params.get('cat') || 'all';
    });
  }

  onFilterChange() {
    this.router.navigate([], {
      queryParams: {
        q: this.searchQuery || null,
        cat: this.selectedCategory === 'all' ? null : this.selectedCategory
      },
      queryParamsHandling: 'merge'
    });
  }

  toggleMenu() {
    this.isMenuOpen.set(!this.isMenuOpen());
  }

  selectCategory(id: string) {
    this.selectedCategory = id;
    this.onFilterChange();
    this.isMenuOpen.set(false);
  }
}
