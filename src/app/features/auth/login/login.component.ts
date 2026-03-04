import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="min-h-screen w-full flex bg-white text-slate-900 selection:bg-indigo-100 selection:text-indigo-700">
      
      <!-- Left Panel: Visual/Brand -->
      <div class="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-900 text-white p-12 flex-col justify-between">
        <!-- Abstract Background -->
        <div class="absolute inset-0 z-0">
           <div class="absolute top-0 right-0 -mr-20 -mt-20 w-[600px] h-[600px] rounded-full bg-indigo-600/20 blur-3xl"></div>
           <div class="absolute bottom-0 left-0 -ml-20 -mb-20 w-[500px] h-[500px] rounded-full bg-blue-500/10 blur-3xl"></div>
           <div class="absolute inset-0 opacity-20" style="background-image: radial-gradient(#ffffff 1px, transparent 1px); background-size: 24px 24px;"></div>
        </div>

        <!-- Content -->
        <div class="relative z-10">
          <div class="mb-8">
            <img src="logo_superior.png"
                 alt="Brochas y Rodillos Superior"
                 style="max-width:260px; width:100%; height:auto; object-fit:contain; border-radius:8px; background:white; padding:12px;">
          </div>
          <h2 class="text-3xl font-bold tracking-tight max-w-md leading-tight">Gestión inteligente para tu inventario empresarial.</h2>
        </div>

        <div class="relative z-10">
          <blockquote class="text-slate-300 text-lg mb-4">
            "Brochas y Rodillos Superior — calidad y servicio en cada orden."
          </blockquote>
          <div class="flex items-center gap-3">
             <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-400 to-purple-400"></div>
             <div class="text-sm font-medium text-slate-200">Equipo de Producto</div>
          </div>
        </div>
      </div>

      <!-- Right Panel: Login Form -->
      <div class="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 lg:p-12 xl:p-24 bg-white relative">
        
        <!-- Mobile Logo (Visible only on small screens) -->
        <div class="lg:hidden absolute top-8 left-8">
             <div class="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 text-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
            </div>
        </div>

        <div class="w-full max-w-[400px] animate-fade-in">
           <!-- Header -->
           <div class="mb-10 text-left">
             <h1 class="text-3xl font-bold text-slate-900 tracking-tight mb-2">Bienvenido de nuevo</h1>
             <p class="text-slate-500 text-base">Ingresa tus credenciales para acceder a tu cuenta.</p>
           </div>

           <!-- Form -->
           <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="flex flex-col gap-6">
              
              <!-- Error Alert -->
              <div *ngIf="error" class="bg-red-50 text-red-600 px-4 py-3 text-sm rounded-lg border border-red-100 flex items-start gap-3 animate-shake">
                  <svg class="w-5 h-5 shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                  <span>{{ error }}</span>
              </div>

               <!-- Email Field -->
              <div class="group relative">
                  <label for="email" class="block text-sm font-semibold text-slate-700 mb-2">Correo electrónico</label>
                  <div class="relative">
                      <input 
                        id="email" 
                        type="email" 
                        formControlName="email"
                        class="w-full h-12 px-4 bg-white border border-slate-200 rounded-lg text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm group-hover:border-slate-300"
                        placeholder="ejemplo@empresa.com"
                        [class.border-red-300]="loginForm.get('email')?.invalid && loginForm.get('email')?.touched"
                      >
                   </div>
                   <p *ngIf="loginForm.get('email')?.invalid && loginForm.get('email')?.touched" class="absolute -bottom-5 left-0 text-xs text-red-500">Ingresa un correo válido.</p>
              </div>

              <!-- Password Field -->
              <div class="group relative">
                   <div class="flex justify-between items-center mb-2">
                      <label for="password" class="text-sm font-semibold text-slate-700">Contraseña</label>
                      <a href="#" class="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors">¿Olvidaste tu contraseña?</a>
                   </div>
                   <div class="relative">
                      <input 
                        id="password" 
                        type="password" 
                        formControlName="password"
                        class="w-full h-12 px-4 bg-white border border-slate-200 rounded-lg text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm group-hover:border-slate-300"
                        placeholder="••••••••"
                        [class.border-red-300]="loginForm.get('password')?.invalid && loginForm.get('password')?.touched"
                      >
                   </div>
              </div>

              <!-- Actions -->
              <div class="mt-2">
                 <button 
                    type="submit" 
                    [disabled]="loginForm.invalid || isLoading"
                    class="w-full h-12 bg-slate-900 text-white text-base font-semibold rounded-lg shadow-lg shadow-slate-900/10 hover:bg-slate-800 hover:shadow-xl hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none transition-all duration-200 flex items-center justify-center gap-2">
                    <span *ngIf="!isLoading">Iniciar Sesión</span>
                    <svg *ngIf="isLoading" class="animate-spin h-5 w-5 text-white/90" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </button>
              </div>

           </form>
           
           <!-- Social/Footer -->
           <div class="mt-8 pt-8 border-t border-slate-100 text-center">
             <p class="text-sm text-slate-500">
               ¿No tienes una cuenta? <a href="#" class="font-semibold text-slate-900 hover:text-indigo-600 transition-colors">Contáctanos</a>
             </p>
           </div>
           
           <div class="mt-12 lg:hidden text-center text-xs text-slate-400">
              <p>&copy; 2026 Brochas y Rodillos Superior®</p>
           </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    
    .animate-fade-in {
      animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      opacity: 0;
      transform: translateY(20px);
    }
    
    .animate-shake {
       animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
    }

    @keyframes fadeIn {
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes shake {
      10%, 90% { transform: translate3d(-1px, 0, 0); }
      20%, 80% { transform: translate3d(2px, 0, 0); }
      30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
      40%, 60% { transform: translate3d(4px, 0, 0); }
    }
  `]
})
export class LoginComponent {
  loginForm: FormGroup;
  isLoading = false;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  onSubmit() {
    if (this.loginForm.invalid) return;

    this.isLoading = true;
    this.error = null;

    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: (success) => {
        this.isLoading = false;
        if (success) {
          this.router.navigate(['/dashboard']);
        } else {
          this.error = 'El correo o la contraseña son incorrectos.';
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.error = 'No se pudo conectar con el servidor.';
        console.error(err);
      }
    });
  }
}
