import {
  Component,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import { MatIconModule } from "@angular/material/icon";
import { TournamentFacade } from "@domain/tournament/data-access/tournament.facade";
import { PrimaryButtonComponent } from "@shared/components/primary-button/primary-button.component";

@Component({
  selector: "app-history",
  standalone: true,
  imports: [CommonModule, MatIconModule, PrimaryButtonComponent],
  template: `
    <div class="history-container">
      <div class="history-card">
        <div class="header">
          <h1 class="main-title">
            <mat-icon>history</mat-icon> Historial de Torneos
          </h1>
          <app-primary-button
            variant="outline-dark"
            icon="arrow_back"
            (clicked)="backToSummary()"
          >
            Volver
          </app-primary-button>
        </div>

        @let records = facade.history();
        @if (records.length === 0) {
          <div class="empty-state">
            <mat-icon class="empty-icon">sports_tennis</mat-icon>
            <p>Aún no hay torneos guardados.</p>
            <app-primary-button
              variant="primary"
              icon="add"
              (clicked)="backToForm()"
            >
              Crear Torneo
            </app-primary-button>
          </div>
        } @else {
          <div class="history-list">
            @for (
              record of paginatedRecords();
              track record.id;
              let i = $index
            ) {
              <div class="history-item">
                <div class="history-index">{{ currentIndex() + i + 1 }}</div>
                <div class="history-meta">
                  <span class="history-label">{{ record.label }}</span>
                  <span class="history-info">
                    {{
                      record.config.mode === "fixed-pairs"
                        ? "Parejas fijas"
                        : "Libre"
                    }}
                    ·
                    {{
                      record.config.scoringMode === "sets"
                        ? "Por sets"
                        : "Puntos directos"
                    }}
                    · {{ record.matches.length }} partidos ·
                    {{ record.config.players.length }} jugadores
                  </span>
                </div>
                <div class="history-actions">
                  <app-primary-button
                    variant="primary"
                    icon="visibility"
                    (clicked)="viewTournament(record.id)"
                  >
                    Ver
                  </app-primary-button>
                  <app-primary-button
                    variant="danger"
                    icon="delete"
                    (clicked)="onDelete(record.id)"
                  >
                  </app-primary-button>
                </div>
              </div>
            }
          </div>

          <div class="pagination">
            <app-primary-button
              variant="dark"
              icon="chevron_left"
              [disabled]="page() === 0"
              (clicked)="prevPage()"
            >
              Anterior
            </app-primary-button>
            <span class="page-info"
              >Página {{ page() + 1 }} de {{ totalPages() }}</span
            >
            <app-primary-button
              variant="dark"
              icon="chevron_right"
              [disabled]="page() >= totalPages() - 1"
              (clicked)="nextPage()"
            >
              Siguiente
            </app-primary-button>
          </div>
        }
      </div>
    </div>
  `,
  styleUrl: "./history.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryComponent {
  protected readonly facade = inject(TournamentFacade);
  private readonly router = inject(Router);

  readonly page = signal(0);
  readonly pageSize = 5;

  readonly totalPages = computed(() => {
    const total = this.facade.history().length;
    return Math.max(1, Math.ceil(total / this.pageSize));
  });

  readonly paginatedRecords = computed(() => {
    const start = this.page() * this.pageSize;
    return this.facade.history().slice(start, start + this.pageSize);
  });

  readonly currentIndex = computed(() => this.page() * this.pageSize);

  prevPage(): void {
    this.page.update((p) => Math.max(0, p - 1));
  }

  nextPage(): void {
    this.page.update((p) => Math.min(this.totalPages() - 1, p + 1));
  }

  viewTournament(id: string): void {
    this.router.navigate(["/tournament", id]);
  }

  onDelete(id: string): void {
    this.facade.deleteHistoryRecord(id);
  }

  backToSummary(): void {
    const currentId = this.facade.currentTournamentId();
    if (currentId) {
      this.router.navigate(["/tournament", currentId]);
    } else {
      this.router.navigate(["/"]);
    }
  }

  backToForm(): void {
    this.router.navigate(["/"]);
  }
}
