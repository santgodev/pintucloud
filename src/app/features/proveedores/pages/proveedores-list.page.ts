import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ProveedoresService } from '../services/proveedores.service';
import { Proveedor } from '../models/proveedor.model';
import { UiService } from '../../../core/services/ui.service';

@Component({
    selector: 'app-proveedores-list',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './proveedores-list.page.html',
})
export class ProveedoresListPage implements OnInit {

    readonly proveedores = signal<Proveedor[]>([]);
    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly togglingId = signal<string | null>(null);

    constructor(
        private readonly service: ProveedoresService,
        private readonly router: Router,
        private readonly uiService: UiService
    ) { }

    async ngOnInit(): Promise<void> {
        await this.loadProveedores();
    }

    private async loadProveedores(): Promise<void> {
        this.loading.set(true);
        this.uiService.setLoading(true);
        this.error.set(null);
        try {
            const data = await this.service.getAll();
            this.proveedores.set(data);
        } catch (err: any) {
            this.error.set(`Error al cargar proveedores: ${err.message}`);
        } finally {
            this.loading.set(false);
            this.uiService.setLoading(false);
        }
    }

    async onToggleEstado(p: Proveedor): Promise<void> {
        this.togglingId.set(p.id);
        this.error.set(null);
        try {
            const nuevo = p.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
            await this.service.toggleEstado(p.id, nuevo);
            // Actualiza localmente sin recargar todo
            this.proveedores.update(list =>
                list.map(x => x.id === p.id ? { ...x, estado: nuevo } : x)
            );
        } catch (err: any) {
            this.error.set(`Error al cambiar estado: ${err.message}`);
        } finally {
            this.togglingId.set(null);
        }
    }

    goToCreate(): void {
        this.router.navigate(['/proveedores/new']);
    }

    goToEdit(id: string): void {
        this.router.navigate(['/proveedores', id, 'edit']);
    }

    trackById(_: number, p: Proveedor): string {
        return p.id;
    }
}
