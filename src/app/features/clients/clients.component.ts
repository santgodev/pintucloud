import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SharedModule } from '../../shared/shared.module';
import { ClientsService, Client } from './services/clients.service';
import { Observable } from 'rxjs';
import { ClientModalComponent } from './components/client-modal/client-modal.component';
import { ClientDetailModalComponent } from './components/client-detail-modal/client-detail-modal.component';

@Component({
   selector: 'app-clients',
   standalone: true,
   imports: [CommonModule, SharedModule, FormsModule, ClientModalComponent, ClientDetailModalComponent],
   template: `
    <div class="flex flex-col md:flex-row justify-between mb-6 gap-4">
       <div>
         <h1 class="title-lg">Cartera de Clientes</h1>
         <p class="text-muted text-sm">Gestiona tus clientes y prospectos.</p>
       </div>
       <div class="flex gap-2 items-center">
          <!-- Filters -->
          <select [(ngModel)]="selectedCity" (change)="refreshClients()" class="input-premium py-1 text-sm w-32 md:w-40">
             <option value="Todas">Todas las Ciudades</option>
             <option value="Barranquilla">Barranquilla</option>
             <option value="Santa Marta">Santa Marta</option>
             <option value="Medellín">Medellín</option>
          </select>
          
          <select *ngIf="isAdmin" [(ngModel)]="selectedAdvisor" (change)="refreshClients()" class="input-premium py-1 text-sm w-32 md:w-40">
              <option value="Todos">Todos los Asesores</option>
              <option *ngFor="let adv of advisors" [value]="adv.id">{{ adv.nombre_completo }}</option>
          </select>

          <button class="btn btn-primary whitespace-nowrap" (click)="openModal()">+ Nuevo Cliente</button>
       </div>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
       <app-card *ngFor="let client of clients$ | async">
          <div class="flex items-center gap-4 mb-4">
             <div class="avatar-placeholder">{{client.razon_social.charAt(0)}}</div>
             <div>
                <h3 class="font-bold text-lg text-main">{{client.razon_social}}</h3>
                <p class="text-sm text-muted">{{ client.codigo }} &bull; {{client.ciudad}}</p>
             </div>
          </div>
          <div class="info-grid text-sm mb-4">
             <div class="info-item">
                <span class="label">Última Compra</span>
                <span class="value">{{client.lastBuy}}</span>
             </div>
              <div class="info-item">
                <span class="label">Dirección</span>
                <span class="value">{{client.address || '—'}}</span>
             </div>
          </div>
          <div class="actions border-t border-slate-200 pt-4">
             <button class="btn btn-outline w-full text-sm" (click)="openDetail(client)">Ver Detalle</button>
          </div>
       </app-card>
       
       <!-- Empty State -->
       <div *ngIf="(clients$ | async)?.length === 0" class="col-span-full text-center p-8 text-muted border border-dashed border-slate-300 rounded bg-slate-50">
          No hay clientes registrados. Añade uno nuevo.
       </div>
       
       <app-client-modal *ngIf="showClientModal" (onClose)="showClientModal = false" (saved)="refreshClients()"></app-client-modal>
       
       <app-client-detail-modal *ngIf="selectedClient" [client]="selectedClient" (onClose)="selectedClient = null"></app-client-detail-modal>
    </div>
  `,
   styles: [`
    .grid { display: grid; gap: 1.5rem; }
    .grid-cols-1 { grid-template-columns: 1fr; }
    @media(min-width: 768px) { .md\\:grid-cols-2 { grid-template-columns: repeat(2, 1fr); } }
    @media(min-width: 1024px) { .lg\\:grid-cols-3 { grid-template-columns: repeat(3, 1fr); } }
    
    .avatar-placeholder {
       width: 48px; height: 48px; background: var(--color-slate-50); border: 1px solid var(--border-subtle);
       border-radius: 50%; display: flex; align-items: center; justify-content: center;
       font-weight: 700; color: var(--color-primary);
       font-size: 1.125rem;
    }
    .text-muted { color: var(--text-muted); }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .label { display: block; color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
    .value { color: var(--text-main); font-weight: 600; font-size: 0.95rem; }
    .w-full { width: 100%; }
    .col-span-full { grid-column: 1 / -1; }
  `]
})
export class ClientsComponent implements OnInit {
   clients$!: Observable<Client[]>;
   showClientModal = false;
   selectedClient: Client | null = null;

   // Filters and State
   selectedCity = 'Todas';
   selectedAdvisor = 'Todos';
   advisors: any[] = [];
   isAdmin = false; // TODO: Fetch from actual user role

   constructor(private clientsService: ClientsService) { }

   ngOnInit() {
      // Check role (mock or real) -> In real app, check authService.currentUser
      // For now, let's assume if we can fetch advisors, we are admin-like or we just show the filter anyway
      this.checkRole();

      this.loadClients();
      this.loadAdvisors();
   }

   checkRole() {
      // Logic to check if user is admin. For now, we enable it if fetch returns something or just true for demo
      this.isAdmin = true;
   }

   loadAdvisors() {
      this.clientsService.getAdvisors().subscribe(data => {
         this.advisors = data;
      });
   }

   loadClients() {
      this.clients$ = this.clientsService.getClients({
         city: this.selectedCity,
         advisorId: this.selectedAdvisor
      });
   }

   refreshClients() {
      this.loadClients();
   }

   openModal() {
      this.showClientModal = true;
   }

   openDetail(client: Client) {
      this.selectedClient = client;
   }
}
