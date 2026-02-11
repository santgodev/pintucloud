import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="auth-layout">
         <router-outlet></router-outlet>
    </div>
  `,
  styles: [`
    .auth-layout {
      width: 100%;
    }
    .brand h1 { font-size: 2.2rem; margin: 0; font-weight: 800; letter-spacing: -1px; }
    .brand p { color: var(--color-text-muted); margin-top: 0.5rem; }
    .text-primary { color: var(--color-primary); }
  `]
})
export class AuthLayoutComponent { }
