import { Component, Output, EventEmitter, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InventoryService } from '../../services/inventory.service';

@Component({
   selector: 'app-product-modal',
   standalone: true,
   imports: [CommonModule, ReactiveFormsModule],
   template: `
    <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
       <div class="bg-white border border-slate-200 rounded-xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200">
          
          <div class="p-5 border-b border-slate-200 flex justify-between items-center">
             <h2 class="text-xl font-bold text-main">{{ product ? 'Editar Producto' : 'Nuevo Producto' }}</h2>
             <button (click)="onClose.emit()" class="text-muted hover:text-main">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
             </button>
          </div>

          <form [formGroup]="productForm" (ngSubmit)="onSubmit()" class="p-6">
             <div class="space-y-5">
                <!-- Bodega Selection (Mandatory for distribution) -->
                <div *ngIf="!product" class="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <label class="block text-sm font-bold text-main mb-2 flex items-center gap-2">
                       <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8l-2-2H5L3 8v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8z"></path><path d="M3 8h18"></path><path d="M10 12h4"></path></svg>
                       Asignar a Bodega
                    </label>
                    <select formControlName="bodegaId" class="input-premium w-full bg-white" required>
                       <option value="" disabled>Seleccione una bodega...</option>
                       <option *ngFor="let b of bodegas" [value]="b.id">{{ b.nombre }} ({{ b.codigo }})</option>
                    </select>
                    <p class="text-[10px] text-muted mt-2 uppercase tracking-wider">El stock inicial se cargará en esta bodega.</p>
                </div>

                <div class="grid-form">
                    <div>
                        <label class="block text-sm font-medium text-main mb-1">SKU (Referencia)</label>
                        <input formControlName="sku" type="text" class="input-premium w-full" [class.bg-slate-100]="product" [class.cursor-not-allowed]="product" placeholder="Ej. ROD-001" [readonly]="product">
                    </div>
                     <div>
                        <label class="block text-sm font-medium text-main mb-1">Nombre Comercial</label>
                        <input formControlName="name" type="text" class="input-premium w-full" placeholder="Ej. Rodillo Profesional">
                    </div>
                </div>

                 <div>
                   <label class="block text-sm font-medium text-main mb-1">Categoría de Catálogo</label>
                   <select formControlName="category" class="input-premium w-full">
                      <option value="general" *ngIf="categorias.length === 0">General</option>
                      <option *ngFor="let cat of categorias" [value]="cat">{{ cat }}</option>
                   </select>
                </div>

                <div class="grid-form">
                  <div class="relative">
                    <label class="block text-sm font-medium text-main mb-1">Grupo</label>
                    <input type="text" formControlName="grupo" class="input-premium w-full pr-8" placeholder="Ej: BROCHAS PREMIUM SUPERIOR"
                           (focus)="mostrarDropdownGrupos = true"
                           (blur)="onGrupoBlur()">
                    
                    <div class="absolute right-3 top-[34px] pointer-events-none text-slate-400">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                    </div>

                    <div *ngIf="mostrarDropdownGrupos" 
                         class="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                        <div *ngFor="let g of gruposFiltrados" 
                             (mousedown)="seleccionarGrupo(g, $event)"
                             class="px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 truncate">
                            {{ g }}
                        </div>
                        <div *ngIf="gruposFiltrados.length === 0" class="px-3 py-2 text-[13px] text-slate-400 italic">
                            Se creará como nuevo grupo
                        </div>
                    </div>
                  </div>

                  <div class="flex items-center gap-2 mt-6">
                    <input type="checkbox" formControlName="visible_catalogo" class="h-4 w-4 rounded border-slate-300 text-primary">
                    <label class="text-sm font-medium text-main">Mostrar en catálogo</label>
                  </div>
                </div>

                <div>
                   <label class="block text-sm font-medium text-main mb-1">Descripción</label>
                   <textarea formControlName="description" class="input-premium w-full h-20" placeholder="Detalles técnicos, dimensiones, etc..."></textarea>
                </div>

                <div class="grid-form">
                    <div>
                         <label class="block text-sm font-medium text-main mb-1">Precio de Venta</label>
                         <div class="relative">
                            <span class="absolute left-3 top-2 text-muted">$</span>
                            <input formControlName="price" type="number" class="input-premium w-full pl-6" placeholder="0" min="0">
                         </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-main mb-1">Stock mínimo</label>
                        <input formControlName="stock_minimo" type="number" class="input-premium w-full" placeholder="0" min="0">
                    </div>
                </div>

                <div class="grid-form" *ngIf="!product">
                    <div>
                        <label class="block text-sm font-medium text-main mb-1">Stock a Ingresar</label>
                        <input formControlName="stock" type="number" class="input-premium w-full" placeholder="0" min="0">
                    </div>
                </div>

                <div class="p-4 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center" *ngIf="product">
                    <div>
                        <span class="block text-sm font-bold text-slate-700">Stock Actual</span>
                        <span class="block text-xs text-slate-500">Utilice los ajustes de inventario para modificar</span>
                    </div>
                    <div class="text-xl font-bold text-slate-900">{{ product.stock }} unidades</div>
                </div>
                
                <div class="pt-2">
                   <label class="block text-sm font-medium text-main mb-2">Imagen del Producto</label>
                   
                   <div class="flex items-center gap-4 p-3 border-2 border-dashed border-slate-200 rounded-xl hover:border-primary/50 transition-colors">
                        <div *ngIf="imagePreview" class="w-16 h-16 rounded-lg border border-slate-200 overflow-hidden bg-slate-50 relative group flex-shrink-0">
                            <img [src]="imagePreview" class="w-full h-full object-cover">
                            <button type="button" (click)="removeImage()" class="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>

                        <div class="flex-1">
                             <input type="file" #fileInput (change)="onFileSelected($event)" class="hidden" accept="image/*">
                             
                             <div class="flex flex-col gap-1" *ngIf="!imagePreview">
                                <button type="button" (click)="fileInput.click()" class="text-sm font-semibold text-primary hover:text-primary-dark flex items-center gap-2">
                                     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                     Seleccionar archivo
                                </button>
                                <span class="text-[10px] text-muted">JPG, PNG o WEBP (Máx 2MB)</span>
                             </div>
                             
                             <div class="flex gap-2" *ngIf="imagePreview">
                                <button type="button" (click)="fileInput.click()" class="text-sm text-primary font-medium hover:underline">Cambiar imagen</button>
                             </div>
                        </div>
                   </div>
                </div>
             </div>

             <div class="mt-8 pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" (click)="onClose.emit()" class="btn btn-outline min-w-[100px]">Cancelar</button>
                <button type="submit" [disabled]="productForm.invalid || isLoading" class="btn btn-primary flex items-center gap-2 px-6">
                   <span *ngIf="isLoading" class="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></span>
                   {{ product ? 'Guardar Cambios' : 'Confirmar e Ingresar' }}
                </button>
             </div>
          </form>
       </div>
    </div>
  `,
   styles: [`
    .input-premium { @apply bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-main focus:bg-white focus:border-primary focus:outline-none transition-all focus:ring-2 focus:ring-indigo-100; }
    input.input-premium, select.input-premium { @apply h-[42px] leading-normal; }
  `]
})
export class ProductModalComponent implements OnInit {
   @Input() product: any = null; // InventoryItem input
   @Output() onClose = new EventEmitter<void>();
   @Output() saved = new EventEmitter<void>();

   productForm: FormGroup;
   isLoading = false;
   selectedFile: File | null = null;
   imagePreview: string | null = null;

   bodegas: any[] = [];
   categorias: string[] = [];
   grupos: string[] = [];
   gruposFiltrados: string[] = [];
   mostrarDropdownGrupos = false;

   constructor(private fb: FormBuilder, private inventoryService: InventoryService) {
      this.productForm = this.fb.group({
         sku: ['', Validators.required],
         name: ['', Validators.required],
         description: [''],
         price: [0, [Validators.required, Validators.min(0)]],
         stock_minimo: [0, [Validators.required, Validators.min(0)]],
         stock: [0, [Validators.required, Validators.min(0)]],
         category: ['general'],
         imageUrl: [''],
         bodegaId: [''],
         grupo: [''],
         visible_catalogo: [false]
      });
   }

   async ngOnInit() {
      this.loadBodegas();
      this.loadCategorias();
      this.loadGrupos();

      this.productForm.get('name')?.valueChanges.subscribe((value: string) => {
         if (!this.productForm.get('grupo')?.value && value) {
            const sugerido = value.replace(/\s\d.*$/, '').trim();
            this.productForm.patchValue({ grupo: sugerido }, { emitEvent: false });
         }
      });

      this.productForm.get('grupo')?.valueChanges.subscribe((value: string) => {
         const search = (value || '').toLowerCase();
         this.gruposFiltrados = this.grupos.filter(g => g.toLowerCase().includes(search));
      });

      if (this.product) {
         // Edit Mode
         this.productForm.patchValue({
            sku: this.product.sku,
            name: this.product.productName,
            description: this.product.description || '',
            price: this.product.price,
            stock_minimo: this.product.stockMinimo || 0,
            stock: this.product.stock,
            category: this.product.category || 'general',
            imageUrl: this.product.imageUrl,
            grupo: this.product.grupo || '',
            visible_catalogo: this.product.visible_catalogo ?? false
         });
         this.imagePreview = this.product.imageUrl;
      }
   }

   async loadBodegas() {
      this.bodegas = await this.inventoryService.getBodegas();
      // Auto-select first if available and creating new
      if (!this.product && this.bodegas.length > 0) {
         this.productForm.patchValue({ bodegaId: this.bodegas[0].id });
      }
   }

   async loadCategorias() {
      this.categorias = await this.inventoryService.getCategories();
   }

   async loadGrupos() {
      this.grupos = await this.inventoryService.getGrupos();
      this.gruposFiltrados = [...this.grupos];
   }

   seleccionarGrupo(g: string, event?: Event) {
      if (event) {
          event.preventDefault(); // Prevenir blur instantáneo
      }
      this.productForm.patchValue({ grupo: g });
      this.mostrarDropdownGrupos = false;
   }

   onGrupoBlur() {
       setTimeout(() => {
           this.mostrarDropdownGrupos = false;
       }, 200);
   }

   onFileSelected(event: any) {
      const file = event.target.files[0];
      if (file) {
         this.selectedFile = file;
         const reader = new FileReader();
         reader.onload = () => {
            this.imagePreview = reader.result as string;
         };
         reader.readAsDataURL(file);
      }
   }

   removeImage() {
      this.selectedFile = null;
      this.imagePreview = null;
   }

   async onSubmit() {
      if (this.productForm.invalid) return;

      this.isLoading = true;
      const formVal = this.productForm.value;

      try {
         if (this.product) {
            // UPDATE
            await this.inventoryService.updateProduct({
               productId: this.product.productId,
               inventoryId: this.product.id,
               name: formVal.name,
               price: formVal.price,
               description: formVal.description,
               imageUrl: formVal.imageUrl, // Existing URL
               category: formVal.category,
               stock_minimo: formVal.stock_minimo,
               stock: formVal.stock,
               grupo: formVal.grupo || null,
               visible_catalogo: formVal.visible_catalogo ?? false
            }, this.selectedFile || undefined); // Only pass file if new one selected

         } else {
            // CREATE
            let imageUrl = formVal.imageUrl;
            if (this.selectedFile) {
               imageUrl = await this.inventoryService.uploadProductImage(this.selectedFile);
            }

            await this.inventoryService.createProduct({
               name: formVal.name,
               sku: formVal.sku,
               price: formVal.price,
               description: formVal.description,
               imageUrl: imageUrl,
               stock_minimo: formVal.stock_minimo,
               category: formVal.category || 'general',
               grupo: formVal.grupo || null,
               visible_catalogo: formVal.visible_catalogo ?? false
            }, formVal.stock, formVal.bodegaId);
         }

         this.isLoading = false;
         this.saved.emit();
         this.onClose.emit();

      } catch (err: any) {
         console.error(err);
         this.isLoading = false;
         alert('Error: ' + (err.message || err));
      }
   }
}
