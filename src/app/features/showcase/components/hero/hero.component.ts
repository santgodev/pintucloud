import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="hero-container">
      <div class="hero-background">
        <!-- Image suggesting construction/craftsmanship -->
        <img src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=2670&auto=format&fit=crop" alt="Workshop Background" class="hero-image">
        <div class="overlay"></div>
      </div>
      <div class="hero-content">
        <h1 class="hero-title">
          <span class="primary-text">ARTESANÍA</span><br>
          <span class="secondary-text">INDUSTRIAL</span>
        </h1>
        <div class="divider"></div>
        <p class="hero-subtitle">Herramientas auténticas para el trabajo real.</p>
      </div>
    </section>
  `,
  styles: [`
    .hero-container {
      position: relative;
      height: 45vh;
      min-height: 400px;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      padding: 0 5rem;
      overflow: hidden;
      color: var(--color-text-main);
      border-bottom: 1px solid var(--color-border);
    }

    .hero-background {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1;
    }

    .hero-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      /* Warm, slightly desaturated "film" look for realism */
      filter: sepia(0.1) contrast(0.9) brightness(1.1);
    }

    .overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      /* Transition to system page background color */
      background: linear-gradient(90deg, var(--color-bg-page) 0%, rgba(244, 244, 240, 0.8) 50%, rgba(244, 244, 240, 0.2) 100%);
    }

    .hero-content {
      position: relative;
      z-index: 2;
      max-width: 600px;
      padding-top: 2rem;
    }

    .hero-title {
      font-size: 4rem;
      line-height: 0.95;
      margin-bottom: 2rem;
      text-transform: uppercase;
      letter-spacing: -2px;
    }

    .primary-text {
      font-weight: 800;
      color: var(--color-text-main);
    }

    .secondary-text {
      font-weight: 300;
      color: var(--color-text-muted);
    }

    .divider {
      width: 60px;
      height: 4px;
      background-color: var(--color-accent);
      margin-bottom: 2rem;
    }

    .hero-subtitle {
      font-size: 1.1rem;
      font-weight: 500;
      color: var(--color-text-muted);
      max-width: 450px;
      line-height: 1.5;
    }


    @media (max-width: 768px) {
      .hero-title { font-size: 2.5rem; }
      .hero-container { padding: 0 2rem; }
    }
  `]
})
export class HeroComponent {
  @Input() title: string = '';
}
