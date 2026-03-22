import { Component, Output, EventEmitter, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InventoryItem } from '../../services/inventory.service';

@Component({
    selector: 'app-adjust-stock-modal',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, FormsModule],
    template: `
    <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
       <div class="bg-white border border-slate-200 rounded-xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
          
          <div class="p-5 border-b border-slate-200 flex justify-between items-center">
             <h2 class="text-xl font-bold text-main">Ajuste de Inventario</h2>
             <button (click)="onClose.emit()" class="text-muted hover:text-main">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
             </button>
          </div>

          <div class="p-6">
             <!-- Info Card -->
             <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
                 <div class="flex justify-between items-start mb-2">
                     <div>
                         <p class="text-sm font-bold text-slate-900">{{ item.productName }}</p>
                         <p class="text-xs text-slate-500 font-mono">{{ item.sku }}</p>
                     </div>
                     <span class="px-2.5 py-1 rounded bg-slate-200 text-[10px] font-bold text-slate-700 uppercase border border-slate-300">
                         {{ item.bodegaName }}
                     </span>
                 </div>
                 <div class="mt-4 flex justify-between items-end border-t border-slate-200 pt-3">
                     <span class="text-sm font-medium text-slate-600">Stock actual en sistema:</span>
                     <span class="text-lg font-bold text-slate-900">{{ item.stock }}</span>
                 </div>
             </div>

             <form [formGroup]="adjustForm" (ngSubmit)="onSubmit()">
                <div class="space-y-4">
                   <!-- Physical Count -->
                   <div>
                       <label class="block text-sm font-medium text-main mb-1">Conteo Físico</label>
                       <input formControlName="conteoFisico" type="number" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-main focus:bg-white focus:border-primary focus:outline-none transition-all focus:ring-2 focus:ring-indigo-100" placeholder="0" min="0">
                   </div>

                    <!-- Dynamic Difference -->
                   <div class="flex justify-between items-center p-3 rounded-lg"
                        [ngClass]="{
                            'bg-slate-50 text-slate-500': difference === 0,
                            'bg-emerald-50 text-emerald-700': difference > 0,
                            'bg-rose-50 text-rose-700': difference < 0
                        }">
                       <span class="text-sm font-semibold">Diferencia a ajustar:</span>
                       <span class="font-bold">
                           {{ difference > 0 ? '+' : '' }}{{ difference }}
                       </span>
                   </div>

                   <!-- Observation -->
                   <div>
                       <label class="block text-sm font-medium text-main mb-1">Motivo del ajuste <span class="text-slate-400 font-normal">(Opcional)</span></label>
                       <input formControlName="motivo" type="text" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-main focus:bg-white focus:border-primary focus:outline-none transition-all focus:ring-2 focus:ring-indigo-100" placeholder="Ej. Conteo cíclico, merma, rotura...">
                   </div>
                </div>

                <div class="mt-8 flex justify-end gap-3">
                   <button type="button" (click)="onClose.emit()" class="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors">Cancelar</button>
                   <button type="submit" [disabled]="adjustForm.invalid || isLoading" class="px-4 py-2 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                      <span *ngIf="isLoading" class="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></span>
                      Confirmar Ajuste
                   </button>
                </div>
             </form>
          </div>
       </div>
    </div>
  `
})
export class AdjustStockModalComponent implements OnInit {
    @Input() item!: InventoryItem;
    @Output() onClose = new EventEmitter<void>();
    @Output() confirm = new EventEmitter<{ cantidad: number, observacion: string }>();

    adjustForm!: FormGroup;
    isLoading = false;
    difference = 0;

    constructor(private fb: FormBuilder) { }

    ngOnInit() {
        this.adjustForm = this.fb.group({
            conteoFisico: [this.item.stock, [Validators.required, Validators.min(0)]],
            motivo: ['']
        });

        // Recalculate difference dynamically
        this.adjustForm.get('conteoFisico')?.valueChanges.subscribe(val => {
            const conteo = Number(val) || 0;
            this.difference = conteo - this.item.stock;
        });
    }

    onSubmit() {
        if (this.adjustForm.invalid) return;

        this.isLoading = true;
        const { conteoFisico, motivo } = this.adjustForm.value;

        const obs = motivo?.trim() ? motivo.trim() : 'Ajuste manual de inventario';

        // Emit back to parent
        this.confirm.emit({
            cantidad: this.difference,
            observacion: obs
        });
    }
}
