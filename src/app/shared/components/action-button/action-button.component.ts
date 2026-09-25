import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ActionButtonVariant = 'edit' | 'view' | 'delete' | 'payment' | 'delivery' | 'adjust' | 'payment-history';

@Component({
    selector: 'app-action-button',
    standalone: true,
    imports: [CommonModule],
    template: `
        <button 
            type="button"
            [disabled]="disabled"
            [title]="tooltip"
            (click)="handleClick($event)"
            class="p-1.5 rounded-lg text-white transition-all duration-200"
            [ngClass]="{
                'hover:scale-110 active:scale-95': !disabled,
                'opacity-40 cursor-not-allowed': disabled
            }"
            [ngStyle]="getStyles()">
            
            <!-- Edit Icon -->
            <svg *ngIf="variant === 'edit'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>

            <!-- View Icon -->
            <svg *ngIf="variant === 'view'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
            </svg>

            <!-- Delete Icon -->
            <svg *ngIf="variant === 'delete'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18"></path>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>

            <!-- Payment Icon -->
            <svg *ngIf="variant === 'payment'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="2" y1="10" x2="22" y2="10"></line>
            </svg>

            <!-- Delivery Icon -->
            <svg *ngIf="variant === 'delivery'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path>
                <path d="m3.3 7 8.7 5 8.7-5"></path>
                <path d="M12 22V12"></path>
            </svg>

            <!-- Adjust Icon -->
            <svg *ngIf="variant === 'adjust'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 20V10"></path>
                <path d="M18 20V4"></path>
                <path d="M6 20v-4"></path>
            </svg>

            <!-- Payment History Icon -->
            <svg *ngIf="variant === 'payment-history'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
        </button>
    `
})
export class ActionButtonComponent {
    @Input() variant: ActionButtonVariant = 'view';
    @Input() disabled: boolean = false;
    @Input() tooltip: string = '';
    @Input() active: boolean = false;
    
    @Output() action = new EventEmitter<void>();

    handleClick(event: Event) {
        
        if (!this.disabled) {
            this.action.emit();
        }
    }

    getStyles() {
        switch (this.variant) {
            case 'edit':
                return {
                    'background': 'linear-gradient(135deg, #22C1FF, #2563EB)',
                    'box-shadow': '0 2px 8px rgba(34,193,255,0.30)'
                };
            case 'view':
                return {
                    'background': 'linear-gradient(135deg, #34D399, #059669)',
                    'box-shadow': '0 2px 8px rgba(52,211,153,0.30)'
                };
            case 'delete':
                return {
                    'background': 'linear-gradient(135deg, #F87171, #DC2626)',
                    'box-shadow': '0 2px 8px rgba(248,113,113,0.35)'
                };
            case 'payment':
                return {
                    'background': 'linear-gradient(135deg, #FDE68A, #FBBF24)',
                    'box-shadow': '0 2px 8px rgba(251,191,36,0.22)'
                };
            case 'delivery':
                if (this.active) {
                    return {
                        'background': 'linear-gradient(135deg, #34D399, #059669)',
                        'box-shadow': '0 2px 8px rgba(52,211,153,0.35)'
                    };
                } else {
                    return {
                        'background': 'linear-gradient(135deg, #94A3B8, #64748B)',
                        'box-shadow': '0 2px 8px rgba(100,116,139,0.25)'
                    };
                }
            case 'adjust':
                return {
                    'background': 'linear-gradient(135deg, #A855F7, #7E22CE)',
                    'box-shadow': '0 2px 8px rgba(168,85,247,0.30)'
                };
            case 'payment-history':
                return {
                    'background': 'linear-gradient(135deg, #A855F7, #7E22CE)',
                    'box-shadow': '0 2px 8px rgba(168,85,247,0.30)'
                };
            default:
                return {};
        }
    }
}
