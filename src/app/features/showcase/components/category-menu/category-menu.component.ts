import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, NavigationEnd, RouterModule } from '@angular/router';
import { ShowcaseService, Category } from '../../services/showcase.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-category-menu',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="menu-nav">
      <div class="menu-header">CATEGORIES</div>
      <ul class="menu-list">
        <li class="menu-item" [class.active]="currentCategory === 'all'" (click)="navigate('all')">
          <span class="icon">grid_view</span>
          <span class="label">All Products</span>
        </li>
        <li class="menu-item" *ngFor="let cat of categories" [class.active]="currentCategory === cat.id" (click)="navigate(cat.id)">
          <span class="icon material-icons" *ngIf="false">{{cat.icon}}</span>
          <span class="label">{{cat.name}}</span>
          <span class="arrow">→</span>
        </li>
      </ul>
    </nav>
  `,
  styles: [`
    .menu-nav {
      padding: 0 1.5rem;
    }
    
    .menu-header {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: var(--color-text-muted);
      margin-bottom: 2rem;
      font-weight: 700;
      margin-top: 0.5rem;
      padding-left: 1rem; /* Align with list */
    }

    .menu-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .menu-item {
      display: flex;
      align-items: center;
      padding: 0.8rem 1rem;
      color: var(--color-text-muted);
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
      border-left: 2px solid transparent;
    }

    .menu-item:hover {
      color: var(--color-text-main);
      background-color: rgba(0,0,0,0.02);
    }

    /* INDUSTRIAL ACTIVE STATE */
    .menu-item.active {
      color: var(--color-text-main);
      font-weight: 700;
      background-color: #fff; /* White highlight block */
      border-left: 2px solid var(--color-accent);
      box-shadow: 0 2px 8px rgba(0,0,0,0.03);
    }

    .label {
      flex: 1;
      font-size: 0.9rem;
      letter-spacing: 0.5px;
      font-weight: 500;
    }

    .arrow {
      opacity: 0;
      transform: translateX(-5px);
      transition: all 0.3s;
      font-size: 1rem;
      color: var(--color-accent);
    }

    .menu-item:hover .arrow, .menu-item.active .arrow {
      opacity: 1;
      transform: translateX(0);
    }
  `]
})
export class CategoryMenuComponent implements OnInit {
  categories: Category[] = [];
  currentCategory: string = 'all';

  constructor(private showcaseService: ShowcaseService, private router: Router, private route: ActivatedRoute) { }

  ngOnInit() {
    this.showcaseService.getCategories().subscribe((cats: Category[]) => this.categories = cats);

    // Listen to route changes to update active state
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      const firstChild = this.route.snapshot.firstChild;
      if (firstChild) {
        const cat = firstChild.paramMap.get('category');
        this.currentCategory = cat || 'all';
      }
    });

    // Initial check
    const firstChild = this.route.snapshot.firstChild;
    if (firstChild) {
      const cat = firstChild.paramMap.get('category');
      this.currentCategory = cat || 'all';
    }
  }

  navigate(categoryId: string) {
    this.currentCategory = categoryId;
    this.router.navigate(['/showcase', categoryId]);
  }
}
