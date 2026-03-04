import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
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
    selector: 'app-proveedores-create',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './proveedores-create.page.html',
})
export class ProveedoresCreatePage implements OnInit {

    form!: FormGroup;
    readonly saving = signal(false);
    readonly error = signal<string | null>(null);

    constructor(
        private readonly fb: FormBuilder,
        private readonly service: ProveedoresService,
        private readonly router: Router,
    ) { }

    ngOnInit(): void {
        this.form = this.fb.group({
            nombre: ['', Validators.required],
            nit: ['', Validators.pattern(NIT_PATTERN)],
            telefono: ['', Validators.pattern(TELEFONO_PATTERN)],
            email: ['', Validators.email],
            ciudad: [''],
            contacto_principal: [''],
            direccion: [''],
            puede_comprar: [true],
        });
    }

    isInvalid(field: string): boolean {
        const ctrl = this.form.get(field);
        return !!(ctrl?.invalid && ctrl?.touched);
    }

    async onSubmit(): Promise<void> {
        this.form.markAllAsTouched();
        if (this.form.invalid) return;

        this.saving.set(true);
        this.error.set(null);
        try {
            await this.service.create(this.form.value);
            this.router.navigate(['/proveedores']);
        } catch (err: any) {
            this.error.set(`No se pudo crear el proveedor: ${err.message}`);
        } finally {
            this.saving.set(false);
        }
    }

    goBack(): void {
        this.router.navigate(['/proveedores']);
    }
}
