import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CategoryMenuComponent } from './components/category-menu/category-menu.component';

@Component({
  selector: 'app-showcase-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="editorial-shell">
      <header class="editorial-header">
        <div class="brand">
          <span class="brand-text">INVENTORY</span>
          <span class="brand-edition">CATÁLOGO N.º 1</span>
        </div>
        <nav class="editorial-nav">
          <a routerLink="/showcase/all" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="nav-link">Todo</a>
          <a routerLink="/showcase/rodillos" routerLinkActive="active" class="nav-link">Rodillos</a>
          <a routerLink="/showcase/brochas" routerLinkActive="active" class="nav-link">Brochas</a>
          <a routerLink="/dashboard" class="nav-link return-link">Volver</a>
        </nav>
      </header>
      
      <main class="editorial-content">
        <router-outlet></router-outlet>
      </main>

      <footer class="editorial-footer">
        <div class="footer-sign">
            <span>EST. 2026</span>
            <span>INDUSTRIAL SUPPLY Co.</span>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background-color: var(--color-bg-main);
    }

    .editorial-shell {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }

    .editorial-header {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 90px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 var(--spacing-xl);
      z-index: 100;
      background: rgba(18, 18, 18, 0.8); /* Semi-transparent matte */
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--color-border);
      transition: all 0.4s ease;
    }

    .brand {
      display: flex;
      flex-direction: column;
      line-height: 1;
    }

    .brand-text {
      font-size: 1.2rem;
      font-weight: 800;
      letter-spacing: 0.25em;
      color: var(--color-text-main);
      text-transform: uppercase;
    }

    .brand-edition {
      font-size: 0.6rem;
      color: var(--color-accent);
      letter-spacing: 0.4em;
      text-transform: uppercase;
      margin-top: 4px;
      font-weight: 600;
    }

    .editorial-nav {
      display: flex;
      gap: var(--spacing-lg);
    }

    .nav-link {
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: var(--color-text-secondary);
      font-weight: 500;
      position: relative;
      padding: 0.5rem 0;

      &::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        width: 0;
        height: 1px;
        background-color: var(--color-accent);
        transition: width 0.3s ease;
      }

      &:hover, &.active {
        color: var(--color-text-main);
        
        &::after {
          width: 100%;
        }
      }
    }

    .editorial-content {
      padding-top: 90px; /* Offset fixed header */
      flex: 1;
      animation: fadeIn 0.8s ease-out;
    }

    .editorial-footer {
        padding: var(--spacing-lg) var(--spacing-xl);
        border-top: 1px solid var(--color-border);
        display: flex;
        justify-content: center;
        opacity: 0.5;
    }

    .footer-sign {
        display: flex;
        gap: var(--spacing-md);
        font-size: 0.7rem;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: var(--color-text-muted);
    }

    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class ShowcaseLayoutComponent { }
