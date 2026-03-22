import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UiService } from '../../../core/services/ui.service';

@Component({
   selector: 'app-sidebar',
   standalone: true,
   imports: [CommonModule, RouterModule],
   template: `
    <aside class="sidebar" [class.mobile-open]="(uiService.sidebarVisible$ | async)">
       <div class="logo-area">
          <div class="logo-img-wrap">
            <img src="logo_superior.png" alt="Brochas y Rodillos Superior" class="logo-img">
          </div>
          <button class="mobile-close-btn" (click)="uiService.setSidebarVisible(false)">
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>

       </div>
       
       <nav class="nav-links">
          <div class="nav-group">
            <span class="group-label">Operations</span>
            <a routerLink="/dashboard" routerLinkActive="active" class="nav-item" (click)="closeOnMobile()">
               <span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                  Dashboard
               </span>
            </a>
            <a routerLink="/sales" routerLinkActive="active" class="nav-item" (click)="closeOnMobile()">
               <span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                  Ventas
               </span>
            </a>
            <a routerLink="/cartera" routerLinkActive="active" class="nav-item" (click)="closeOnMobile()">
               <span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                  Cartera
               </span>
            </a>
             <a routerLink="/clients" routerLinkActive="active" class="nav-item" (click)="closeOnMobile()">
               <span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                  Clientes
               </span>
            </a>
            <a *ngIf="isAdmin" routerLink="/purchases" routerLinkActive="active" class="nav-item" (click)="closeOnMobile()">
               <span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                  Compras
               </span>
            </a>
            <a *ngIf="isAdmin" routerLink="/proveedores" routerLinkActive="active" class="nav-item" (click)="closeOnMobile()">
               <span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                  Proveedores
               </span>
            </a>
          </div>

          <div class="nav-group">
            <span class="group-label">Catalog & Stock</span>
            <a routerLink="/inventory" routerLinkActive="active" class="nav-item" (click)="closeOnMobile()">
               <span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                  Inventario
               </span>
            </a>
            <a routerLink="/showcase/all" routerLinkActive="active" class="nav-item" (click)="closeOnMobile()">
               <span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
                  Catálogo
               </span>
            </a>

          </div>

          <div class="nav-group">
            <span class="group-label">Management</span>
            <a routerLink="/zones" routerLinkActive="active" class="nav-item" (click)="closeOnMobile()">
               <span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg>
                  Zonas
               </span>
            </a>
            <a routerLink="/warehouses" routerLinkActive="active" class="nav-item" (click)="closeOnMobile()">
               <span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18v-8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z"></path><polyline points="12 3 2 7 22 7 12 3"></polyline><line x1="12" y1="21" x2="12" y2="10"></line></svg>
                  Bodegas
               </span>
            </a>
            <a routerLink="/map" routerLinkActive="active" class="nav-item" (click)="closeOnMobile()">
               <span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                  Geo-Ruta
               </span>
            </a>
            
            <a *ngIf="isAdmin" routerLink="/users" routerLinkActive="active" class="nav-item" (click)="closeOnMobile()">
                <span>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    Usuarios
                </span>
            </a>
          </div>
       </nav>
    </aside>
  `,
   styles: [`
    .sidebar {
      width: 260px;
      height: 100vh;
      background: var(--bg-surface);
      border-right: 1px solid var(--border-subtle);
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      padding: 1rem 0;
      transition: all 0.3s ease;
      z-index: 100;
    }

    @media (max-width: 767px) {
      .sidebar {
        position: fixed;
        left: -260px;
      }
      .sidebar.mobile-open {
        left: 0;
        box-shadow: 0 0 50px rgba(0,0,0,0.2);
      }
    }
    
    .logo-area {
      padding: 0.75rem 0.75rem 0.5rem 1rem;
      margin-bottom: 0.25rem;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }

    .mobile-close-btn {
      display: none;
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 0.5rem;
      border-radius: var(--radius-md);
    }

    @media (max-width: 767px) {
      .mobile-close-btn {
        display: block;
      }
    }
    
    .logo-img-wrap {
      width: 100%;
      display: flex;
      align-items: flex-start;
      justify-content: flex-start;
    }

    .logo-img {
      width: 100%;
      max-width: 240px;
      height: auto;
      max-height: 110px;
      object-fit: contain;
      object-position: left center;
      display: block;
    }
    
    .logo-sub {
      font-size: 0.72rem;
      color: var(--text-muted);
      margin-top: 2px;
      margin-left: 2px;
      font-weight: 500;
    }

    .text-primary { color: #f97316; }
    
    .nav-links {
      flex: 1;
      overflow-y: auto;
      padding: 0 0.75rem;
    }

    .nav-group {
      margin-bottom: 1.5rem;
    }

    .group-label {
      display: block;
      padding: 0 0.75rem 0.5rem;
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-muted);
      font-weight: 700;
    }
    
    .nav-item {
      display: flex;
      align-items: center;
      padding: 0.625rem 0.75rem;
      margin-bottom: 0.25rem;
      color: var(--text-secondary);
      transition: all 0.2s ease;
      border-radius: var(--radius-md);
      font-weight: 500;
      font-size: 0.875rem;
      
      &:hover {
        color: var(--text-main);
        background: var(--color-slate-100);
      }
      
      &.active {
        color: var(--color-primary);
        background: var(--color-slate-50);
        font-weight: 600;
      }
      
      span {
        display: flex;
        gap: 0.75rem;
        align-items: center;
      }

      svg { width: 18px; height: 18px; }
    }
  `]
})
export class SidebarComponent {
   currentUser$;

   constructor(private authService: AuthService, public uiService: UiService) {
      this.currentUser$ = this.authService.currentUser$;
   }

   get isAdmin(): boolean {
      // El AuthService mapea internamente 'admin_distribuidor' a 'ADMIN'
      return this.authService.currentUserValue?.role === 'ADMIN';
   }

   closeOnMobile() {
      if (window.innerWidth < 768) {
         this.uiService.setSidebarVisible(false);
      }
   }
}
