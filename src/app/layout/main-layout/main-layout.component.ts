import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from '../components/sidebar/sidebar.component';
import { TopbarComponent } from '../components/topbar/topbar.component';
import { UiService } from '../../core/services/ui.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent, TopbarComponent],
  template: `
    <div class="layout-wrapper" [class.sidebar-hidden]="!(uiService.sidebarVisible$ | async)">
      <div class="sidebar-overlay" (click)="uiService.setSidebarVisible(false)"></div>
      <app-sidebar class="app-sidebar"></app-sidebar> 
      
      <div class="layout-main">
         <app-topbar></app-topbar>
         <main class="layout-content">
            <router-outlet></router-outlet>
         </main>
      </div>
    </div>
  `,
  styles: [`
    .layout-wrapper {
      display: flex;
      height: 100vh;
      overflow-x: hidden;
      overflow-y: auto;
      background: transparent;
    }
    
    .layout-main {
      width: 100%;
      margin: 0 auto;
      flex: 1;
      display: flex;
      flex-direction: column;
      position: relative;
    }

    @media (min-width: 1024px) {
        .layout-main {
            max-width: 1400px;
        }
    }
    
    .layout-content {
      flex: 1;
      overflow-y: auto;
      padding: var(--spacing-lg);
    }

    .app-sidebar {
        display: flex;
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .sidebar-overlay {
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.5);
        backdrop-filter: blur(4px);
        z-index: 90;
        opacity: 0;
        transition: opacity 0.3s ease;
        pointer-events: none;
    }

    .sidebar-hidden .app-sidebar {
        margin-left: -260px;
        transform: translateX(-100%);
    }

    @media (max-width: 768px) {
        .layout-main {
            max-width: 100% !important;
            padding: 12px;
        }

        .layout-content {
            padding: 12px;
        }

        .app-sidebar {
            position: fixed;
            z-index: 100;
            left: 0;
        }

        .layout-wrapper:not(.sidebar-hidden) .sidebar-overlay {
            display: block;
            opacity: 1;
            pointer-events: auto;
        }
    }
  `]
})
export class MainLayoutComponent {
  constructor(public uiService: UiService) { }
}
