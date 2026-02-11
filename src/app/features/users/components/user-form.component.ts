import { Component, Output, EventEmitter, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white border border-slate-200 rounded-xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200">
        
        <div class="p-5 border-b border-slate-200 flex justify-between items-center">
          <h2 class="text-xl font-bold text-slate-900">{{ user ? 'Editar Perfil de Usuario' : 'Nuevo Usuario' }}</h2>
          <button (click)="onClose.emit()" class="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <form [formGroup]="userForm" (ngSubmit)="onSubmit()" class="p-6 text-left">
          <div *ngIf="!user" class="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-6 text-sm text-indigo-700 flex gap-3">
            <svg class="flex-shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
            <p><strong>Importante:</strong> Para nuevos usuarios, el email debe coincidir con su registro en la plataforma para vincular correctamente el perfil.</p>
          </div>

          <div class="space-y-5">
            <div>
              <label class="block text-sm font-bold text-slate-700 mb-1.5">Nombre Completo</label>
              <input formControlName="nombre_completo" type="text" class="input-premium w-full" placeholder="Ej. Juan Pérez">
            </div>

            <div>
              <label class="block text-sm font-bold text-slate-700 mb-1.5">Correo Electrónico</label>
              <input formControlName="email" type="email" class="input-premium w-full" placeholder="juan@ejemplo.com" [readonly]="user">
              <p *ngIf="user" class="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-bold">El email no puede ser modificado una vez creado.</p>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-bold text-slate-700 mb-1.5">Rol de Sistema</label>
                <select formControlName="rol" class="input-premium w-full">
                  <option value="asesor">Asesor</option>
                  <option value="admin_distribuidor">Administrador</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-bold text-slate-700 mb-1.5">Bodega Asignada</label>
                <select formControlName="bodega_asignada_id" class="input-premium w-full">
                  <option [ngValue]="null">Sin Asignación</option>
                  <option *ngFor="let b of bodegas" [value]="b.id">{{ b.nombre }}</option>
                </select>
              </div>
            </div>
          </div>

          <div class="mt-8 pt-6 border-t border-slate-100 flex justify-end gap-3">
            <button type="button" (click)="onClose.emit()" class="btn btn-outline" [disabled]="isLoading">Cancelar</button>
            <button type="submit" [disabled]="userForm.invalid || isLoading" class="btn btn-primary flex items-center gap-2 px-8 min-w-[140px] justify-center">
              <span *ngIf="isLoading" class="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></span>
              {{ isLoading ? 'Guardando...' : (user ? 'Guardar Cambios' : 'Registrar Usuario') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: []
})
export class UserFormComponent implements OnInit {
  @Input() user: any = null;
  @Output() onClose = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  userForm: FormGroup;
  isLoading = false;
  bodegas: any[] = [];

  constructor(private fb: FormBuilder, private supabase: SupabaseService) {
    this.userForm = this.fb.group({
      nombre_completo: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      rol: ['asesor', Validators.required],
      bodega_asignada_id: [null]
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
      if (this.user) {
        // UPDATE EXISTING PROFILE
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
        // NEW USER LOGIC (Simulation as we need Auth Admin for real creation)
        const { data: existingUser } = await this.supabase
          .from('usuarios')
          .select('id')
          .eq('email', val.email)
          .single();

        if (!existingUser) {
          alert('Nota: Para registrar un nuevo usuario, este debe primero crear su cuenta en la pantalla de Login con el mismo email. El perfil se vinculará automáticamente.');
          this.isLoading = false;
          return;
        }

        const { error } = await this.supabase
          .from('usuarios')
          .update({
            nombre_completo: val.nombre_completo,
            rol: val.rol,
            bodega_asignada_id: val.bodega_asignada_id
          })
          .eq('email', val.email);

        if (error) throw error;
      }

      this.saved.emit();
      this.onClose.emit();
    } catch (err: any) {
      console.error(err);
      alert('Error al guardar el usuario: ' + (err.message || err));
    } finally {
      this.isLoading = false;
    }
  }
}
