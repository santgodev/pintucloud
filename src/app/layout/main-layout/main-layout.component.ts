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
      
      <!-- Global Loading Spinner Overlay -->
      <div class="global-spinner-overlay" *ngIf="uiService.isLoading$ | async">
         <div class="spinner-container">
            <svg class="circular-loader" viewBox="25 25 50 50">
               <circle class="loader-path" cx="50" cy="50" r="20" fill="none" stroke-width="4" stroke-miterlimit="10"></circle>
            </svg>
            <span class="loading-text">Cargando base de datos...</span>
         </div>
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

    /* Spinner Animation Styles */
    .global-spinner-overlay {
        position: fixed;
        inset: 0;
        background: rgba(255, 255, 255, 0.85); /* Light glassmorphism */
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    }
    .spinner-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
    }
    .loading-text {
        color: var(--color-primary);
        font-weight: 500;
        font-size: 0.95rem;
        letter-spacing: 0.5px;
        animation: pulseText 1.5s infinite;
    }
    .circular-loader {
        position: relative;
        width: 60px;
        height: 60px;
        animation: rotate 2s linear infinite;
        transform-origin: center center;
    }
    .loader-path {
        stroke: var(--color-primary);
        stroke-dasharray: 1, 200;
        stroke-dashoffset: 0;
        animation: dash 1.5s ease-in-out infinite, colorRotate 6s ease-in-out infinite;
        stroke-linecap: round;
    }
    @keyframes rotate {
        100% { transform: rotate(360deg); }
    }
    @keyframes dash {
        0% { stroke-dasharray: 1, 200; stroke-dashoffset: 0; }
        50% { stroke-dasharray: 89, 200; stroke-dashoffset: -35px; }
        100% { stroke-dasharray: 89, 200; stroke-dashoffset: -124px; }
    }
    @keyframes pulseText {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
    }
  `]
})
export class MainLayoutComponent {
  constructor(public uiService: UiService) { }
}
