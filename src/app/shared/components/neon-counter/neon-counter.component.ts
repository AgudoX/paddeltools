import {
  Component,
  input,
  output,
  signal,
  ChangeDetectionStrategy,
  effect,
  OnInit,
} from "@angular/core";
import {
  trigger,
  transition,
  style,
  animate,
  keyframes,
} from "@angular/animations";

@Component({
  selector: "app-neon-counter",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger("exitUp", [
      transition(":enter", [
        style({ transform: "translateY(0)", opacity: 1 }),
        animate(
          "180ms ease-in",
          style({ transform: "translateY(-100%)", opacity: 0 }),
        ),
      ]),
    ]),
    trigger("enterUp", [
      transition(":increment", [
        style({ transform: "translateY(100%)", opacity: 0 }),
        animate(
          "300ms 180ms cubic-bezier(0.34, 1.56, 0.64, 1)",
          style({ transform: "translateY(0)", opacity: 1 }),
        ),
      ]),
    ]),
    trigger("displayPulse", [
      transition(":increment", [
        animate(
          "450ms ease-out",
          keyframes([
            style({ transform: "scale(1)", offset: 0 }),
            style({ transform: "scale(1.06)", offset: 0.3 }),
            style({ transform: "scale(0.97)", offset: 0.6 }),
            style({ transform: "scale(1)", offset: 1 }),
          ]),
        ),
      ]),
    ]),
    trigger("btnMoveLeft", [
      transition(":increment", [
        animate(
          "350ms ease-out",
          keyframes([
            style({ transform: "translateX(0)", offset: 0 }),
            style({ transform: "translateX(-10px)", offset: 0.25 }),
            style({ transform: "translateX(0)", offset: 1 }),
          ]),
        ),
      ]),
    ]),
    trigger("btnMoveRight", [
      transition(":increment", [
        animate(
          "350ms ease-out",
          keyframes([
            style({ transform: "translateX(0)", offset: 0 }),
            style({ transform: "translateX(10px)", offset: 0.25 }),
            style({ transform: "translateX(0)", offset: 1 }),
          ]),
        ),
      ]),
    ]),
  ],
  template: `
    <div class="neon-counter">
      <button
        class="neon-btn neon-btn--minus"
        [@btnMoveLeft]="animKey()"
        (click)="decrement()"
        [disabled]="value() <= min()"
        aria-label="Decrement"
        type="button"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="3"
          stroke-linecap="round"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      <div class="neon-display" [@displayPulse]="animKey()">
        <div class="neon-track">
          @if (showLeaving()) {
            <span class="neon-digit" [@exitUp]>
              {{ leavingValue() }}
            </span>
          }
          <span class="neon-digit" [@enterUp]="animKey()">
            {{ currentValue() }}
          </span>
        </div>
      </div>

      <button
        class="neon-btn neon-btn--plus"
        [@btnMoveRight]="animKey()"
        (click)="increment()"
        [disabled]="value() >= max()"
        aria-label="Increment"
        type="button"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="3"
          stroke-linecap="round"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
          <line x1="12" y1="5" x2="12" y2="19" />
        </svg>
      </button>
    </div>
  `,
  styles: [
    `
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
        position: relative;
        background: radial-gradient(
          ellipse at center,
          rgba(204, 255, 0, 0.07) 0%,
          transparent 70%
        );
        box-shadow:
          0 0 20px rgba(204, 255, 0, 0.12),
          inset 0 0 30px rgba(204, 255, 0, 0.03);
        border-radius: 12px;
        border: 1px solid rgba(204, 255, 0, 0.1);
      }

      .neon-track {
        position: relative;
        height: 60px;
        overflow: hidden;
      }

      .neon-digit {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: var(--font-thunder, "Impact"), sans-serif;
        font-size: 54px;
        font-weight: 900;
        color: #ccff00;
        line-height: 1;
        text-shadow:
          0 0 7px rgba(204, 255, 0, 0.8),
          0 0 14px rgba(204, 255, 0, 0.6),
          0 0 28px rgba(204, 255, 0, 0.4),
          0 0 56px rgba(204, 255, 0, 0.2);
        animation: neonPulse 2.4s ease-in-out infinite;
      }

      @keyframes neonPulse {
        0%,
        100% {
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
    `,
  ],
})
export class NeonCounterComponent implements OnInit {
  readonly value = input.required<number>();
  readonly min = input(0);
  readonly max = input(999);
  readonly step = input(1);
  readonly changed = output<number>();

  protected readonly currentValue = signal(0);
  protected readonly leavingValue = signal<number | null>(null);
  protected readonly showLeaving = signal(false);
  protected readonly animKey = signal(0);
  private firstRun = true;
  private leaveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const v = this.value();
      if (this.firstRun) {
        this.firstRun = false;
        return;
      }
      this.leavingValue.set(this.currentValue());
      this.currentValue.set(v);
      this.showLeaving.set(true);
      this.animKey.update((k) => k + 1);

      if (this.leaveTimer) clearTimeout(this.leaveTimer);
      this.leaveTimer = setTimeout(() => {
        this.showLeaving.set(false);
      }, 200);
    });
  }

  ngOnInit(): void {
    this.currentValue.set(this.value());
  }

  decrement(): void {
    this.changed.emit(this.value() - this.step());
  }

  increment(): void {
    this.changed.emit(this.value() + this.step());
  }
}
