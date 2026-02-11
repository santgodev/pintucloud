import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../shared/shared.module';

@Component({
   selector: 'app-zones',
   standalone: true,
   imports: [CommonModule, SharedModule],
   template: `
    <div class="header mb-6 flex justify-between">
      <h1 class="title-lg">Gestión de Zonas</h1>
      <button class="btn btn-primary">+ Nueva Zona</button>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
       <!-- Mock Zone Cards -->
       <app-card *ngFor="let zone of zones" customClass="h-full">
          <div class="flex justify-between items-start mb-4">
             <div>
                <h3 class="text-xl font-bold text-main">{{zone.name}}</h3>
                <span class="text-sm text-secondary">{{zone.code}}</span>
             </div>
             <div class="bg-indigo-50 text-primary px-2 py-1 rounded text-xs font-bold border border-indigo-100">ACTIVA</div>
          </div>
          <p class="text-secondary mb-4">{{zone.description}}</p>
          <div class="border-t border-slate-100 pt-4 mt-auto">
             <div class="flex justify-between text-sm">
                <span>Bodegas: <strong class="text-main">{{zone.warehouses}}</strong></span>
                <span>Vendedores: <strong class="text-main">{{zone.sellers}}</strong></span>
             </div>
          </div>
       </app-card>
    </div>
  `,
   styles: [`
    .grid { display: grid; gap: 1.5rem; }
    .grid-cols-1 { grid-template-columns: 1fr; }
    @media(min-width: 768px) { .md\\:grid-cols-2 { grid-template-columns: repeat(2, 1fr); } }
    @media(min-width: 1024px) { .lg\\:grid-cols-3 { grid-template-columns: repeat(3, 1fr); } }
    
    .text-muted { color: var(--color-text-muted); }
    .text-primary { color: var(--color-primary); }
    .bg-primary\\/20 { background: rgba(79, 70, 229, 0.2); }
  `]
})
export class ZonesComponent {
   zones = [
      { name: 'Zona Norte', code: 'Z-BOG-N', description: 'Cobertura Suba, Usaquén', warehouses: 2, sellers: 5 },
      { name: 'Zona Sur', code: 'Z-BOG-S', description: 'Cobertura Kennedy, Bosa', warehouses: 1, sellers: 3 },
      { name: 'Zona Occidente', code: 'Z-BOG-W', description: 'Cobertura Fontibón, Engativá', warehouses: 3, sellers: 6 },
   ];
}
