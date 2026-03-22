import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SharedModule } from '../../shared/shared.module';
import { ClientsService, Client } from './services/clients.service';
import { Observable, debounceTime, distinctUntilChanged } from 'rxjs';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ClientModalComponent } from './components/client-modal/client-modal.component';
import { ClientDetailModalComponent } from './components/client-detail-modal/client-detail-modal.component';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
   selector: 'app-clients',
   standalone: true,
   imports: [CommonModule, SharedModule, FormsModule, ReactiveFormsModule, ClientModalComponent, ClientDetailModalComponent],
   templateUrl: './clients.component.html',
   styles: [`
    .btn-nav { 
        @apply px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-all shadow-sm;
    }
    .input-premium {
        @apply bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition-all shadow-sm h-10;
    }
    table {
        border-collapse: collapse;
    }
    table th,
    table td {
        border-bottom: 1px solid #e5e7eb;
        padding: 10px 12px;
    }
    table th:not(:last-child),
    table td:not(:last-child) {
        border-right: 1px solid #f1f5f9;
    }
    tbody tr {
        height: 42px;
    }
    .client-name {
        font-weight: 600;
        color: #1f2937;
    }
    .client-code {
        color: #4f46e5;
        font-weight: 500;
    }
    thead th {
        font-size: 13px;
        font-weight: 600;
        color: #374151;
        background: #f9fafb;
    }
  `]
})
export class ClientsComponent implements OnInit {
   clients: Client[] = [];
   totalRecords = 0;
   loading = false;
   page = 0;
   pageSize = 10;
   Math = Math;

   // Search & Filters
   searchControl = new FormControl('');

   // Sorting
   sortField: string = 'razon_social';
   sortDirection: 'asc' | 'desc' = 'asc';

   // Modals
   showClientModal = false;
   selectedClient: Client | null = null;
   clientToEdit: Client | null = null;

   constructor(
      private clientsService: ClientsService, 
      private router: Router,
      private authService: AuthService
   ) { }

   get isAdmin(): boolean {
      const role = this.authService.currentUserValue?.role;
      return role === 'ADMIN';
   }

   formatCurrency(valor: number): string {
      return '$ ' + new Intl.NumberFormat('es-CO', {
         maximumFractionDigits: 0
      }).format(valor);
   }

   ngOnInit() {
      this.searchControl.valueChanges
         .pipe(
            debounceTime(400),
            distinctUntilChanged()
         )
         .subscribe(() => {
            this.page = 0;
            this.loadClients();
         });

      this.loadClients();
   }



   loadClients() {
      this.loading = true;
      this.clientsService.getClients({
         page: this.page,
         pageSize: this.pageSize,
         search: this.searchControl.value || '',
         sortField: this.sortField,
         sortDirection: this.sortDirection
      }).subscribe(result => {
         this.clients = result.data;
         this.totalRecords = result.total;
         this.loading = false;
      });
   }

   onFilterChange() {
      this.page = 0;
      this.loadClients();
   }

   sortBy(field: string) {
      if (this.sortField === field) {
         this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
         this.sortField = field;
         this.sortDirection = 'asc';
      }
      this.page = 0;
      this.loadClients();
   }

   nextPage() {
      if ((this.page + 1) * this.pageSize < this.totalRecords) {
         this.page++;
         this.loadClients();
      }
   }

   previousPage() {
      if (this.page > 0) {
         this.page--;
         this.loadClients();
      }
   }

   get totalPages(): number {
      return Math.ceil(this.totalRecords / this.pageSize);
   }

   refreshClients() {
      this.page = 0;
      this.loadClients();
   }

   openModal() {
      this.showClientModal = true;
   }

   openDetail(client: Client) {
      this.selectedClient = client;
   }

   editarCliente(client: Client) {
      this.clientToEdit = client;
      this.showClientModal = true;
   }

   openEditModal(client: Client) {
      this.selectedClient = null;
      this.editarCliente(client);
   }
}
