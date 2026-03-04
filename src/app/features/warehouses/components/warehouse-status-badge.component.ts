import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

type WarehouseEstado = 'ACTIVA' | 'INACTIVA' | 'MANTENIMIENTO';

@Component({
    selector: 'app-warehouse-status-badge',
    standalone: true,
    imports: [CommonModule],
    template: `
    <span [class]="badgeClass" class="px-2 py-1 text-[10px] font-bold uppercase rounded-md border tracking-wider whitespace-nowrap">
      {{ label }}
    </span>
  `,
})
export class WarehouseStatusBadgeComponent {
    @Input() estado: WarehouseEstado | string = 'ACTIVA';

    get label(): string {
        const map: Record<string, string> = {
            ACTIVA: 'Activa',
            INACTIVA: 'Inactiva',
            MANTENIMIENTO: 'Mantenimiento',
        };
        return map[this.estado] ?? this.estado;
    }

    get badgeClass(): string {
        const classes: Record<string, string> = {
            ACTIVA: 'bg-emerald-50 text-emerald-600 border-emerald-100',
            INACTIVA: 'bg-slate-100 text-slate-500 border-slate-200',
            MANTENIMIENTO: 'bg-amber-50 text-amber-600 border-amber-100',
        };
        return classes[this.estado] ?? classes['ACTIVA'];
    }
}
