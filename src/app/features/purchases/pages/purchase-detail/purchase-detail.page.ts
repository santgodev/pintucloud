import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { PurchasesService, Compra, CompraDetalle } from '../../services/purchases.service';

@Component({
    selector: 'app-purchase-detail',
    standalone: true,
    imports: [CommonModule, CurrencyPipe, DatePipe],
    templateUrl: './purchase-detail.page.html',
    styles: [`
        .banner-anulada {
            display: flex;
            gap: 12px;
            align-items: flex-start;
            background: #fff5f5;
            border: 1px solid #f5c2c2;
            border-left: 4px solid #dc3545;
            padding: 14px 16px;
            border-radius: 8px;
            margin: 16px 0 24px 0;
        }
        .banner-icon {
            font-size: 18px;
        }
        .banner-text {
            font-size: 0.9rem;
            color: #555;
        }
        .estado-badge {
            font-size: 0.8rem;
            font-weight: 600;
            padding: 6px 12px;
            border-radius: 999px;
            letter-spacing: 0.5px;
        }
        .badge-green {
            background-color: #f0fdf4;
            color: #166534;
            border: 1px solid #bbf7d0;
        }
        .badge-gray {
            background-color: #374151; /* gris oscuro */
            color: white;
            border: none;
        }
    `]
})
export class PurchaseDetailPage implements OnInit {

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly compra = signal<Compra | null>(null);

    // ── Anulación ────────────────────────────────────────────────────────────────
    anulando = signal(false);
    errorAnulacionTitle = signal<string | null>(null);
    errorAnulacion = signal<string | null>(null);
    successAnulacion = signal(false);

    /** Total calculado desde las líneas (fallback si total de cabecera es null) */
    readonly totalCalculado = computed(() => {
        const c = this.compra();
        if (!c) return 0;
        if (c.total != null) return c.total;
        return (c.compras_detalle ?? []).reduce(
            (sum, d) => sum + (d.subtotal ?? d.cantidad * d.precio_unitario),
            0
        );
    });

    /** Fecha de creación formateada con hora */
    readonly formattedFechaCreacion = computed(() => {
        const c = this.compra();
        if (!c || !c.created_at) return '—';
        return new Date(c.created_at).toLocaleString('es-CO', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    });

    /** Fecha de vencimiento formateada manualmente (evita desfase UTC) */
    readonly formattedFechaVencimiento = computed(() => {
        const c = this.compra();
        if (!c?.fecha_vencimiento) return null;

        const [year, month, day] = c.fecha_vencimiento.split('-');
        const months = [
            'ene', 'feb', 'mar', 'abr', 'may', 'jun',
            'jul', 'ago', 'sep', 'oct', 'nov', 'dic'
        ];

        const monthIdx = parseInt(month, 10) - 1;
        const monthStr = months[monthIdx] || '???';

        return `${day} ${monthStr} ${year}`;
    });

    constructor(
        private readonly purchasesService: PurchasesService,
        private readonly router: Router,
        private readonly route: ActivatedRoute,
    ) { }

    async ngOnInit(): Promise<void> {
        const id = this.route.snapshot.paramMap.get('id');
        if (!id) {
            this.router.navigate(['/purchases']);
            return;
        }
        await this.loadCompra(id);
    }

    async loadCompra(id: string): Promise<void> {
        this.loading.set(true);
        this.error.set(null);
        try {
            const compra = await this.purchasesService.getById(id);

            if (compra.estado === 'BORRADOR') {
                // Redirigir a edición si aún es borrador
                this.router.navigate(['/purchases', id, 'edit']);
                return;
            }

            this.compra.set(compra);
        } catch (err: any) {
            this.error.set(`No se pudo cargar la compra: ${err.message}`);
        } finally {
            this.loading.set(false);
        }
    }

    async onAnularCompra() {
        if (!this.compra() || this.compra()?.estado !== 'CONFIRMADA') return;

        const confirmar = window.confirm(
            '¿Está seguro que desea anular esta compra?\n\nEsta acción revertirá el inventario.'
        );
        if (!confirmar) return;

        try {
            this.anulando.set(true);
            this.errorAnulacion.set(null);
            this.errorAnulacionTitle.set(null);

            await this.purchasesService.anularCompra(this.compra()!.id as string);

            this.successAnulacion.set(true);

            // Recargar compra desde backend
            await this.loadCompra(this.compra()!.id as string);

            setTimeout(() => {
                this.successAnulacion.set(false);
            }, 2000);

        } catch (e: any) {
            const message = e.message || '';
            if (message.includes('stock_utilizado_en_ventas')) {
                this.errorAnulacionTitle.set('No se puede anular la compra');
                this.errorAnulacion.set('La compra no puede anularse porque uno o más productos ya fueron utilizados en ventas posteriores.');
            } else {
                this.errorAnulacionTitle.set('No se pudo anular la compra');
                this.errorAnulacion.set(e.message);
            }
        } finally {
            this.anulando.set(false);
        }
    }

    trackById(_: number, d: CompraDetalle): string {
        return d.id ?? d.producto_id;
    }

    goBack(): void {
        this.router.navigate(['/purchases']);
    }
}
