import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../../shared/shared.module';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Observable, from, BehaviorSubject } from 'rxjs';
import { UserFormComponent } from './user-form.component';
import { UiService } from '../../../core/services/ui.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, SharedModule, UserFormComponent],
  template: `
    <div class="mb-8 p-4 animate-in fade-in duration-500">
      
      <!-- HEADER AND ACTION -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <div class="p-2 bg-primary/10 rounded-lg text-primary">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            </div>
            Gestión de Usuarios
          </h1>
          <p class="text-slate-500 text-lg mt-1 font-medium italic-none">Administre el equipo de asesores y sus bodegas asignadas.</p>
        </div>
        
        <button *ngIf="auth.isAdmin()" 
                class="btn btn-primary flex items-center gap-2 px-6 py-3 shadow-xl shadow-primary/30 transform hover:scale-105 active:scale-95 transition-all" 
                (click)="openModal()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Nuevo Usuario
        </button>
      </div>

      <!-- ACCESS CONTROL CHECK -->
      <ng-container *ngIf="auth.isAdmin(); else forbiddenState">
        <app-card class="p-0 overflow-hidden shadow-2xl border-slate-200/60 bg-white/80 backdrop-blur-md">
          <div class="overflow-x-auto min-h-[400px] table-responsive" *ngIf="users$ | async as users; else loadingOrEmpty">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-slate-50/50 border-b border-slate-200/60">
                  <th class="p-5 font-bold text-slate-500 text-xs uppercase tracking-widest">Usuario</th>
                  <th class="p-5 font-bold text-slate-500 text-xs uppercase tracking-widest">Rol</th>
                  <th class="p-5 font-bold text-slate-500 text-xs uppercase tracking-widest">Bodega Asignada</th>
                  <th class="p-5 font-bold text-slate-500 text-xs uppercase tracking-widest">Registro</th>
                  <th class="p-5 font-bold text-slate-500 text-xs uppercase tracking-widest text-right pr-8">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <ng-container *ngFor="let user of users">
                  <tr class="hover:bg-slate-50/80 transition-all group">
                    <td class="p-5">
                      <div class="flex items-center gap-4">
                        <div class="relative">
                          <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-indigo-500/10 flex items-center justify-center text-primary font-bold border border-primary/10 uppercase text-lg shadow-sm">
                            {{ (user.nombre_completo || 'NN').substring(0, 2) }}
                          </div>
                          <div class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white" [ngClass]="user.last_login ? 'bg-emerald-500' : 'bg-slate-300'"></div>
                        </div>
                        <div>
                          <div class="font-bold text-slate-900 group-hover:text-primary transition-colors">{{ user.nombre_completo }}</div>
                          <div class="text-xs text-slate-400 font-semibold tracking-tight">{{ user.email }}</div>
                        </div>
                      </div>
                    </td>
                    <td class="p-5">
                      <div class="flex">
                        <span class="px-3 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-widest border" 
                          [ngClass]="{
                            'bg-indigo-50 text-indigo-700 border-indigo-100': user.rol === 'admin_distribuidor',
                            'bg-slate-50 text-slate-600 border-slate-200': user.rol !== 'admin_distribuidor'
                          }">
                          {{ user.rol === 'admin_distribuidor' ? 'Administrador' : 'Asesor' }}
                        </span>
                      </div>
                    </td>
                    <td class="p-5">
                      <div class="flex items-center gap-2.5">
                        <div class="w-2.5 h-2.5 rounded-full shadow-sm" [ngClass]="user.bodegas?.nombre ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'"></div>
                        <span class="text-sm font-bold" [ngClass]="user.bodegas?.nombre ? 'text-slate-700' : 'text-slate-400 font-normal italic'">
                          {{ user.bodegas?.nombre || 'Sin asignación' }}
                        </span>
                      </div>
                    </td>
                    <td class="p-5">
                      <div class="text-sm text-slate-500 font-medium">
                        {{ user.created_at | date:'dd MMM, yyyy' }}
                      </div>
                      <div class="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">
                        {{ user.created_at | date:'shortTime' }}
                      </div>
                    </td>
                    <td class="p-5 text-right pr-8">
                      <div class="flex justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                        <!-- HISTORY BUTTON -->
                        <button (click)="toggleHistory(user.id)" 
                                class="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white hover:shadow-lg text-slate-400 hover:text-indigo-600 transition-all border border-transparent hover:border-indigo-100 bg-transparent cursor-pointer" 
                                [title]="expandedUserId === user.id ? 'Cerrar Historial' : 'Ver Historial de Actividad'">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        </button>

                        <button class="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white hover:shadow-lg text-slate-400 hover:text-primary transition-all border border-transparent hover:border-primary/10 bg-transparent cursor-pointer" (click)="editUser(user)" title="Editar Perfil">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                      </div>
                    </td>
                  </tr>

                  <!-- COLLAPSIBLE HISTORY PANEL -->
                  <tr *ngIf="expandedUserId === user.id" class="bg-slate-50/80">
                    <td colspan="5" class="p-0 border-b border-slate-200/60 shadow-inner">
                      <div class="p-8 animate-in slide-in-from-top-4 duration-300">
                        <div class="flex items-center justify-between mb-6">
                          <h4 class="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                            <span class="w-8 h-[1px] bg-slate-200"></span>
                            Bitácora de Auditoría
                            <span class="w-8 h-[1px] bg-slate-200"></span>
                          </h4>
                        </div>

                        <div *ngIf="isLoadingHistory" class="py-10 text-center">
                          <div class="inline-block animate-spin w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full mb-2"></div>
                          <p class="text-slate-400 text-xs font-bold uppercase tracking-widest">Consultando DB...</p>
                        </div>
                        
                        <div *ngIf="!isLoadingHistory && history.length === 0" class="py-10 text-center bg-white/50 rounded-2xl border border-dashed border-slate-200">
                          <p class="text-slate-400 text-sm font-medium">No hay registros de actividad histórica para este usuario.</p>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4" *ngIf="!isLoadingHistory && history.length > 0">
                          <div *ngFor="let entry of history" class="bg-white border border-slate-200/60 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-start gap-4">
                            <div class="flex-shrink-0 w-2 h-2 rounded-full mt-2 ring-4 ring-slate-50" [ngClass]="getActionBadgeClass(entry.accion).includes('emerald') ? 'bg-emerald-500' : 'bg-primary'"></div>
                            <div class="flex-grow">
                              <div class="flex justify-between items-center mb-2">
                                <span [class]="'px-2 py-0.5 rounded-md text-[9px] font-black border uppercase tracking-widest ' + getActionBadgeClass(entry.accion)">
                                  {{ entry.accion }}
                                </span>
                                <span class="text-[10px] text-slate-400 font-bold bg-slate-50 px-2 rounded-full">{{ entry.created_at | date:'short' }}</span>
                              </div>
                              <p class="text-xs text-slate-700 leading-relaxed mb-2 font-medium">{{ formatDetail(entry) }}</p>
                              <div class="flex items-center gap-2 text-[9px] text-slate-400 font-bold uppercase tracking-tight italic-none">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                Autor: <span class="text-slate-500 font-black">{{ entry.realizado_por?.nombre_completo || 'Sistema' }}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                </ng-container>
              </tbody>
            </table>
          </div>

          <ng-template #loadingOrEmpty>
             <div class="text-center p-20 bg-white">
               <div class="flex flex-col items-center gap-4">
                 <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 animate-pulse">
                   <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
                 </div>
                 <div class="max-w-xs">
                   <p class="text-slate-900 font-bold">Sin información </p>
                   <p class="text-slate-400 text-sm">No encontramos registros de usuarios vinculados a su empresa o el sistema está sincronizando.</p>
                 </div>
               </div>
             </div>
          </ng-template>
        </app-card>
      </ng-container>

      <!-- FORBIDDEN STATE -->
      <ng-template #forbiddenState>
        <app-card class="bg-white/80 backdrop-blur-lg border-rose-100 shadow-2xl p-12 text-center animate-in zoom-in-95 duration-500">
           <div class="mb-6 flex justify-center">
             <div class="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center text-rose-500 shadow-inner">
               <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
             </div>
           </div>
           <h2 class="text-2xl font-black text-slate-900 mb-2">Acceso Restringido</h2>
           <p class="text-slate-500 max-w-md mx-auto mb-8 font-medium">Esta sección está disponible únicamente para perfiles con privilegios de Administrador. Contacte al soporte técnico si cree que esto es un error.</p>
           <button class="btn btn-outline border-slate-200 hover:bg-slate-50 transition-all font-bold px-8 py-3 rounded-xl" (click)="goHome()">
             Volver al Inicio
           </button>
        </app-card>
      </ng-template>

      <app-user-form *ngIf="showModal" [user]="selectedUser" (onClose)="closeModal()" (saved)="loadUsers()"></app-user-form>
    </div>
  `,
  styles: []
})
export class UserListComponent implements OnInit {
  private supabase = inject(SupabaseService);
  private uiService = inject(UiService);
  public auth = inject(AuthService);

  users$!: Observable<any[]>;
  showModal = false;
  selectedUser: any = null;
  
  // History tracking
  expandedUserId: string | null = null;
  history: any[] = [];
  isLoadingHistory = false;

  ngOnInit() {
    // Escuchar cambios en el usuario para cargar los datos cuando el perfil esté listo
    this.auth.currentUser$.subscribe(user => {
      if (user && user.role === 'admin_distribuidor') {
        this.loadUsers(user);
      }
    });
  }

  loadUsers(currentUser?: any) {
    const companyId = currentUser?.companyId || this.auth.currentUserValue?.companyId;
    if (!companyId) return;

    this.uiService.setLoading(true);
    this.users$ = from(
      this.supabase.from('usuarios')
        .select(`
          id,
          nombre_completo,
          email,
          rol,
          created_at,
          bodega_asignada_id,
          bodegas:bodega_asignada_id (nombre)
        `)
        .eq('distribuidor_id', companyId)
        .order('nombre_completo')
        .then((res: any) => {
          this.uiService.setLoading(false);
          if (res.error) {
            console.error('Error fetching users:', res.error);
            return [];
          }
          return res.data || [];
        })
    );
  }

  async toggleHistory(userId: string) {
    if (this.expandedUserId === userId) {
      this.expandedUserId = null;
      this.history = [];
      return;
    }

    this.expandedUserId = userId;
    this.isLoadingHistory = true;
    this.history = [];

    try {
      const { data, error } = await this.supabase
        .from('auditoria_usuarios')
        .select(`
          id,
          accion,
          detalle,
          created_at,
          realizado_por:usuarios!realizado_por_id (nombre_completo)
        `)
        .eq('usuario_afectado_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      this.history = data || [];
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      this.isLoadingHistory = false;
    }
  }

  getActionBadgeClass(accion: string): string {
    switch (accion) {
      case 'CREACION': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'CAMBIO_CONTRASEÑA': return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'ACTUALIZACION_PERFIL': return 'bg-amber-50 text-amber-700 border-amber-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  }

  formatDetail(entry: any): string {
    if (!entry.detalle) return 'Sin detalles registrados.';

    // Si el detalle ya es un texto descriptivo (no empieza con {), lo devolvemos tal cual
    if (typeof entry.detalle === 'string' && !entry.detalle.trim().startsWith('{')) {
      return entry.detalle;
    }

    try {
      // Intentamos parsear por si es un string JSON o ya viene como objeto
      const data = typeof entry.detalle === 'string' ? JSON.parse(entry.detalle) : entry.detalle;

      switch (entry.accion) {
        case 'ACTUALIZACION_PERFIL':
          return `Se actualizaron los datos del perfil (${data.nombre_completo || 'Usuario'}).`;
        
        case 'CREACION':
          return `Nuevo usuario creado en el sistema con el rol de ${data.rol === 'admin_distribuidor' ? 'Administrador' : 'Asesor'}.`;
        
        case 'CAMBIO_CONTRASEÑA':
          return 'Se realizó un cambio de credenciales de acceso.';
          
        default:
          return 'Se realizaron cambios en la configuración del registro.';
      }
    } catch (e) {
      // Si falla el parseo, devolvemos el texto original para no perder información
      return entry.detalle;
    }
  }

  openModal() {
    this.selectedUser = null;
    this.showModal = true;
  }

  editUser(user: any) {
    this.selectedUser = user;
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.selectedUser = null;
  }

  goHome() {
    window.location.href = '/';
  }
}
