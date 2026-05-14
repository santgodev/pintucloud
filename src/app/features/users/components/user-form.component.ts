import { Component, Output, EventEmitter, OnInit, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SupabaseService } from '../../../core/services/supabase.service';
import { UiService } from '../../../core/services/ui.service';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div class="bg-white border border-slate-200/60 rounded-3xl w-full max-w-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden animate-in zoom-in-95 duration-300">
        
        <!-- HEADER -->
        <div class="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 class="text-2xl font-black text-slate-900 tracking-tight">{{ user ? 'Editar Usuario' : 'Nuevo Registro' }}</h2>
            <p class="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">{{ user ? 'Actualice la configuración del asesor' : 'Cree un nuevo perfil de acceso' }}</p>
          </div>
          <button (click)="onClose.emit()" class="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-900 hover:shadow-md transition-all cursor-pointer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <form [formGroup]="userForm" (ngSubmit)="onSubmit()" class="text-left">
          <div class="p-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
            
            <!-- FEEDBACK PANEL (Replaces alerts) -->
            <div *ngIf="message" class="mb-6 animate-in slide-in-from-top-2 duration-300">
              <div [class]="'p-4 rounded-2xl border flex items-center gap-3 ' + (messageType === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700')">
                <div [class]="'w-8 h-8 rounded-full flex items-center justify-center ' + (messageType === 'success' ? 'bg-emerald-500/10' : 'bg-rose-500/10')">
                  <svg *ngIf="messageType === 'success'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  <svg *ngIf="messageType === 'error'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </div>
                <div class="flex-grow">
                  <p class="text-[13px] font-black uppercase tracking-tight">{{ messageType === 'success' ? 'Éxito' : 'Atención' }}</p>
                  <p class="text-sm font-medium opacity-90 leading-tight">{{ message }}</p>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
              <!-- LEFT COLUMN: IDENTIFICACIÓN -->
              <div class="space-y-6">
                <div>
                  <h4 class="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-primary/20 flex items-center justify-center"><span class="w-1 h-1 rounded-full bg-primary"></span></span>
                    Identidad
                  </h4>
                  <div class="space-y-4">
                    <div>
                      <label class="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Nombre Completo</label>
                      <div class="relative group">
                        <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        </div>
                        <input formControlName="nombre_completo" type="text" class="input-premium w-full pl-11" placeholder="Ej. Juan Pérez">
                      </div>
                    </div>

                    <div>
                      <label class="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Coreo Electrónico</label>
                      <div class="relative group">
                        <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                        </div>
                        <input formControlName="email" type="email" class="input-premium w-full pl-11 bg-slate-50/50" placeholder="juan@ejemplo.com" [readonly]="user">
                      </div>
                      <p *ngIf="user" class="text-[9px] text-slate-400 mt-1 font-bold italic uppercase opacity-60">* No editable para mantener integridad auth</p>
                    </div>
                  </div>
                </div>

                <div>
                   <h4 class="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-primary/20 flex items-center justify-center"><span class="w-1 h-1 rounded-full bg-primary"></span></span>
                    Permisos de Acceso
                  </h4>
                  <div class="grid grid-cols-1 gap-4">
                    <div>
                      <label class="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Rol de Sistema</label>
                      <select formControlName="rol" class="input-premium w-full appearance-none">
                        <option value="asesor">Asesor Cometcial</option>
                        <option value="admin_distribuidor">Administrador de Red</option>
                      </select>
                    </div>
                    <div>
                      <label class="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Bodega Base</label>
                      <select formControlName="bodega_asignada_id" class="input-premium w-full text-primary font-bold border-primary/20">
                        <option [ngValue]="null">--- Sin Asignación ---</option>
                        <option *ngFor="let b of bodegas" [value]="b.id">{{ b.nombre }}</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <!-- RIGHT COLUMN: WAREHOUSES & SECURITY -->
              <div class="space-y-6">
                 <div>
                   <h4 class="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-primary/20 flex items-center justify-center"><span class="w-1 h-1 rounded-full bg-primary"></span></span>
                    Visibilidad Multibodega
                  </h4>
                  <div class="bg-slate-50 border border-slate-200/60 rounded-2xl overflow-hidden shadow-inner max-h-[160px] overflow-y-auto">
                    <div *ngFor="let b of bodegas" class="flex items-center gap-3 p-3 border-b border-slate-100 last:border-0 hover:bg-white transition-colors">
                      <input type="checkbox" 
                             [id]="'bodega-' + b.id"
                             [checked]="selectedBodegas.includes(b.id)"
                             (change)="onBodegaToggle(b.id)"
                             class="w-4 h-4 text-primary rounded-lg focus:ring-primary border-slate-300">
                      <label [for]="'bodega-' + b.id" class="text-xs font-bold text-slate-600 cursor-pointer select-none grow">
                        {{ b.nombre }}
                      </label>
                      <span *ngIf="userForm.get('bodega_asignada_id')?.value === b.id" class="px-2 py-0.5 bg-primary/10 text-primary text-[8px] font-black uppercase rounded-full">Base</span>
                    </div>
                  </div>
                </div>

                <div *ngIf="user" class="p-5 bg-gradient-to-br from-slate-50 to-white border border-slate-200/60 rounded-2xl shadow-sm">
                  <h4 class="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    Seguridad
                  </h4>
                  <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Reiniciar Contraseña</label>
                  <div class="flex gap-2">
                    <input formControlName="nueva_password" type="password" class="input-premium w-full text-sm py-2" placeholder="********">
                    <button type="button" 
                            [disabled]="!userForm.get('nueva_password')?.value || isLoading"
                            (click)="onResetPassword()"
                            class="bg-white border border-rose-100 text-rose-600 hover:bg-rose-50 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all disabled:opacity-30">
                      Reset
                    </button>
                  </div>
                </div>

                <div *ngIf="!user" class="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                  <p class="text-[11px] text-amber-700 font-medium leading-relaxed">
                    <span class="font-black uppercase block mb-1">Nota de Registro:</span> 
                    El usuario deberá primero crear su cuenta en el login con este mismo email para habilitar el acceso.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- FOOTER -->
          <div class="p-6 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-3">
            <button type="button" (click)="onClose.emit()" class="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-all border-none bg-transparent cursor-pointer" [disabled]="isLoading">Cancelar</button>
            <button type="submit" [disabled]="userForm.invalid || isLoading" 
                    class="btn btn-primary min-w-[180px] py-2.5 rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transform active:scale-95 transition-all disabled:opacity-50">
              <span *ngIf="isLoading" class="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></span>
              {{ isLoading ? 'Sincronizando...' : (user ? 'Aplicar Cambios' : 'Registrar Colaborador') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
  `]
})
export class UserFormComponent implements OnInit {
  @Input() user: any = null;
  @Output() onClose = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private supabase = inject(SupabaseService);
  private uiService = inject(UiService);

  userForm: FormGroup;
  isLoading = false;
  bodegas: any[] = [];
  selectedBodegas: string[] = [];

  // Feedback local
  message: string | null = null;
  messageType: 'success' | 'error' = 'success';

  constructor() {
    this.userForm = this.fb.group({
      nombre_completo: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      rol: ['asesor', Validators.required],
      bodega_asignada_id: [null],
      nueva_password: ['']
    });
  }

  async ngOnInit() {
    await this.loadBodegas();
    if (this.user) {
      this.userForm.patchValue({
        nombre_completo: this.user.nombre_completo,
        email: this.user.email,
        rol: this.user.rol,
        bodega_asignada_id: this.user.bodega_asignada_id
      });
      await this.loadSelectedBodegas();
    }
  }

  private showFeedback(msg: string, type: 'success' | 'error') {
    this.message = msg;
    this.messageType = type;
    setTimeout(() => this.message = null, 5000);
  }

  async loadSelectedBodegas() {
    const { data } = await this.supabase
      .from('usuarios_bodegas')
      .select('bodega_id')
      .eq('usuario_id', this.user.id);
    
    if (data) {
      this.selectedBodegas = data.map((d: any) => d.bodega_id);
    }
  }

  onBodegaToggle(bodegaId: string) {
    if (this.selectedBodegas.includes(bodegaId)) {
      this.selectedBodegas = this.selectedBodegas.filter(id => id !== bodegaId);
    } else {
      this.selectedBodegas.push(bodegaId);
    }
  }

  async onResetPassword() {
    const newPass = this.userForm.get('nueva_password')?.value;
    if (!newPass || newPass.length < 6) {
      this.showFeedback('La contraseña debe tener al menos 6 caracteres.', 'error');
      return;
    }

    this.isLoading = true;
    try {
      const { error } = await this.supabase.rpc('admin_cambiar_password', {
        p_usuario_id: this.user.id,
        p_nueva_password: newPass
      });

      if (error) throw error;
      
      this.showFeedback('Contraseña actualizada correctamente para ' + this.user.email, 'success');
      this.userForm.get('nueva_password')?.setValue('');
    } catch (err: any) {
      console.error(err);
      this.showFeedback('Error: ' + (err.message || 'Sin permisos.'), 'error');
    } finally {
      this.isLoading = false;
    }
  }

  async loadBodegas() {
    const { data } = await this.supabase.from('bodegas').select('id, nombre').order('nombre');
    this.bodegas = data || [];
  }

  async onSubmit() {
    if (this.userForm.invalid) return;
    this.isLoading = true;
    const val = this.userForm.value;

    try {
      // 🔐 Obtener el distribuidor_id del administrador actual
      const { data: adminProfile } = await this.supabase
        .from('usuarios')
        .select('distribuidor_id')
        .eq('id', (await this.supabase.auth.getUser()).data.user?.id)
        .single();

      const distribuidorId = adminProfile?.distribuidor_id;

      if (!distribuidorId) throw new Error('No se pudo identificar su distribuidora.');

      if (this.user) {
        const { error } = await this.supabase
          .from('usuarios')
          .update({
            nombre_completo: val.nombre_completo,
            rol: val.rol,
            bodega_asignada_id: val.bodega_asignada_id
          })
          .eq('id', this.user.id);

        if (error) throw error;
      } else {
        const { data: existingUser } = await this.supabase
          .from('usuarios')
          .select('id')
          .eq('email', val.email)
          .single();

        if (!existingUser) {
          this.showFeedback('El usuario debe registrarse primero en el Login con este email.', 'error');
          this.isLoading = false;
          return;
        }

        // 🔗 Al reclamar el usuario, le asignamos nuestra distribuidora
        const { error } = await this.supabase
          .from('usuarios')
          .update({
            nombre_completo: val.nombre_completo,
            rol: val.rol,
            bodega_asignada_id: val.bodega_asignada_id,
            distribuidor_id: distribuidorId // <-- PARÁMETRO VITAL
          })
          .eq('email', val.email);

        if (error) throw error;
      }

      // Update assignments
      const { data: userData } = await this.supabase.from('usuarios').select('id').eq('email', val.email).single();
      const targetUserId = this.user ? this.user.id : userData?.id;

      if (targetUserId) {
        await this.supabase.from('usuarios_bodegas').delete().eq('usuario_id', targetUserId);
        if (this.selectedBodegas.length > 0) {
          const inserts = this.selectedBodegas.map(bid => ({
            usuario_id: targetUserId,
            bodega_id: bid
          }));
          await this.supabase.from('usuarios_bodegas').insert(inserts);
        }
      }

      this.showFeedback('Perfil sincronizado correctamente.', 'success');
      setTimeout(() => {
        this.saved.emit();
        this.onClose.emit();
      }, 1000);
    } catch (err: any) {
      console.error(err);
      this.showFeedback('Error al guardar: ' + (err.message || 'Verifique conexión.'), 'error');
    } finally {
      this.isLoading = false;
    }
  }
}
