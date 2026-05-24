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
import { FloatingButtonComponent } from "@shared/components/floating-button/floating-button.component";
import { PadelCraftLogoComponent } from "@shared/components/padelcraft-logo/padelcraft-logo.component";
import { TournamentRecord } from "@shared/models/player.model";

@Component({
  selector: "app-history-page",
  standalone: true,
  imports: [CommonModule, MatIconModule, FloatingButtonComponent, PadelCraftLogoComponent],
  template: `
    <div class="history-container">
      <div class="history-card">
        <div class="header">
          <h1 class="main-title">
            <mat-icon>history</mat-icon> Historial de Torneos
          </h1>
          <app-floating-button
            icon="arrow_back"
            title="Volver"
            ariaLabel="Volver"
            (clicked)="backToSummary()"
          >
            Volver
          </app-floating-button>
        </div>

        @let records = facade.history();
         @if (records.length === 0) {
           <div class="empty-state">
             <app-padelcraft-logo class="empty-icon" [size]="80" />
             <p>Aún no hay torneos guardados.</p>
            <app-floating-button
              variant="primary"
              icon="add"
              title="Crear torneo"
              ariaLabel="Crear torneo"
              (clicked)="backToForm()"
            >
              Crear Torneo
            </app-floating-button>
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
                    {{ recordTypeLabel(record) }}
                    · {{ recordFormatLabel(record) }}
                    · {{ record.matches.length }} partidos ·
                    {{ record.config.players.length }} jugadores
                  </span>
                </div>
                <div class="history-actions">
                  <app-floating-button
                    variant="primary"
                    icon="visibility"
                    title="Ver torneo"
                    ariaLabel="Ver torneo"
                    (clicked)="viewTournament(record.id)"
                  >
                    Ver
                  </app-floating-button>
                  <app-floating-button
                    variant="danger"
                    icon="delete"
                    title="Eliminar torneo"
                    ariaLabel="Eliminar torneo"
                    (clicked)="onDelete(record.id)"
                  >
                  </app-floating-button>
                </div>
              </div>
            }
          </div>

          <div class="pagination">
            <app-floating-button
              icon="chevron_left"
              title="Página anterior"
              ariaLabel="Página anterior"
              [disabled]="page() === 0"
              (clicked)="prevPage()"
            >
              Anterior
            </app-floating-button>
            <span class="page-info"
              >Página {{ page() + 1 }} de {{ totalPages() }}</span
            >
            <app-floating-button
              icon="chevron_right"
              title="Página siguiente"
              ariaLabel="Página siguiente"
              [disabled]="page() >= totalPages() - 1"
              (clicked)="nextPage()"
            >
              Siguiente
            </app-floating-button>
          </div>
        }
      </div>
    </div>
  `,
  styleUrl: "./history-page.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryPageComponent {
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
    const record = this.facade.history().find((item) => item.id === id);
    this.router.navigate(this.routeForRecord(record));
  }

  onDelete(id: string): void {
    this.facade.deleteHistoryRecord(id);
  }

  backToSummary(): void {
    const currentId = this.facade.currentTournamentId();
    if (currentId) {
      const record = this.facade.history().find((item) => item.id === currentId);
      this.router.navigate(this.routeForRecord(record ?? currentId));
    } else {
      this.router.navigate(["/"]);
    }
  }

  backToForm(): void {
    this.router.navigate(["/"]);
  }

  protected recordTypeLabel(record: TournamentRecord): string {
    if (record.config.type === "classic") {
      return "Torneo clásico";
    }

    return record.config.mode === "fixed-pairs" ? "Parejas fijas" : "Libre";
  }

  protected recordFormatLabel(record: TournamentRecord): string {
    if (record.config.type === "classic") {
      return record.config.seeded ? "Cuadro con siembra" : "Cuadro abierto";
    }

    return record.config.scoringMode === "sets" ? "Por sets" : "Puntos directos";
  }

  private routeForRecord(record: TournamentRecord | string | undefined): string[] {
    if (!record) {
      return ["/"];
    }

    if (typeof record === "string") {
      return ["/tournament", record];
    }

    return record.config.type === "classic"
      ? ["/classic-tournament", record.id]
      : ["/tournament", record.id];
  }
}
