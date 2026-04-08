import { Component, OnInit, signal, computed, Signal, HostListener } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';
import {
  PurchasesService,
  Proveedor,
  CreateDetallePayload,
} from '../services/purchases.service';

// ─── Local model for rendered detalle rows ────────────────────────────────────
interface DetalleRow {
  id: string;
  compra_id: string;
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
  _productoNombre: string;
  _productoSku: string;
}

@Component({
  selector: 'app-purchase-create',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, CurrencyPipe],
  templateUrl: './purchase-create.page.html',
  styles: [`
    .btn-confirmar {
      background-color: #16a34a;
      border: none;
      padding: 10px 20px;
      font-weight: 500;
      border-radius: 8px;
      transition: all 0.2s ease;
      color: white;
    }
    .btn-confirmar:hover {
      background-color: #15803d;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
    }
    .btn-confirmar:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      box-shadow: none;
    }

    .btn-secundario {
      background-color: #f1f5f9; /* Slate 100 - Gris claro */
      color: #475569; /* Slate 600 */
      border: 1px solid #e2e8f0;
      padding: 10px 20px;
      font-weight: 500;
      border-radius: 8px;
      transition: all 0.2s ease;
    }
    .btn-secundario:hover {
      background-color: #e2e8f0; /* Slate 200 - Más oscuro */
      border-color: #cbd5e1;
      color: #1e293b;
    }

    .btn-destructive {
      background-color: #fff1f2; /* Rose 50 - Rojo muy suave */
      color: #e11d48; /* Rose 600 */
      border: 1px solid #fecdd3;
      padding: 10px 20px;
      font-weight: 500;
      border-radius: 8px;
      transition: all 0.2s ease;
    }
    .btn-destructive:hover {
      background-color: #ffe4e6; /* Rose 100 - Más intenso */
      border-color: #fda4af;
      color: #be123c;
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

    /* Searchable dropdown custom styles */
    .dropdown-container {
      position: relative;
    }
    .dropdown-menu {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      z-index: 1000;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      margin-top: 4px;
      box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
      max-height: 300px;
      overflow-y: auto;
    }
    .dropdown-item {
      padding: 10px 14px;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    .dropdown-item:hover {
      background-color: #f1f5f9;
    }
    .dropdown-item.selected {
      background-color: #e0f2fe;
      color: #0369a1;
      font-weight: 600;
    }
  `]
})
export class PurchaseCreatePage implements OnInit {

  // ── Lookup data ─────────────────────────────────────────────────────────────
  proveedores: Proveedor[] = [];
  bodegas: { id: string; nombre: string }[] = [];
  productos = signal<{ id: string; nombre: string; sku: string; precio_base: number }[]>([]);

  // Searchable dropdown logic
  readonly searchTerm = signal('');
  readonly showDropdown = signal(false);
  readonly filteredProductos = computed(() => {
    const products = this.productos();
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return products;
    return products.filter(p =>
      (p.nombre ?? '').toLowerCase().includes(term) ||
      (p.sku ?? '').toLowerCase().includes(term)
    );
  });

  readonly selectedProductLabel = computed(() => {
    const id = this.detalleForm.get('producto_id')?.value;
    if (!id) return null;
    const p = this.productos().find(prod => prod.id === id);
    return p ? `${p.nombre} — ${p.sku}` : null;
  });

  // ── Forms (inicializados en constructor — necesario para toSignal) ──────────
  compraForm: FormGroup;
  detalleForm: FormGroup;

  // ── Signals de estado ───────────────────────────────────────────────────────
  readonly compraId = signal<string | null>(null);
  readonly compraEstado = signal<'BORRADOR' | 'CONFIRMADA' | 'ANULADA' | null>(null);
  readonly detalle = signal<DetalleRow[]>([]);
  readonly confirmed = signal(false);
  readonly error = signal<string | null>(null);
  readonly loadingExisting = signal(false);
  readonly currentStep = signal<1 | 2>(1);   // controla qué paso es visible

  // Loading flags
  readonly savingCompra = signal(false);
  readonly addingDetail = signal(false);
  readonly confirming = signal(false);
  readonly removingId = signal<string | null>(null);
  readonly updatingCabecera = signal(false);
  readonly updateSuccess = signal(false);  // toast de éxito (auto-oculta)
  readonly deletingBorrador = signal(false);
  readonly isConfirmada = computed(() => this.compraEstado() === 'CONFIRMADA');
  readonly isAnulada = computed(() => this.compraEstado() === 'ANULADA');

  // ── Signals derivados de los formularios (via toSignal) ─────────────────────
  private readonly _detalleValues: Signal<unknown>;
  private readonly _condicionPago: Signal<string>;
  private readonly _diasCredito: Signal<number>;   // reacciona al select 30/60/90
  private readonly _fechaCompra: Signal<string>;   // reacciona al input date

  /** Subtotal en tiempo real (reacciona a cantidad y precio_unitario) */
  readonly subtotalPreview: Signal<number>;

  /** true cuando condicion_pago === 'CREDITO' */
  readonly esCredito: Signal<boolean>;

  /** Fecha vencimiento para mostrar (null si CONTADO) */
  readonly fechaVencimientoDisplay: Signal<string | null>;

  /** Total de la cabecera (suma de las líneas confirmadas) */
  readonly totalEstimado = computed(() =>
    this.detalle().reduce((sum, d) => sum + d.cantidad * d.precio_unitario, 0)
  );

  constructor(
    private readonly fb: FormBuilder,
    private readonly purchasesService: PurchasesService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
  ) {
    // ── Construir formularios en el constructor para tener contexto de inyección
    this.compraForm = this._buildCompraForm();
    this.detalleForm = this._buildDetalleForm();

    // ── Convertir observables de formulario a signals ──────────────────────────
    this._detalleValues = toSignal(
      this.detalleForm.valueChanges.pipe(startWith(null)),
      { initialValue: null }
    );

    this._condicionPago = toSignal(
      this.compraForm.get('condicion_pago')!.valueChanges.pipe(startWith('CONTADO')),
      { initialValue: 'CONTADO' }
    );

    this._diasCredito = toSignal(
      this.compraForm.get('dias_credito')!.valueChanges.pipe(startWith(this.compraForm.get('dias_credito')!.value)),
      { initialValue: this.compraForm.get('dias_credito')!.value }
    );

    this._fechaCompra = toSignal(
      this.compraForm.get('fecha')!.valueChanges.pipe(startWith(this.compraForm.get('fecha')!.value)),
      { initialValue: this.compraForm.get('fecha')!.value }
    );

    // ── Signals computados ────────────────────────────────────────────────────
    this.subtotalPreview = computed(() => {
      this._detalleValues(); // suscribirse a cambios
      const raw = this.detalleForm.getRawValue(); // lee disabled también
      return Number(raw.cantidad ?? 0) * Number(raw.precio_unitario ?? 0);
    });

    this.esCredito = computed(() => this._condicionPago() === 'CREDITO');

    this.fechaVencimientoDisplay = computed(() => {
      if (this._condicionPago() !== 'CREDITO') return null;
      const dias = Number(this._diasCredito()) || 0;
      const baseDateStr = this._fechaCompra();
      if (!baseDateStr) return null;

      // Parseo manual YYYY-MM-DD para evitar desfases de zona horaria
      const [year, month, day] = baseDateStr.split('-').map(Number);
      const fecha = new Date(year, month - 1, day);

      fecha.setDate(fecha.getDate() + dias);
      return fecha.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
    });
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────
  async ngOnInit(): Promise<void> {
    await this.loadLookups();

    const existingId = this.route.snapshot.paramMap.get('id');
    if (existingId) {
      await this.loadExistingCompra(existingId);
    }
  }

  // ── Builders privados ────────────────────────────────────────────────────────
  private _buildCompraForm(): FormGroup {
    const form = this.fb.group({
      proveedor_id: ['', Validators.required],
      bodega_id: ['', Validators.required],
      fecha: [
        (() => {
          const d = new Date();
          return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        })(),
        Validators.required
      ],
      numero_factura: [''],
      observacion: [''],
      condicion_pago: ['CONTADO', Validators.required],
      dias_credito: [{ value: 15 as number | null, disabled: true }],
    });

    // Habilitar/deshabilitar dias_credito según condicion_pago
    form.get('condicion_pago')!.valueChanges.subscribe((value: string | null) => {
      const diasCtrl = form.get('dias_credito')!;
      if (value === 'CREDITO') {
        diasCtrl.enable();
        if (!diasCtrl.value) diasCtrl.setValue(15);
        diasCtrl.setValidators([Validators.required]);
      } else {
        diasCtrl.setValue(null);
        diasCtrl.clearValidators();
        diasCtrl.disable();
      }
      diasCtrl.updateValueAndValidity();
    });

    return form;
  }

  private _buildDetalleForm(): FormGroup {
    return this.fb.group({
      producto_id: ['', Validators.required],
      cantidad: [null, [Validators.required, Validators.min(1)]],
      precio_unitario: [null, [Validators.required, Validators.min(0)]],
    });
  }

  // ── Lookups ─────────────────────────────────────────────────────────────────
  private async loadLookups(): Promise<void> {
    try {
      const [proveedores, bodegas, productos] = await Promise.all([
        this.purchasesService.getProveedores(),
        this.purchasesService.getBodegas(),
        this.purchasesService.getProductos(),
      ]);
      this.proveedores = proveedores;
      this.bodegas = bodegas;
      this.productos.set(productos);
    } catch (err: any) {
      this.error.set(`Error al cargar datos iniciales: ${err.message}`);
    }
  }


  /** Carga un borrador existente (ruta /purchases/:id/edit) */
  private async loadExistingCompra(id: string): Promise<void> {
    this.loadingExisting.set(true);
    this.error.set(null);
    try {
      const compra = await this.purchasesService.getById(id);
      if (!compra) {
        this.error.set('No se encontró la compra.');
        return;
      }
      if (compra.estado === 'ANULADA') {
        this.error.set('No se pueden editar compras anuladas.');
        return;
      }

      this.compraId.set(id);
      this.compraEstado.set(compra.estado!);

      // Llenar formulario cabecera
      this.compraForm.patchValue({
        proveedor_id: compra.proveedor_id,
        bodega_id: compra.bodega_id,
        fecha: compra.fecha,
        numero_factura: compra.numero_factura,
        observacion: compra.observacion,
        condicion_pago: compra.condicion_pago,
        dias_credito: compra.dias_credito
      });

      // Si está confirmada, bloquear campos Críticos
      if (compra.estado === 'CONFIRMADA') {
        this.compraForm.get('proveedor_id')?.disable();
        this.compraForm.get('bodega_id')?.disable();
      }

      const detalles = (compra as any).compras_detalle ?? [];
      this.detalle.set(
        detalles.map((d: any) => {
          const producto = this.productos().find(p => p.id === d.producto_id);
          return {
            id: d.id,
            compra_id: id,
            producto_id: d.producto_id,
            cantidad: d.cantidad,
            precio_unitario: d.precio_unitario,
            _productoNombre: producto?.nombre ?? '—',
            _productoSku: producto?.sku ?? '—',
          };
        })
      );
    } catch (err: any) {
      this.error.set(`Error al cargar la compra: ${err.message}`);
    } finally {
      this.loadingExisting.set(false);
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  isFieldInvalid(form: FormGroup, field: string): boolean {
    const ctrl = form.get(field);
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  trackById(_: number, row: DetalleRow): string {
    return row.id;
  }

  onProductoChange(): void {
    const id = this.detalleForm.get('producto_id')?.value;
    const producto = this.productos().find(p => p.id === id);
    this.detalleForm.get('precio_unitario')?.patchValue(producto?.precio_base ?? null);
  }

  // --- Searchable Dropdown Methods ---
  toggleDropdown(): void {
    this.showDropdown.update(v => !v);
    if (this.showDropdown()) {
      this.searchTerm.set('');
    }
  }

  selectProduct(p: { id: string; nombre: string; sku: string; precio_base: number }): void {
    this.detalleForm.get('producto_id')?.setValue(p.id);
    this.onProductoChange();
    this.showDropdown.set(false);
    this.searchTerm.set('');
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown-container')) {
      this.showDropdown.set(false);
    }
  }

  // ── Paso 1: Crear cabecera ───────────────────────────────────────────────────
  async onCreateCompra(): Promise<void> {
    this.compraForm.markAllAsTouched();
    if (this.compraForm.invalid) return;

    this.savingCompra.set(true);
    this.error.set(null);
    try {
      const raw = this.compraForm.getRawValue();
      const esCredito = raw.condicion_pago === 'CREDITO';

      const id = await this.purchasesService.create({
        proveedor_id: raw.proveedor_id,
        bodega_id: raw.bodega_id,
        fecha: raw.fecha,
        numero_factura: raw.numero_factura || null,
        observacion: raw.observacion || null,
        condicion_pago: raw.condicion_pago,
        dias_credito: esCredito ? Number(raw.dias_credito) : null,
      });
      this.compraId.set(id);
      this.compraEstado.set('BORRADOR');
      this.currentStep.set(2);   // avanzar automáticamente al paso 2
    } catch (err: any) {
      this.error.set(`No se pudo crear la compra: ${err.message}`);
    } finally {
      this.savingCompra.set(false);
    }
  }

  // ── Paso 1 (edición): Actualizar cabecera ───────────────────
  async updateCompraCabecera(): Promise<void> {
    if (!this.compraId() || this.isAnulada()) return;

    this.compraForm.markAllAsTouched();
    if (this.compraForm.invalid) return;
    this.updatingCabecera.set(true);
    this.error.set(null);
    this.updateSuccess.set(false);
    try {
      const raw = this.compraForm.getRawValue();
      const esCredito = raw.condicion_pago === 'CREDITO';

      await this.purchasesService.updateCompra(this.compraId()!, {
        proveedor_id: raw.proveedor_id,
        bodega_id: raw.bodega_id,
        fecha: raw.fecha,
        numero_factura: raw.numero_factura || null,
        observacion: raw.observacion || null,
        condicion_pago: raw.condicion_pago,
        dias_credito: esCredito ? Number(raw.dias_credito) : null,
      });

      // Toast de éxito temporal (2 s) y avance al paso 2
      this.updateSuccess.set(true);
      setTimeout(() => {
        this.updateSuccess.set(false);
        this.currentStep.set(2);
      }, 1800);
    } catch (err: any) {
      this.error.set(`Error al actualizar la compra: ${err.message}`);
    } finally {
      this.updatingCabecera.set(false);
    }
  }

  // ── Paso 2a: Agregar línea ───────────────────────────────────────────────────
  async onAddDetalle(): Promise<void> {
    if (this.detalleForm.invalid || !this.compraId() || this.compraEstado() !== 'BORRADOR') return;

    this.addingDetail.set(true);
    this.error.set(null);
    try {
      const raw = this.detalleForm.getRawValue();
      const payload: CreateDetallePayload = {
        compra_id: this.compraId()!,
        producto_id: raw.producto_id,
        cantidad: Number(raw.cantidad),
        precio_unitario: Number(raw.precio_unitario),
      };

      const realId = await this.purchasesService.addDetail(payload);
      const producto = this.productos().find(p => p.id === payload.producto_id);

      this.detalle.update(rows => [...rows, {
        id: realId,
        compra_id: this.compraId()!,
        producto_id: payload.producto_id,
        cantidad: payload.cantidad,
        precio_unitario: payload.precio_unitario,
        _productoNombre: producto?.nombre ?? '—',
        _productoSku: producto?.sku ?? '—',
      }]);

      this.detalleForm.reset();
    } catch (err: any) {
      this.error.set(`Error al agregar producto: ${err.message}`);
    } finally {
      this.addingDetail.set(false);
    }
  }

  // ── Paso 2b: Eliminar línea (DELETE real en DB) ─────────────────────────────
  async onRemoveDetalle(row: DetalleRow): Promise<void> {
    if (this.compraEstado() !== 'BORRADOR') return;

    this.removingId.set(row.id);
    this.error.set(null);
    try {
      await this.purchasesService.removeDetail(row.id);
      this.detalle.update(rows => rows.filter(r => r.id !== row.id));
    } catch (err: any) {
      this.error.set(`Error al eliminar línea: ${err.message}`);
    } finally {
      this.removingId.set(null);
    }
  }

  // ── Navegación entre pasos ──────────────────────────────────────────────────────────────
  /** Vuelve al Paso 1 desde Paso 2 (solo si BORRADOR) */
  goToStep1(): void {
    if (this.compraEstado() === 'BORRADOR') {
      this.currentStep.set(1);
    }
  }

  // ── Paso 3: Confirmar ──────────────────────────────────────────────────────────────
  async onConfirmCompra(): Promise<void> {
    if (!this.compraId() || this.detalle().length === 0) return;

    this.confirming.set(true);
    this.error.set(null);
    try {
      await this.purchasesService.confirm(this.compraId()!);
      this.confirmed.set(true);
    } catch (err: any) {
      // Manejo de errores amigable para el usuario
      const message = err.message || '';

      if (message.includes('unique_factura_proveedor_confirmada')) {
        this.error.set('Ya existe una compra confirmada con este número de factura para el proveedor seleccionado.');
      } else {
        this.error.set(`Error al confirmar la compra: ${err.message}`);
      }
    } finally {
      this.confirming.set(false);
    }
  }

  // ── Navegación ───────────────────────────────────────────────────────────────
  goBack(): void {
    this.router.navigate(['/purchases']);
  }

  /** Elimina la compra BORRADOR completa (cabecera + líneas) via RPC */
  async onDeleteBorrador(): Promise<void> {
    if (!this.compraId() || this.compraEstado() !== 'BORRADOR') return;

    const ok = window.confirm(
      '¿Estás seguro de que deseas eliminar este borrador?\n\n' +
      'Esta acción es irreversible y eliminará la compra y todas sus líneas de detalle.'
    );
    if (!ok) return;

    this.deletingBorrador.set(true);
    this.error.set(null);
    try {
      await this.purchasesService.deleteBorrador(this.compraId()!);
      this.router.navigate(['/purchases']);
    } catch (err: any) {
      this.error.set(`Error al eliminar el borrador: ${err.message}`);
    } finally {
      this.deletingBorrador.set(false);
    }
  }
}
