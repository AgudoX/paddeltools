import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Player } from '@shared/models/player.model';

@Component({
  selector: 'app-pair-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pair-card">
      <div class="pair-header">
        <span class="pair-badge">Pareja {{ index() + 1 }}</span>
      </div>

      <div class="pair-body">
        <div class="pair-slot">
          <div class="slot-label">Jugador 1</div>
          <div class="field">
            <label [for]="'pair-p1-name-' + index()">Nombre</label>
            <input
              type="text"
              [id]="'pair-p1-name-' + index()"
              [ngModel]="pair().player1.name"
              (ngModelChange)="onPlayer1NameChange($event)"
              class="form-input"
              placeholder="Nombre"
            />
          </div>
          <div class="field">
            <label [for]="'pair-p1-pos-' + index()">Posición</label>
            <select
              [id]="'pair-p1-pos-' + index()"
              [ngModel]="pair().player1.position"
              (ngModelChange)="onPlayer1PositionChange($event)"
              class="form-select"
            >
              <option value="either">Indiferente</option>
              <option value="right">Derecha</option>
              <option value="backhand">Revés</option>
            </select>
          </div>
        </div>

        <div class="pair-divider">
          <span class="divider-icon">+</span>
        </div>

        <div class="pair-slot">
          <div class="slot-label">Jugador 2</div>
          <div class="field">
            <label [for]="'pair-p2-name-' + index()">Nombre</label>
            <input
              type="text"
              [id]="'pair-p2-name-' + index()"
              [ngModel]="pair().player2.name"
              (ngModelChange)="onPlayer2NameChange($event)"
              class="form-input"
              placeholder="Nombre"
            />
          </div>
          <div class="field">
            <label [for]="'pair-p2-pos-' + index()">Posición</label>
            <select
              [id]="'pair-p2-pos-' + index()"
              [ngModel]="pair().player2.position"
              (ngModelChange)="onPlayer2PositionChange($event)"
              class="form-select"
            >
              <option value="either">Indiferente</option>
              <option value="right">Derecha</option>
              <option value="backhand">Revés</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: `
    .pair-card {
      display: grid;
      gap: var(--space-lg);
      padding: var(--space-lg);
      border-radius: var(--radius-xl);
      border: 1px solid rgba(var(--feature-accent-rgb, 177, 76, 255), 0.2);
      background:
        radial-gradient(circle at top right, rgba(var(--feature-accent-rgb, 177, 76, 255), 0.18), transparent 42%),
        linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01)),
        var(--surface-deep);
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.04),
        0 24px 40px rgba(0, 0, 0, 0.22);
      transition: all var(--transition-base);
    }

    .pair-header {
      margin-bottom: 0;
    }

    .pair-badge {
      display: inline-flex;
      align-items: center;
      padding: 6px 12px;
      border-radius: var(--radius-full);
      background: rgba(var(--feature-accent-rgb, 177, 76, 255), 0.14);
      color: var(--primary-bright);
      font-family: var(--font-archivo);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-bold);
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }

    .pair-body {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);

      @media (min-width: 640px) {
        flex-direction: row;
        align-items: flex-start;
      }
    }

    .pair-slot {
      flex: 1;
      padding: 16px;
      border-radius: var(--radius-lg);
      border: 1px solid rgba(var(--feature-accent-rgb, 177, 76, 255), 0.16);
      background: rgba(var(--feature-accent-rgb, 177, 76, 255), 0.06);
    }

    .slot-label {
      font-family: var(--font-archivo);
      font-weight: var(--font-weight-bold);
      color: var(--primary-bright);
      margin-bottom: 12px;
      font-size: var(--font-size-xs);
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }

    .pair-divider {
      display: flex;
      align-items: center;
      justify-content: center;

      @media (min-width: 640px) {
        padding: 32px 8px;
      }
    }

    .divider-icon {
      font-size: 24px;
      font-weight: var(--font-weight-bold);
      color: var(--mute);
    }

    .field {
      margin-bottom: 12px;

      &:last-child {
        margin-bottom: 0;
      }
    }

    label {
      font-family: var(--font-archivo);
      font-weight: var(--font-weight-semibold);
      font-size: var(--font-size-sm);
      color: var(--on-dark-mute);
      display: block;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  `
})
export class PairCardComponent {
  readonly pair = input.required<{ id: number; player1: Player; player2: Player }>();
  readonly index = input.required<number>();
  readonly pairChange = output<{ pairId: number; playerId: number; name?: string; position?: Player['position'] }>();

  protected onPlayer1NameChange(name: string): void {
    this.pairChange.emit({ pairId: this.pair().id, playerId: this.pair().player1.id, name });
  }

  protected onPlayer1PositionChange(position: Player['position']): void {
    this.pairChange.emit({ pairId: this.pair().id, playerId: this.pair().player1.id, position });
  }

  protected onPlayer2NameChange(name: string): void {
    this.pairChange.emit({ pairId: this.pair().id, playerId: this.pair().player2.id, name });
  }

  protected onPlayer2PositionChange(position: Player['position']): void {
    this.pairChange.emit({ pairId: this.pair().id, playerId: this.pair().player2.id, position });
  }
}
