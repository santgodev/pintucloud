import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../../shared/shared.module';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Observable, from } from 'rxjs';
import { UserFormComponent } from './user-form.component';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, SharedModule, UserFormComponent],
  template: `
    <div class="mb-8 p-4">
      <div class="flex justify-between items-start mb-8 gap-4">
        <div>
          <h1 class="text-3xl font-bold text-slate-900 tracking-tight">Gestión de Usuarios</h1>
          <p class="text-slate-500 text-lg">Administre el equipo de asesores y sus bodegas asignadas.</p>
        </div>
        <button class="btn btn-primary flex items-center gap-2 px-6 shadow-lg shadow-primary/20" (click)="openModal()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Nuevo Usuario
        </button>
      </div>

      <app-card class="p-0 overflow-hidden shadow-xl border-slate-200">
        <div class="overflow-x-auto" *ngIf="users$ | async as users; else loadingOrEmpty">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200">
                <th class="p-4 font-semibold text-slate-600 text-sm">Usuario</th>
                <th class="p-4 font-semibold text-slate-600 text-sm">Rol</th>
                <th class="p-4 font-semibold text-slate-600 text-sm">Bodega Asignada</th>
                <th class="p-4 font-semibold text-slate-600 text-sm">Registro</th>
                <th class="p-4 font-semibold text-slate-600 text-sm text-right pr-6">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 italic-none">
              <tr *ngFor="let user of users" class="hover:bg-slate-50/50 transition-colors">
                <td class="p-4">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-primary font-bold border border-slate-200 uppercase">
                      {{ (user.nombre_completo || 'NN').substring(0, 2) }}
                    </div>
                    <div>
                      <div class="font-bold text-slate-900">{{ user.nombre_completo }}</div>
                      <div class="text-xs text-slate-400 font-medium">{{ user.email }}</div>
                    </div>
                  </div>
                </td>
                <td class="p-4">
                  <span class="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider" 
                    [ngClass]="{
                      'bg-indigo-50 text-indigo-700 border border-indigo-100': user.rol === 'admin_distribuidor',
                      'bg-slate-50 text-slate-600 border border-slate-200': user.rol === 'asesor'
                    }">
                    {{ user.rol === 'admin_distribuidor' ? 'Administrador' : 'Asesor' }}
                  </span>
                </td>
                <td class="p-4">
                  <div class="flex items-center gap-2">
                    <div class="w-2 h-2 rounded-full" [ngClass]="user.bodegas?.nombre ? 'bg-emerald-500' : 'bg-slate-300'"></div>
                    <span class="text-sm font-semibold" [ngClass]="user.bodegas?.nombre ? 'text-slate-700' : 'text-slate-400'">
                      {{ user.bodegas?.nombre || 'Sin bodega' }}
                    </span>
                  </div>
                </td>
                <td class="p-4 text-sm text-slate-500">{{ user.created_at | date:'mediumDate' }}</td>
                <td class="p-4 text-right pr-6">
                  <div class="flex justify-end gap-1">
                    <button class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white hover:shadow-md text-slate-400 hover:text-primary transition-all border-none bg-transparent cursor-pointer" (click)="editUser(user)" title="Editar Perfil">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white hover:shadow-md text-slate-400 hover:text-rose-600 transition-all border-none bg-transparent cursor-pointer" (click)="notImplemented()" title="Desactivar">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <ng-template #loadingOrEmpty>
           <div class="text-center p-12">
             <div class="flex flex-col items-center gap-3">
               <div class="text-slate-200">
                 <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
               </div>
               <p class="text-slate-400 text-lg">Cargando usuarios o no hay registros...</p>
             </div>
           </div>
        </ng-template>
      </app-card>

      <app-user-form *ngIf="showModal" [user]="selectedUser" (onClose)="closeModal()" (saved)="loadUsers()"></app-user-form>
    </div>
  `,
  styles: []
})
export class UserListComponent implements OnInit {
  users$!: Observable<any[]>;
  showModal = false;
  selectedUser: any = null;

  constructor(private supabase: SupabaseService) { }

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.users$ = from(
      this.supabase.from('usuarios')
        .select(`
          id,
          nombre_completo,
          email,
          rol,
          created_at,
          bodega_asignada_id,
          bodegas (nombre)
        `)
        .order('nombre_completo')
        .then((res: any) => {
          if (res.error) {
            console.error('Error fetching users:', res.error);
            return [];
          }
          return res.data || [];
        })
    );
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

  notImplemented() {
    alert('Esta funcionalidad estará disponible en la próxima actualización.');
  }
}
