import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import {
    ReactiveFormsModule,
    FormBuilder,
    FormGroup,
    Validators,
} from '@angular/forms';
import { ProveedoresService } from '../services/proveedores.service';

const NIT_PATTERN = /^[\d.\-]{6,15}$/;
const TELEFONO_PATTERN = /^[0-9+\s.\-()]{7,15}$/;

@Component({
    selector: 'app-proveedores-edit',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './proveedores-edit.page.html',
})
export class ProveedoresEditPage implements OnInit {

    form!: FormGroup;
    private proveedorId!: string;

    readonly loadingData = signal(true);
    readonly saving = signal(false);
    readonly error = signal<string | null>(null);

    constructor(
        private readonly fb: FormBuilder,
        private readonly service: ProveedoresService,
        private readonly router: Router,
        private readonly route: ActivatedRoute,
    ) { }

    async ngOnInit(): Promise<void> {
        this.proveedorId = this.route.snapshot.paramMap.get('id')!;
        await this.loadProveedor();
    }

    private async loadProveedor(): Promise<void> {
        this.loadingData.set(true);
        this.error.set(null);
        try {
            const p = await this.service.getById(this.proveedorId);
            this.form = this.fb.group({
                nombre: [p.nombre, Validators.required],
                nit: [p.nit ?? '', Validators.pattern(NIT_PATTERN)],
                telefono: [p.telefono ?? '', Validators.pattern(TELEFONO_PATTERN)],
                email: [p.email ?? '', Validators.email],
                ciudad: [p.ciudad ?? ''],
                contacto_principal: [p.contacto_principal ?? ''],
                direccion: [p.direccion ?? ''],
                puede_comprar: [p.puede_comprar ?? true],
            });
        } catch (err: any) {
            this.error.set(`Error al cargar proveedor: ${err.message}`);
        } finally {
            this.loadingData.set(false);
        }
    }

    isInvalid(field: string): boolean {
        const ctrl = this.form?.get(field);
        return !!(ctrl?.invalid && ctrl?.touched);
    }

    async onSubmit(): Promise<void> {
        this.form.markAllAsTouched();
        if (this.form.invalid) return;

        this.saving.set(true);
        this.error.set(null);
        try {
            await this.service.update(this.proveedorId, this.form.value);
            this.router.navigate(['/proveedores']);
        } catch (err: any) {
            this.error.set(`No se pudo actualizar: ${err.message}`);
        } finally {
            this.saving.set(false);
        }
    }

    goBack(): void {
        this.router.navigate(['/proveedores']);
    }
}
