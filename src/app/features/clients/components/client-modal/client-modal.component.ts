import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ClientsService } from '../../services/clients.service';

@Component({
   selector: 'app-client-modal',
   standalone: true,
   imports: [CommonModule, ReactiveFormsModule],
   template: `
    <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
       <div class="bg-white border border-slate-200 rounded-xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
          
          <div class="p-5 border-b border-slate-200 flex justify-between items-center">
             <h2 class="text-xl font-bold text-main">Nuevo Cliente</h2>
             <button (click)="onClose.emit()" class="text-muted hover:text-main">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
             </button>
          </div>

          <form [formGroup]="clientForm" (ngSubmit)="onSubmit()" class="p-6">
             <div class="space-y-4">
                <div>
                   <label class="block text-sm font-medium text-main mb-1">Nombre Completo</label>
                   <input formControlName="name" type="text" class="input-premium w-full" placeholder="Ej. Constructora Sol S.A.S">
                </div>
                
                <div>
                   <label class="block text-sm font-medium text-main mb-1">Dirección</label>
                   <input formControlName="address" type="text" class="input-premium w-full" placeholder="Ej. Cra 43 # 32-12">
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                       <label class="block text-sm font-medium text-main mb-1">Teléfono</label>
                       <input formControlName="phone" type="text" class="input-premium w-full" placeholder="Ej. 300 123 4567">
                    </div>
                    <div>
                       <label class="block text-sm font-medium text-main mb-1">Zona</label>
                       <select formControlName="zone" class="input-premium w-full">
                          <option value="">Seleccionar...</option>
                          <option value="Norte">Norte</option>
                          <option value="Sur">Sur</option>
                          <option value="Centro">Centro</option>
                          <option value="Occidente">Occidente</option>
                       </select>
                    </div>
                </div>

                <div>
                   <label class="block text-sm font-medium text-main mb-1">Email (Opcional)</label>
                   <input formControlName="email" type="email" class="input-premium w-full" placeholder="contacto@cliente.com">
                </div>
             </div>

             <div class="mt-6 pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" (click)="onClose.emit()" class="btn btn-outline">Cancelar</button>
                <button type="submit" [disabled]="clientForm.invalid || isLoading" class="btn btn-primary flex items-center gap-2">
                   <span *ngIf="isLoading" class="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></span>
                   Guardar Cliente
                </button>
             </div>
          </form>
       </div>
    </div>
  `,
   styles: [`
    .input-premium { @apply bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-main focus:bg-white focus:border-primary focus:outline-none transition-all focus:ring-2 focus:ring-indigo-100; }
  `]
})
export class ClientModalComponent {
   @Output() onClose = new EventEmitter<void>();
   @Output() saved = new EventEmitter<void>();

   clientForm: FormGroup;
   isLoading = false;

   constructor(private fb: FormBuilder, private clientsService: ClientsService) {
      this.clientForm = this.fb.group({
         name: ['', Validators.required],
         address: ['', Validators.required],
         phone: ['', Validators.required],
         zone: ['', Validators.required],
         email: ['', Validators.email]
      });
   }

   onSubmit() {
      if (this.clientForm.invalid) return;

      this.isLoading = true;
      this.clientsService.createClient(this.clientForm.value).then(() => {
         this.isLoading = false;
         this.saved.emit(); // Notify parent to refresh list
         this.onClose.emit();
      }).catch(err => {
         console.error(err);
         this.isLoading = false;
         alert('Error al crear cliente');
      });
   }
}
