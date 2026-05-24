import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatIconModule } from "@angular/material/icon";
import { CompetitionType } from "@shared/models/player.model";

@Component({
  selector: "app-tournament-type-tabs",
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="type-tabs" role="tablist" aria-label="Tipo de competición">
      @for (tab of tabs; track tab.value) {
        <button
          type="button"
          class="type-tabs__button"
          role="tab"
          [class.type-tabs__button--active]="active() === tab.value"
          [attr.aria-selected]="active() === tab.value"
          (click)="selected.emit(tab.value)"
        >
          <mat-icon>{{ tab.icon }}</mat-icon>
          <span>{{ tab.label }}</span>
        </button>
      }
    </div>
  `,
  styles: `
    .type-tabs {
      display: grid;
      grid-template-columns: 1fr;
      gap: 10px;
      margin-bottom: var(--space-xl);
      padding: 10px;
      border-radius: calc(var(--radius-xl) + 6px);
      background:
        linear-gradient(
          180deg,
          rgba(255, 255, 255, 0.04),
          rgba(255, 255, 255, 0.02)
        ),
        var(--surface-deep);
      border: 1px solid var(--hairline-dark);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);

      @media (min-width: 640px) {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    .type-tabs__button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      min-height: 54px;
      padding: 12px 16px;
      border: 1px solid transparent;
      border-radius: var(--radius-lg);
      background: transparent;
      color: var(--on-dark-mute);
      font-family: var(--font-archivo);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-bold);
      letter-spacing: 0.4px;
      text-transform: uppercase;
      cursor: pointer;
      transition:
        transform var(--transition-fast),
        background var(--transition-base),
        color var(--transition-base),
        border-color var(--transition-base),
        box-shadow var(--transition-base);

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      &:hover {
        transform: translateY(-1px);
      }
    }

    .type-tabs__button--active {
      color: var(--on-primary);
      background: linear-gradient(
        135deg,
        var(--primary-bright),
        var(--primary)
      );
      border-color: rgba(var(--feature-accent-rgb, 204, 255, 0), 0.32);
      box-shadow:
        0 0 0 1px rgba(var(--feature-accent-rgb, 204, 255, 0), 0.16),
        0 18px 32px rgba(var(--feature-accent-rgb, 204, 255, 0), 0.2);
    }
  `,
})
export class TournamentTypeTabsComponent {
  readonly active = input.required<CompetitionType>();
  readonly selected = output<CompetitionType>();

  protected readonly tabs = [
    { value: "americano" as const, label: "Crear Americano", icon: "bolt" },
    { value: "classic" as const, label: "Crear Torneo", icon: "emoji_events" },
  ];
}
