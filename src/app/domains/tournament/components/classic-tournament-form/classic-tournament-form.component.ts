import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatIconModule } from "@angular/material/icon";
import { ClassicTournamentFormat } from "@shared/models/player.model";
import { NeonCounterComponent } from "@shared/components/neon-counter/neon-counter.component";

@Component({
  selector: "app-classic-tournament-form",
  standalone: true,
  imports: [CommonModule, MatIconModule, NeonCounterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="classic-panel">
      <div class="classic-panel__intro">
        <span class="classic-panel__eyebrow">Modo Torneo</span>
        <h2 class="classic-panel__title">Cuadro clásico y exportación PDF</h2>
      </div>

      <div class="classic-panel__grid">
        <div class="field">
          <label>Jugadores</label>
          <app-neon-counter
            [value]="numberOfPlayers()"
            [min]="4"
            [step]="2"
            (changed)="numberOfPlayersChanged.emit($event)"
          />
          <small class="field-hint">
            Admite byes automáticos cuando el cuadro no es potencia de 2.
          </small>
        </div>

        <div class="field">
          <label>Formato</label>
          <div class="format-toggle">
            @for (format of formats; track format.value) {
              <button
                type="button"
                class="format-toggle__option"
                [class.format-toggle__option--active]="
                  selectedFormat() === format.value
                "
                [class.format-toggle__option--disabled]="format.disabled"
                [disabled]="format.disabled"
                (click)="formatChanged.emit(format.value)"
              >
                <mat-icon>{{ format.icon }}</mat-icon>
                <span>{{ format.label }}</span>
                @if (format.badge) {
                  <small>{{ format.badge }}</small>
                }
              </button>
            }
          </div>
        </div>
      </div>

      <div class="classic-panel__options">
        <button
          type="button"
          class="option-chip"
          [class.option-chip--active]="seeded()"
          (click)="seededChanged.emit(!seeded())"
        >
          <mat-icon>military_tech</mat-icon>
          Cuadro con cabezas de serie
        </button>

        <button
          type="button"
          class="option-chip"
          [class.option-chip--active]="thirdPlaceMatch()"
          (click)="thirdPlaceMatchChanged.emit(!thirdPlaceMatch())"
        >
          <mat-icon>workspace_premium</mat-icon>
          Partido por el 3er puesto
        </button>
      </div>

      @if (selectedFormat() === "groups-and-playoffs") {
        <div class="classic-panel__note">
          <mat-icon>info</mat-icon>
          <div>
            <strong>Clasificación automática.</strong>
            Generamos grupos equilibrados y el cruce final se completa cuando
            termina cada grupo.
          </div>
        </div>
      }
    </section>
  `,
  styles: `
    .classic-panel__intro {
      max-width: 640px;
    }

    .classic-panel__eyebrow {
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

    .classic-panel__title {
      margin: var(--space-sm) 0 var(--space-xs);
      font-family: var(--font-thunder);
      font-size: clamp(2rem, 4vw, 3.4rem);
      line-height: 0.95;
      letter-spacing: -0.02em;
    }

    .classic-panel__grid {
      display: grid;
      gap: var(--space-md);

      @media (min-width: 768px) {
        grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
      }
    }

    .field-hint {
      display: block;
      color: var(--ash);
      font-size: var(--font-size-sm);
      margin-top: 6px;
      font-family: var(--font-jakarta);
    }

    .format-toggle {
      display: grid;
      gap: 8px;
    }

    .format-toggle__option {
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      gap: 10px;
      min-height: 58px;
      padding: 12px 14px;
      border-radius: var(--radius-lg);
      border: 1px solid rgba(var(--feature-accent-rgb, 177, 76, 255), 0.16);
      background: rgba(var(--feature-accent-rgb, 177, 76, 255), 0.06);
      color: var(--on-dark);
      cursor: pointer;
      transition: all var(--transition-base);
      text-align: left;

      mat-icon {
        color: var(--primary);
      }

      small {
        color: var(--ash);
        font-size: var(--font-size-xs);
        text-transform: uppercase;
      }

      &:hover:not(:disabled) {
        transform: translateY(-1px);
        border-color: rgba(var(--feature-accent-rgb, 177, 76, 255), 0.32);
      }
    }

    .format-toggle__option--active {
      border-color: rgba(var(--feature-accent-rgb, 177, 76, 255), 0.45);
      background: rgba(var(--feature-accent-rgb, 177, 76, 255), 0.14);
      box-shadow: 0 0 0 1px rgba(var(--feature-accent-rgb, 177, 76, 255), 0.18);
    }

    .format-toggle__option--disabled {
      opacity: 0.58;
      cursor: not-allowed;
    }

    .classic-panel__options {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: var(--space-md);
    }

    .option-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-height: 42px;
      padding: 10px 14px;
      border-radius: var(--radius-full);
      border: 1px solid rgba(var(--feature-accent-rgb, 177, 76, 255), 0.18);
      background: rgba(var(--feature-accent-rgb, 177, 76, 255), 0.05);
      color: var(--on-dark-mute);
      font-family: var(--font-archivo);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-semibold);
      cursor: pointer;
      transition: all var(--transition-base);

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      &:hover {
        color: var(--on-dark);
        border-color: rgba(var(--feature-accent-rgb, 177, 76, 255), 0.32);
      }
    }

    .option-chip--active {
      color: var(--on-violet);
      background: linear-gradient(
        135deg,
        var(--primary-bright),
        var(--primary)
      );
      border-color: rgba(var(--feature-accent-rgb, 177, 76, 255), 0.4);
      box-shadow: 0 16px 24px
        rgba(var(--feature-accent-rgb, 177, 76, 255), 0.24);
    }

    .classic-panel__note {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 10px;
      align-items: start;
      padding: 14px 16px;
      border-radius: var(--radius-lg);
      background: rgba(var(--feature-accent-rgb, 177, 76, 255), 0.08);
      border: 1px solid rgba(var(--feature-accent-rgb, 177, 76, 255), 0.14);
      color: var(--on-dark-mute);
      font-size: var(--font-size-sm);
      margin-top: 10px;

      strong {
        color: var(--on-dark);
      }

      mat-icon {
        color: var(--primary);
      }
    }
  `,
})
export class ClassicTournamentFormComponent {
  readonly numberOfPlayers = input.required<number>();
  readonly selectedFormat = input.required<ClassicTournamentFormat>();
  readonly seeded = input(false);
  readonly thirdPlaceMatch = input(false);

  readonly numberOfPlayersChanged = output<number>();
  readonly formatChanged = output<ClassicTournamentFormat>();
  readonly seededChanged = output<boolean>();
  readonly thirdPlaceMatchChanged = output<boolean>();

  protected readonly formats = [
    {
      value: "single-elimination" as const,
      label: "Eliminación directa",
      icon: "account_tree",
      disabled: false,
      badge: "",
    },
    {
      value: "groups-and-playoffs" as const,
      label: "Grupos + playoffs",
      icon: "grid_view",
      disabled: false,
      badge: "",
    },
  ];
}
