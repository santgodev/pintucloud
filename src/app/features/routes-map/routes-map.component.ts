import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../shared/shared.module';

@Component({
    selector: 'app-routes-map',
    standalone: true,
    imports: [CommonModule, SharedModule],
    template: `
    <div class="h-full flex flex-col">
        <div class="header mb-6">
            <h1 class="title-lg">Mapa de Rutas</h1>
            <p class="text-muted">Geolocalización de clientes y optimización de visitas.</p>
        </div>
        
        <app-card customClass="flex-1 p-0 overflow-hidden relative" class="map-card">
            <div class="map-overlay absolute top-4 left-4 z-10 p-4 rounded-lg bg-white/95 backdrop-blur shadow-lg border border-slate-200 max-w-xs">
                <h4 class="font-bold text-main mb-2">Filtros de Mapa</h4>
                <div class="flex flex-col gap-2">
                    <label class="flex items-center gap-2 text-sm text-secondary">
                        <input type="checkbox" checked class="accent-primary"> Mostrar Clientes
                    </label>
                    <label class="flex items-center gap-2 text-sm text-secondary">
                        <input type="checkbox" checked class="accent-secondary"> Mostrar Bodegas
                    </label>
                    <label class="flex items-center gap-2 text-sm text-secondary">
                        <input type="checkbox" class="accent-warning"> Mostrar Tráfico
                    </label>
                </div>
            </div>

            <div class="w-full h-full bg-slate-50 flex items-center justify-center relative">
                 <!-- Mock Map Content -->
                 <div class="absolute inset-0 opacity-10" style="background-image: radial-gradient(#64748b 1px, transparent 1px); background-size: 20px 20px;"></div>
                 
                 <div class="text-center">
                    <h3 class="text-2xl font-bold text-slate-300 mb-4">Google Maps Area</h3>
                    <p class="text-muted">[Map Container Ready for API Integration]</p>
                 </div>

                 <!-- Mock Pins -->
                 <div class="absolute top-1/3 left-1/4 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                    <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white border-2 border-white shadow-md">📍</div>
                    <span class="bg-white text-main font-bold text-xs px-2 py-1 rounded shadow-md mt-1 border border-slate-100">Cliente A</span>
                 </div>
                 
                 <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                    <div class="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-white border-2 border-white shadow-md">🏭</div>
                    <span class="bg-white text-main font-bold text-xs px-2 py-1 rounded shadow-md mt-1 border border-slate-100">Bodega Central</span>
                 </div>
            </div>
        </app-card>
    </div>
  `,
    styles: [`
    .h-full { height: 100vh; max-height: calc(100vh - 150px); }
    .w-full { width: 100%; }
    .flex-1 { flex: 1; }
    .absolute { position: absolute; }
    .relative { position: relative; }
    .inset-0 { top: 0; right: 0; bottom: 0; left: 0; }
    .glass-panel { background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.1); }
    .accent-primary { accent-color: var(--color-primary); }
    .accent-secondary { accent-color: var(--color-secondary); }
  `]
})
export class RoutesMapComponent { }
