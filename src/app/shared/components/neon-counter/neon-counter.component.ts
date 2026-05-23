import { Component, input, output, signal, ChangeDetectionStrategy, effect, OnInit } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-neon-counter',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('slideChange', [
      transition(':enter', [
        style({ transform: 'translateY(100%)', opacity: 0 }),
        animate('400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          style({ transform: 'translateY(0)', opacity: 1 })),
      ]),
      transition(':leave', [
        animate('200ms ease-in',
          style({ transform: 'translateY(-100%)', opacity: 0 })),
      ]),
    ]),
  ],
  template: `
    <div class="neon-counter">
      <button
        class="neon-btn neon-btn--minus"
        (click)="decrement()"
        [disabled]="value() <= min()"
        aria-label="Decrement"
        type="button"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>

      <div class="neon-display">
        <div class="neon-track">
          @for (item of items(); track item.id) {
            <span class="neon-digit" [@slideChange]>
              {{ item.value }}
            </span>
          }
        </div>
      </div>

      <button
        class="neon-btn neon-btn--plus"
        (click)="increment()"
        [disabled]="value() >= max()"
        aria-label="Increment"
        type="button"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
          <line x1="5" y1="12" x2="19" y2="12"/>
          <line x1="12" y1="5" x2="12" y2="19"/>
        </svg>
      </button>
    </div>
  `,
  styles: [`
    .neon-counter {
      display: flex;
      align-items: center;
      gap: 12px;
      justify-content: center;
    }

    .neon-btn {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: 2px solid rgba(204, 255, 0, 0.3);
      background: rgba(204, 255, 0, 0.05);
      color: #ccff00;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      flex-shrink: 0;
      padding: 0;
      line-height: 1;
    }

    .neon-btn:hover:not(:disabled) {
      background: rgba(204, 255, 0, 0.15);
      border-color: #ccff00;
      box-shadow: 0 0 14px rgba(204, 255, 0, 0.35);
    }

    .neon-btn:active:not(:disabled) {
      transform: scale(0.88);
    }

    .neon-btn:disabled {
      opacity: 0.2;
      cursor: not-allowed;
    }

    .neon-display {
      min-width: 90px;
      text-align: center;
      padding: 4px 16px;
      position: relative;
    }

    .neon-track {
      position: relative;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .neon-digit {
      font-family: var(--font-thunder, 'Impact'), sans-serif;
      font-size: 54px;
      font-weight: 900;
      color: #ccff00;
      line-height: 1;
      display: block;
      text-shadow:
        0 0 7px rgba(204, 255, 0, 0.8),
        0 0 14px rgba(204, 255, 0, 0.6),
        0 0 28px rgba(204, 255, 0, 0.4),
        0 0 56px rgba(204, 255, 0, 0.2);
      animation: neonPulse 2.4s ease-in-out infinite;
    }

    @keyframes neonPulse {
      0%, 100% {
        text-shadow:
          0 0 7px rgba(204, 255, 0, 0.8),
          0 0 14px rgba(204, 255, 0, 0.6),
          0 0 28px rgba(204, 255, 0, 0.4),
          0 0 56px rgba(204, 255, 0, 0.2);
      }
      50% {
        text-shadow:
          0 0 12px rgba(204, 255, 0, 1),
          0 0 24px rgba(204, 255, 0, 0.8),
          0 0 48px rgba(204, 255, 0, 0.6),
          0 0 80px rgba(204, 255, 0, 0.3);
      }
    }
  `],
})
export class NeonCounterComponent implements OnInit {
  readonly value = input.required<number>();
  readonly min = input(0);
  readonly max = input(999);
  readonly step = input(1);
  readonly changed = output<number>();

  protected readonly items = signal<Array<{ id: number; value: number }>>([]);
  private idSeq = 0;

  constructor() {
    effect(() => {
      const v = this.value();
      this.idSeq++;
      if (this.idSeq === 1) return;
      this.items.set([{ id: this.idSeq, value: v }]);
    });
  }

  ngOnInit(): void {
    this.items.set([{ id: 0, value: this.value() }]);
  }

  decrement(): void {
    this.changed.emit(this.value() - this.step());
  }

  increment(): void {
    this.changed.emit(this.value() + this.step());
  }
}
