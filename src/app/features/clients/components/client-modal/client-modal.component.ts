import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ClientsService, Client } from '../../services/clients.service';

@Component({
   selector: 'app-client-modal',
   standalone: true,
   imports: [CommonModule, ReactiveFormsModule],
   template: `
    <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
       <div class="bg-white border border-slate-200 rounded-xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
          
          <div class="p-5 border-b border-slate-200 flex justify-between items-center">
             <h2 class="text-xl font-bold text-main">{{ clientToEdit ? 'Editar Cliente' : 'Nuevo Cliente' }}</h2>
             <button (click)="onClose.emit()" class="text-muted hover:text-main border-none bg-transparent cursor-pointer">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
             </button>
          </div>

          <form [formGroup]="clientForm" (ngSubmit)="onSubmit()" class="p-6">
             <div class="space-y-4">

                <!-- Código Cliente -->
                <div>
                   <label class="block text-sm font-bold text-slate-700 mb-1.5">Código Cliente</label>
                   <input formControlName="codigo" type="text" class="input-premium w-full" placeholder="Ej. CLI-001"
                          (input)="clientForm.get('codigo')?.setValue($any($event.target).value.toUpperCase(), { emitEvent: false })">
                   
                </div>

                <!-- Razón Social -->
                <div>
                   <label class="block text-sm font-bold text-slate-700 mb-1.5">Razón Social *</label>
                   <input formControlName="razon_social" type="text" class="input-premium w-full" placeholder="Ej. Constructora Sol S.A.S">
                   <p *ngIf="f['razon_social'].invalid && f['razon_social'].touched" class="text-red-500 text-xs mt-1">La razón social es obligatoria.</p>
                </div>

                <!-- Ciudad -->
                <div>
                   <label class="block text-sm font-bold text-slate-700 mb-1.5">Ciudad *</label>
                   <input formControlName="ciudad" type="text" class="input-premium w-full" placeholder="Ej. Barranquilla">
                   <p *ngIf="f['ciudad'].invalid && f['ciudad'].touched" class="text-red-500 text-xs mt-1">La ciudad es obligatoria.</p>
                </div>

                <!-- Sector -->
                <div>
                  <label class="block text-sm font-bold text-slate-700 mb-1.5">Sector *</label>
                  <input formControlName="sector" type="text" class="input-premium w-full" placeholder="Ej. Construcción">
                  <p *ngIf="f['sector'].invalid && f['sector'].touched" class="text-red-500 text-xs mt-1">
                    El sector es obligatorio.
                  </p>
                </div>

                <!-- Dirección -->
                <div>
                   <label class="block text-sm font-bold text-slate-700 mb-1.5">Dirección *</label>
                   <input formControlName="direccion" type="text" class="input-premium w-full" placeholder="Ej. Cra 43 # 32-12">
                   <p *ngIf="f['direccion'].invalid && f['direccion'].touched" class="text-red-500 text-xs mt-1">La dirección es obligatoria.</p>
                </div>

                <!-- Teléfono -->
                <div>
                   <label class="block text-sm font-bold text-slate-700 mb-1.5">Teléfono *</label>
                   <input formControlName="telefono" type="text" class="input-premium w-full" placeholder="Ej. 300 123 4567">
                   <p *ngIf="f['telefono'].invalid && f['telefono'].touched" class="text-red-500 text-xs mt-1">El teléfono es obligatorio.</p>
                </div>

                <!-- NIT -->
                <div>
                  <label class="block text-sm font-bold text-slate-700 mb-1.5">NIT <span class="text-slate-400 font-normal">(opcional)</span></label>
                  <input formControlName="nit" type="text" class="input-premium w-full" placeholder="Ej. 900123456">
                </div>



             </div>

             <div *ngIf="errorMsg" class="mt-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
               {{ errorMsg }}
             </div>

             <div class="mt-6 pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" (click)="onClose.emit()" class="btn btn-outline" [disabled]="isLoading">Cancelar</button>
                <button type="submit" [disabled]="clientForm.invalid || isLoading" class="btn btn-primary flex items-center gap-2 min-w-[130px] justify-center">
                   <span *ngIf="isLoading" class="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></span>
                   {{ isLoading ? 'Guardando...' : 'Guardar Cliente' }}
                </button>
             </div>
          </form>
       </div>
    </div>
  `,
   styles: []
})
export class ClientModalComponent {
   @Output() onClose = new EventEmitter<void>();
   @Output() saved = new EventEmitter<void>();
   @Input() clientToEdit: Client | null = null;

   clientForm: FormGroup;
   isLoading = false;
   errorMsg: string | null = null;

   constructor(private fb: FormBuilder, private clientsService: ClientsService) {
      this.clientForm = this.fb.group({
         codigo: [''],
         razon_social: ['', Validators.required],
         ciudad: ['', Validators.required],
         sector: ['', Validators.required],
         direccion: ['', Validators.required],
         telefono: ['', Validators.required],
         nit: ['']
      });
   }

   get f() { return this.clientForm.controls; }

   ngOnChanges(changes: SimpleChanges) {
      if (changes['clientToEdit'] && this.clientToEdit) {
         this.clientForm.patchValue({
            codigo: this.clientToEdit.codigo,
            razon_social: this.clientToEdit.razon_social,
            ciudad: this.clientToEdit.ciudad,
            sector: this.clientToEdit.sector,
            direccion: this.clientToEdit.address,
            telefono: this.clientToEdit.phone,
            nit: this.clientToEdit.nit
         });
         // Disable code modification on edit if necessary, else leave enabled
      }
   }

   onSubmit() {
      if (this.clientForm.invalid) return;
      this.isLoading = true;
      this.errorMsg = null;

      const val = this.clientForm.value;
      const clientData = {
         codigo: val.codigo?.trim().toUpperCase() || undefined,
         razon_social: val.razon_social.trim(),
         ciudad: val.ciudad.trim(),
         sector: val.sector.trim(),
         direccion: val.direccion.trim(),
         telefono: val.telefono.trim(),
         nit: val.nit?.trim() || undefined
      };

      const operation = this.clientToEdit
         ? this.clientsService.updateClient(this.clientToEdit.id, clientData)
         : this.clientsService.createClient(clientData);

      operation.then(() => {
         this.isLoading = false;
         this.saved.emit();
         this.onClose.emit();
      }).catch(err => {
         if (err?.code === '23505') {
            this.errorMsg = 'Ya existe un cliente con este código.';
         } else {
            this.errorMsg = this.clientToEdit ? 'Error al actualizar cliente.' : 'Error al crear cliente.';
         }
         this.isLoading = false;
      });
   }
}
