import { Component, input, output, model, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Player } from '@shared/models/player.model';

@Component({
  selector: 'app-player-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="player-card" [style.--card-index]="index()">
      <div class="player-avatar">
        <span class="player-initials">{{ initials() }}</span>
        <span class="player-number">{{ index() + 1 }}</span>
      </div>

      <div class="player-body">
        <div class="field">
          <label [for]="'name-' + player().id">Nombre</label>
          <input
            type="text"
            [id]="'name-' + player().id"
            [ngModel]="player().name"
            (ngModelChange)="onNameChange($event)"
            class="form-input"
            placeholder="Nombre del jugador"
          />
        </div>

        <div class="field">
          <label [for]="'position-' + player().id">Posición</label>
          <div class="position-tabs">
            @for (opt of positionOptions; track opt.value) {
              <button
                type="button"
                class="position-tab"
                [class.active]="player().position === opt.value"
                (click)="onPositionChange(opt.value)"
              >
                {{ opt.label }}
              </button>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: `
    .player-card {
      background: var(--surface-deep);
      border: 1px solid var(--hairline-dark);
      border-radius: var(--radius-lg);
      padding: 16px;
      display: flex;
      gap: 14px;
      transition: all var(--transition-base);
      position: relative;
      overflow: hidden;

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        bottom: 0;
        width: 3px;
        background: var(--primary);
        opacity: 0;
        transition: opacity var(--transition-base);
      }

      &:hover {
        border-color: rgba(204, 255, 0, 0.3);

        &::before {
          opacity: 1;
        }
      }
    }

    .player-avatar {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
      padding-top: 4px;
    }

    .player-initials {
      width: 42px;
      height: 42px;
      border-radius: var(--radius-full);
      background: var(--charcoal);
      color: var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-archivo);
      font-weight: var(--font-weight-bold);
      font-size: var(--font-size-base);
      border: 1px solid rgba(204, 255, 0, 0.2);
    }

    .player-number {
      font-family: var(--font-archivo);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-bold);
      color: var(--mute);
    }

    .player-body {
      flex: 1;
      min-width: 0;
    }

    .field {
      margin-bottom: 10px;

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

    .position-tabs {
      display: flex;
      gap: 4px;
      background: var(--canvas-dark);
      padding: 3px;
      border-radius: var(--radius-sm);
    }

    .position-tab {
      flex: 1;
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      background: transparent;
      color: var(--ash);
      font-family: var(--font-jakarta);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-semibold);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        color: var(--on-dark);
      }

      &.active {
        background: var(--primary);
        color: var(--on-primary);
      }
    }
  `
})
export class PlayerCardComponent {
  readonly player = input.required<Player>();
  readonly index = input.required<number>();
  readonly playerChange = output<{ id: number; name?: string; position?: Player['position'] }>();

  protected readonly positionOptions = [
    { value: 'either' as const, label: 'Indif' },
    { value: 'right' as const, label: 'Dcha' },
    { value: 'backhand' as const, label: 'Revés' },
  ];

  protected initials(): string {
    const name = this.player().name;
    if (!name || name === `Jugador ${this.player().id}`) return `J${this.index() + 1}`;
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  protected onNameChange(name: string): void {
    this.playerChange.emit({ id: this.player().id, name });
  }

  protected onPositionChange(position: Player['position']): void {
    this.playerChange.emit({ id: this.player().id, position });
  }
}
