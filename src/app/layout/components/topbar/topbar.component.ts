import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UiService } from '../../../core/services/ui.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="topbar">
       <div class="left-section">
         <button class="hamburger-btn" (click)="uiService.toggleSidebar()">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
         </button>
         
         <!-- Buscador global temporalmente oculto -->
         <div class="search-bar hidden">
           <span class="search-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
           </span>
           <input type="text" placeholder="Buscar clientes, productos..." class="search-input" />
         </div>
       </div>
       
       <div class="actions">
        <div class="relative">
          <button class="icon-btn" (click)="toggleNotificationMenu()">
             <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
             <span *ngIf="notificationService.unreadCount() > 0" class="badge-count">
                {{ notificationService.unreadCount() }}
             </span>
          </button>

          <!-- Notification Dropdown -->
          <div *ngIf="showNotificationMenu" class="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-fade-in-down">
             <div class="px-4 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <span class="text-sm font-bold text-slate-800">Notificaciones</span>
                <button (click)="markAllAsRead()" class="text-xs font-semibold text-indigo-600 hover:text-indigo-700">Marcar todo como leído</button>
             </div>
             
             <div class="max-h-96 overflow-y-auto">
                <div *ngFor="let notif of notificationService.notifications()" 
                     (click)="handleNotificationClick(notif)"
                     class="px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer"
                     [class.bg-indigo-50]="!notif.leida">
                   <div class="flex justify-between items-start mb-1">
                      <span class="text-sm font-bold text-slate-900">{{ notif.titulo }}</span>
                      <span class="text-[10px] text-slate-400">{{ notif.created_at | date:'HH:mm' }}</span>
                   </div>
                   <p class="text-xs text-slate-600 leading-relaxed">{{ notif.mensaje }}</p>
                </div>
                
                <div *ngIf="notificationService.notifications().length === 0" class="p-8 text-center">
                   <p class="text-sm text-slate-400 italic">No tienes notificaciones</p>
                </div>
             </div>
          </div>
        </div>
         
         <div class="relative" *ngIf="authService.currentUser$ | async as user">
             <div class="user-profile" (click)="toggleUserMenu()">
                <div class="avatar">
                   <img [src]="user.avatarUrl || 'https://ui-avatars.com/api/?name=' + user.fullName + '&background=4F46E5&color=fff'" alt="User">
                </div>
                <div class="info">
                   <span class="name">{{ user.fullName }}</span>
                   <span class="role">{{ (user.role === 'admin_distribuidor') ? 'Administrador' : 'Asesor' }}</span>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ml-1 text-slate-400"><polyline points="6 9 12 15 18 9"></polyline></svg>
             </div>

             <div *ngIf="showUserMenu" class="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-100 py-1 z-50 animate-fade-in-down">
                <button (click)="logout()" class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-slate-50 flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                    Cerrar Sesión
                </button>
             </div>
         </div>
         
         <button (click)="logout()" class="icon-btn text-red-500" title="Cerrar Sesión Forzoso" style="margin-left: 10px; color: #ef4444;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
         </button>
       </div>
    </header>

  `,
  styles: [`
    .topbar {
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1.5rem;
      background: var(--bg-surface);
      border-bottom: 1px solid var(--border-subtle);
      position: sticky;
      top: 0;
      z-index: 50;
    }

    .left-section {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .hamburger-btn {
      background: transparent;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.5rem;
      border-radius: var(--radius-md);
      transition: all 0.2s;

      &:hover {
        background: var(--color-slate-100);
        color: var(--color-primary);
      }
    }

    .search-bar {
      display: flex;
      align-items: center;
      background: var(--color-slate-100);
      padding: 0.5rem 1rem;
      border-radius: var(--radius-md);
      width: 320px;
      border: 1px solid transparent;
      transition: all 0.2s;

      &:focus-within {
        background: var(--color-white);
        border-color: var(--color-primary);
        box-shadow: 0 0 0 2px var(--color-primary-light);
      }
    }
    
    .search-input {
      background: transparent;
      border: none;
      color: var(--text-main);
      margin-left: 0.5rem;
      width: 100%;
      outline: none;
      font-size: 0.875rem;
      
      &::placeholder { color: var(--text-muted); }
    }

    .actions {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }

    .relative { position: relative; }

    .user-profile {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      border-radius: var(--radius-full);
      transition: background 0.2s;
      user-select: none;
      
      &:hover { background: var(--color-slate-50); }
    }

    .avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      overflow: hidden;
      border: 1px solid var(--border-subtle);
      background: var(--color-slate-100);
    }
    
    .avatar img { width: 100%; height: 100%; object-fit: cover; }

    .info {
      display: none;
      flex-direction: column;
      line-height: 1.2;
    }
    @media(min-width: 1024px) {
        .info { display: flex; }
    }
    
    .name { font-size: 0.875rem; font-weight: 600; color: var(--text-main); }
    .role { font-size: 0.7rem; color: var(--text-secondary); font-weight: 500; }

    .icon-btn {
      background: transparent;
      border: none;
      color: var(--text-secondary);
      font-size: 1.25rem;
      cursor: pointer;
      position: relative;
      display: flex;
      align-items: center;
      transition: color 0.2s;
      
      &:hover { color: var(--color-primary); }
    }

    .badge-count {
      position: absolute;
      top: -5px;
      right: -5px;
      min-width: 18px;
      height: 18px;
      padding: 0 4px;
      background: var(--color-danger);
      color: white;
      font-size: 10px;
      font-weight: bold;
      border-radius: 9px;
      border: 2px solid var(--bg-surface);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .animate-fade-in-down {
        animation: fadeInDown 0.2s ease-out forwards;
    }

    @keyframes fadeInDown {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
    }

    .hidden { display: none; }
    @media (min-width: 768px) {
      .md\\:flex { display: flex; }
    }
  `]
})
export class TopbarComponent implements OnInit {
  showUserMenu = false;
  showNotificationMenu = false;

  constructor(
    public authService: AuthService,
    public uiService: UiService,
    public notificationService: NotificationService,
    private router: Router
  ) { }

  ngOnInit() { }

  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
    this.showNotificationMenu = false;
  }

  toggleNotificationMenu() {
    this.showNotificationMenu = !this.showNotificationMenu;
    this.showUserMenu = false;
  }

  async markAllAsRead() {
    await this.notificationService.markAllAsRead();
  }

  handleNotificationClick(notif: any) {
    if (!notif.leida) {
      this.notificationService.markAsRead(notif.id);
    }
    
    if (notif.metadata?.venta_id) {
      // Redirigir a Cartera con el filtro de la factura si existe
      const navigationExtras = notif.metadata.numero_factura 
        ? { queryParams: { search: notif.metadata.numero_factura } } 
        : {};
        
      this.router.navigate(['/cartera'], navigationExtras);
      this.showNotificationMenu = false;
    }
  }

  logout() {
    this.authService.logout().then(() => {
      this.router.navigate(['/auth/login']);
    });
  }
}
