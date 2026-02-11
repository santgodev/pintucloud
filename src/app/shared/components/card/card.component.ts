import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="app-card" [class]="customClass">
      <div *ngIf="header" class="card-header">
         <h3 class="card-title">{{header}}</h3>
         <ng-content select="[card-actions]"></ng-content>
      </div>
      <div class="card-body">
         <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`
    .app-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-card);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
      position: relative;
      height: 100%;
    }

    .app-card:hover {
      box-shadow: var(--shadow-card-hover);
      transform: translateY(-2px);
      border-color: var(--color-slate-300);
    }

    .card-header {
      padding: 1.25rem 1.5rem 0.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .card-title {
      font-size: 1rem;
      font-weight: 700;
      color: var(--text-main);
      margin: 0;
      letter-spacing: -0.01em;
    }

    .card-body {
      padding: 1.25rem 1.5rem 1.5rem;
      flex: 1;
    }
  `]
})
export class CardComponent {
  @Input() header?: string;
  @Input() customClass: string = '';
}
