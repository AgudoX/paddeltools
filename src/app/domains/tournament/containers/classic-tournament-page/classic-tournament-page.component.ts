import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router } from "@angular/router";
import { MatIconModule } from "@angular/material/icon";
import {
  ClassicTournamentConfig,
  Match,
  SetScore,
} from "@shared/models/player.model";
import { FormsModule } from "@angular/forms";
import { TournamentFacade } from "@domain/tournament/data-access/tournament.facade";
import { FloatingButtonComponent } from "@shared/components/floating-button/floating-button.component";
import { NotificationService } from "@shared/services/notification.service";
import { TournamentPdfService } from "@domain/tournament/data-access/infrastructure/tournament-pdf.service";
import {
  getMatchWinner as getBracketMatchWinner,
  getSetWinner,
  isMatchComplete,
} from "@domain/tournament/data-access/utils/tournament-scoring.utils";

@Component({
  selector: "app-classic-tournament-page",
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, FloatingButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="classic-view">
      <div class="classic-view__card">
        @if (config) {
          <header class="classic-view__hero">
            <div>
              <span class="classic-view__eyebrow">Torneo clásico</span>
              <h1 class="classic-view__title neon-title" data-text="Padeleria">
                {{ config.name || "Cuadro clásico" }}
              </h1>
              <p class="classic-view__subtitle">
                {{ config.pairs.length }} parejas ·
                {{
                  config.seeded
                    ? "Con cabezas de serie"
                    : "Sin cabezas de serie"
                }}
                ·
                {{
                  config.thirdPlaceMatch
                    ? "Incluye 3er puesto"
                    : "Sin 3er puesto"
                }}
              </p>
            </div>

            <div class="classic-view__actions classic-view__actions--no-print">
              <app-floating-button
                variant="primary"
                icon="picture_as_pdf"
                title="Exportar cuadro en PDF"
                ariaLabel="Exportar cuadro en PDF"
                (clicked)="exportPdf()"
              >
                PDF
              </app-floating-button>
              <app-floating-button
                icon="history"
                title="Ir al historial"
                ariaLabel="Ir al historial"
                (clicked)="goToHistory()"
              >
                Historial
              </app-floating-button>
              <app-floating-button
                variant="primary"
                icon="arrow_back"
                title="Volver a configuración"
                ariaLabel="Volver a configuración"
                (clicked)="backToForm()"
              >
                Configuración
              </app-floating-button>
            </div>
          </header>

          <section class="classic-view__section">
            <h2 class="classic-view__section-title">
              <mat-icon>groups_2</mat-icon>
              Parejas participantes
            </h2>
            <div class="classic-view__pairs">
              @for (pair of config.pairs; track pair.id) {
                <article class="pair-chip">
                  <span class="pair-chip__index">#{{ pair.id }}</span>
                  <div class="pair-chip__names">
                    <strong>{{ pair.player1.name }}</strong>
                    <span>&</span>
                    <strong>{{ pair.player2.name }}</strong>
                  </div>
                </article>
              }
            </div>
          </section>

          <section class="classic-view__section">
            <h2 class="classic-view__section-title">
              <mat-icon>account_tree</mat-icon>
              Cuadro del torneo
            </h2>
            <div class="bracket-grid">
              @for (round of rounds; track round) {
                <div class="round-column">
                  <div class="round-column__title">
                    {{ roundTitle(round) }}
                  </div>
                  <div class="round-column__matches">
                    @for (
                      match of matchesByRound.get(round) ?? [];
                      track match.number
                    ) {
                      <article
                        class="bracket-match"
                        [class.bracket-match--completed]="match.completed"
                      >
                        <div class="bracket-match__header">
                          <span>Partido {{ match.number }}</span>
                          @if (match.completed && match.winner) {
                            <span class="bracket-match__status">Resuelto</span>
                          }
                        </div>

                        <div
                          class="bracket-pair"
                          [class.bracket-pair--winner]="
                            match.winner === 'pair1'
                          "
                          [class.bracket-pair--bye]="isByePair(match.pair1)"
                        >
                          {{ pairLabel(match.pair1) }}
                        </div>
                        <div
                          class="bracket-pair"
                          [class.bracket-pair--winner]="
                            match.winner === 'pair2'
                          "
                          [class.bracket-pair--bye]="isByePair(match.pair2)"
                        >
                          {{ pairLabel(match.pair2) }}
                        </div>
                        @if (editingMatch === match.number) {
                          <div
                            class="bracket-match__editor classic-view__actions--no-print"
                          >
                            <div class="bracket-match__editor-grid">
                              @for (setIndex of setIndexes; track setIndex) {
                                <div class="set-editor">
                                  <span class="set-editor__label"
                                    >Set {{ setIndex + 1 }}</span
                                  >
                                  <div class="set-editor__inputs">
                                    <input
                                      type="number"
                                      min="0"
                                      max="99"
                                      [disabled]="
                                        !shouldShowSet(match, setIndex)
                                      "
                                      [(ngModel)]="
                                        editableSets[match.number][setIndex]
                                          .pair1Games
                                      "
                                    />
                                    <span>-</span>
                                    <input
                                      type="number"
                                      min="0"
                                      max="99"
                                      [disabled]="
                                        !shouldShowSet(match, setIndex)
                                      "
                                      [(ngModel)]="
                                        editableSets[match.number][setIndex]
                                          .pair2Games
                                      "
                                    />
                                  </div>
                                </div>
                              }
                            </div>
                            <div class="bracket-match__actions">
                              <app-floating-button
                                variant="primary"
                                icon="check"
                                title="Guardar resultado"
                                ariaLabel="Guardar resultado"
                                (clicked)="saveMatchEdit(match)"
                              >
                                Guardar resultado
                              </app-floating-button>
                              <app-floating-button
                                variant="danger"
                                icon="close"
                                title="Cancelar edición"
                                ariaLabel="Cancelar edición"
                                (clicked)="cancelMatchEdit(match.number)"
                              >
                                Cancelar
                              </app-floating-button>
                            </div>
                          </div>
                        } @else if (canResolveMatch(match)) {
                          <div
                            class="bracket-match__actions classic-view__actions--no-print"
                          >
                            <app-floating-button
                              icon="edit"
                              title="Editar resultado"
                              ariaLabel="Editar resultado"
                              (clicked)="startMatchEdit(match.number)"
                            >
                              {{
                                match.completed
                                  ? "Editar resultado"
                                  : "Puntuar partido"
                              }}
                            </app-floating-button>
                            <app-floating-button
                              variant="primary"
                              icon="north_east"
                              title="Avanza la primera pareja"
                              ariaLabel="Avanza la primera pareja"
                              (clicked)="resolveMatch(match.number, 'pair1')"
                            >
                              Pasa Pareja 1
                            </app-floating-button>
                            <app-floating-button
                              variant="primary"
                              icon="south_east"
                              title="Avanza la segunda pareja"
                              ariaLabel="Avanza la segunda pareja"
                              (clicked)="resolveMatch(match.number, 'pair2')"
                            >
                              Pasa Pareja 2
                            </app-floating-button>
                            @if (match.completed) {
                              <app-floating-button
                                variant="danger"
                                icon="restart_alt"
                                title="Reabrir partido"
                                ariaLabel="Reabrir partido"
                                (clicked)="revertMatch(match.number)"
                              >
                                Reabrir
                              </app-floating-button>
                            }
                          </div>
                        }
                      </article>
                    }
                  </div>
                </div>
              }
            </div>
          </section>
        } @else {
          <div class="classic-view__empty">
            <mat-icon>search_off</mat-icon>
            <p>No encontramos ese torneo clásico.</p>
            <app-floating-button
              icon="arrow_back"
              title="Volver al historial"
              ariaLabel="Volver al historial"
              (clicked)="goToHistory()"
            >
              Volver
            </app-floating-button>
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    .classic-view {
      --feature-accent-rgb: 177, 76, 255;
      --primary: var(--violet-500);
      --primary-bright: #c89dff;
      --primary-deep: var(--violet-600);
      --on-primary: var(--on-violet);
      --neon-shadow-soft: rgba(177, 76, 255, 0.28);
      --neon-shadow-mid: rgba(177, 76, 255, 0.18);
      --neon-shadow-strong: rgba(216, 150, 255, 0.52);
      --neon-shadow-hot: rgba(177, 76, 255, 0.32);
      min-height: 100vh;
      padding: var(--space-md);
      background:
        radial-gradient(
          circle at top center,
          rgba(177, 76, 255, 0.12),
          transparent 28%
        ),
        var(--canvas-dark);
    }

    .classic-view__card {
      max-width: 1320px;
      margin: 0 auto;
      padding: var(--space-lg);
      border-radius: var(--radius-xl);
      background: var(--surface-elevated);
      border: 1px solid rgba(177, 76, 255, 0.16);
      box-shadow:
        0 0 32px rgba(177, 76, 255, 0.14),
        0 30px 60px rgba(0, 0, 0, 0.3);
    }

    .classic-view__hero {
      display: grid;
      gap: var(--space-lg);
      margin-bottom: var(--space-xl);
      padding-bottom: var(--space-xl);
      border-bottom: 1px solid rgba(177, 76, 255, 0.16);

      @media (min-width: 960px) {
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: end;
      }
    }

    .classic-view__eyebrow {
      display: inline-flex;
      padding: 6px 12px;
      border-radius: var(--radius-full);
      background: rgba(177, 76, 255, 0.12);
      color: var(--primary-bright);
      font-family: var(--font-archivo);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-bold);
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }

    .classic-view__title {
      margin: 12px 0px 10px 15px;
      padding: 0;
      font-family: var(--font-thunder);
      font-size: clamp(3rem, 8vw, 3.4rem);
      line-height: 0.9;
    }

    .classic-view__subtitle {
      margin: 0;
      color: var(--on-dark-mute);
      font-family: var(--font-jakarta);
    }

    .classic-view__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      justify-content: flex-start;

      @media (min-width: 960px) {
        justify-content: flex-end;
      }
    }

    .classic-view__section {
      margin-bottom: var(--space-xxl);
    }

    .classic-view__section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 var(--space-lg);
      padding-bottom: 10px;
      border-bottom: 2px solid var(--primary);
    }

    .classic-view__pairs {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
    }

    .pair-chip {
      display: grid;
      gap: 8px;
      padding: 16px;
      border-radius: var(--radius-lg);
      background: rgba(177, 76, 255, 0.08);
      border: 1px solid rgba(177, 76, 255, 0.16);
    }

    .pair-chip__index {
      color: var(--primary-bright);
      font-family: var(--font-archivo);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-bold);
      text-transform: uppercase;
      letter-spacing: 0.6px;
    }

    .pair-chip__names {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
    }

    .bracket-grid {
      display: grid;
      gap: 16px;
      overflow-x: auto;

      @media (min-width: 900px) {
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      }
    }

    .round-column {
      min-width: 260px;
      padding: 16px;
      border-radius: var(--radius-xl);
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(177, 76, 255, 0.12);
    }

    .round-column__title {
      margin-bottom: 14px;
      color: var(--primary-bright);
      font-family: var(--font-archivo);
      font-weight: var(--font-weight-bold);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .round-column__matches {
      display: grid;
      gap: 14px;
    }

    .bracket-match {
      padding: 14px;
      border-radius: var(--radius-lg);
      background: var(--surface-deep);
      border: 1px solid rgba(177, 76, 255, 0.12);
    }

    .bracket-match--completed {
      box-shadow: 0 0 0 1px rgba(177, 76, 255, 0.16);
    }

    .bracket-match__header {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 10px;
      font-size: var(--font-size-xs);
      color: var(--ash);
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .bracket-match__status {
      color: var(--primary-bright);
    }

    .bracket-match__actions {
      display: grid;
      gap: 8px;
      margin-top: 12px;

      @media (min-width: 1180px) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    .bracket-match__editor {
      display: grid;
      gap: 12px;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid rgba(177, 76, 255, 0.12);
    }

    .bracket-match__editor-grid {
      display: grid;
      gap: 10px;

      @media (min-width: 880px) {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }

    .set-editor {
      display: grid;
      gap: 8px;
      padding: 12px;
      border-radius: 12px;
      background: rgba(177, 76, 255, 0.08);
      border: 1px solid rgba(177, 76, 255, 0.16);
    }

    .set-editor__label {
      color: var(--primary-bright);
      font-family: var(--font-archivo);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-bold);
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .set-editor__inputs {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
      gap: 8px;
      align-items: center;
    }

    .set-editor__inputs input {
      width: 100%;
      min-width: 0;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid rgba(177, 76, 255, 0.2);
      background: rgba(8, 6, 12, 0.85);
      color: var(--on-dark);
      font: inherit;
      text-align: center;
    }

    .set-editor__inputs input:disabled {
      opacity: 0.48;
      cursor: not-allowed;
    }

    .bracket-pair {
      padding: 10px 12px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid transparent;
      color: var(--on-dark);
    }

    .bracket-pair + .bracket-pair {
      margin-top: 8px;
    }

    .bracket-pair--winner {
      border-color: rgba(177, 76, 255, 0.3);
      background: rgba(177, 76, 255, 0.14);
      color: var(--primary-bright);
      font-weight: var(--font-weight-bold);
    }

    .bracket-pair--bye {
      color: var(--ash);
      font-style: italic;
    }

    .classic-view__empty {
      display: grid;
      gap: 12px;
      justify-items: center;
      padding: var(--space-xxl) var(--space-lg);
      text-align: center;
    }
  `,
})
export class ClassicTournamentPageComponent implements OnInit {
  private readonly facade = inject(TournamentFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly pdfService = inject(TournamentPdfService);
  config: ClassicTournamentConfig | null = null;
  matches: Match[] = [];
  matchesByRound = new Map<number, Match[]>();
  rounds: number[] = [];
  editingMatch: number | null = null;
  editableSets: Record<number, SetScore[]> = {};
  readonly setIndexes = [0, 1, 2];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get("id");
    if (!id) {
      this.router.navigate(["/"]);
      return;
    }

    const record = this.facade.loadTournament(id);
    if (!record || record.config.type !== "classic") {
      this.config = null;
      return;
    }

    this.config = record.config;
    this.matches = record.matches;
    this.groupMatchesByRound();
  }

  backToForm(): void {
    this.router.navigate(["/"]);
  }

  goToHistory(): void {
    this.router.navigate(["/history"]);
  }

  exportPdf(): void {
    if (!this.config) {
      this.notifications.showError("No hay torneo clásico para exportar");
      return;
    }

    try {
      this.pdfService.exportClassicBracket(
        this.config,
        this.matches,
        this.config.name || "cuadro-clasico",
      );
      this.notifications.showSuccess("Descargando PDF del torneo");
    } catch {
      this.notifications.showError("No se pudo preparar el PDF del torneo");
    }
  }

  resolveMatch(matchNumber: number, winner: "pair1" | "pair2"): void {
    try {
      this.facade.updateClassicMatchWinner(matchNumber, winner);
      this.refreshMatches();
      this.notifications.showSuccess("Cuadro actualizado");
    } catch {
      this.notifications.showError("No se pudo actualizar el cuadro");
    }
  }

  revertMatch(matchNumber: number): void {
    try {
      this.facade.clearClassicMatchResult(matchNumber);
      this.cancelMatchEdit(matchNumber);
      this.refreshMatches();
      this.notifications.showSuccess("Resultado revertido");
    } catch {
      this.notifications.showError("No se pudo reabrir el partido");
    }
  }

  startMatchEdit(matchNumber: number): void {
    const match = this.matches.find((entry) => entry.number === matchNumber);
    if (!match) {
      return;
    }

    this.editingMatch = matchNumber;
    this.editableSets[matchNumber] = this.normalizeEditableSets(match.sets);
  }

  cancelMatchEdit(matchNumber: number): void {
    if (this.editingMatch === matchNumber) {
      this.editingMatch = null;
    }
    delete this.editableSets[matchNumber];
  }

  saveMatchEdit(match: Match): void {
    const nextSets = this.normalizeEditableSets(
      this.editableSets[match.number] ?? [],
    );
    const filledSets = nextSets.filter(
      (set) => set.pair1Games > 0 || set.pair2Games > 0,
    );

    if (filledSets.length === 0) {
      this.notifications.showError("Introduce al menos un set con resultado");
      return;
    }

    if (filledSets.some((set) => getSetWinner(set) === null)) {
      this.notifications.showError("Revisa los sets: el marcador no es valido");
      return;
    }

    try {
      this.facade.updateSetScores(match.number, nextSets);
      this.cancelMatchEdit(match.number);
      this.refreshMatches();
      this.notifications.showSuccess("Resultado guardado y cuadro recalculado");
    } catch {
      this.notifications.showError("No se pudo guardar el resultado");
    }
  }

  roundTitle(round: number): string {
    const finalRound = Math.max(...this.rounds);
    if (this.config?.thirdPlaceMatch && round === finalRound) {
      return "3er puesto";
    }
    if (round === finalRound - (this.config?.thirdPlaceMatch ? 1 : 0)) {
      return "Final";
    }
    if (round === finalRound - 1 - (this.config?.thirdPlaceMatch ? 1 : 0)) {
      return "Semifinal";
    }
    return `Ronda ${round}`;
  }

  pairLabel(pair: Match["pair1"]): string {
    if (this.isByePair(pair)) {
      return "BYE";
    }

    if (pair[0].name === pair[1].name) {
      return pair[0].name;
    }

    return `${pair[0].name} & ${pair[1].name}`;
  }

  isByePair(pair: Match["pair1"]): boolean {
    return pair[0].name === "BYE";
  }

  canResolveMatch(match: Match): boolean {
    return this.canAdvancePair(match.pair1) && this.canAdvancePair(match.pair2);
  }

  private groupMatchesByRound(): void {
    this.matchesByRound.clear();
    this.rounds = [];
    this.matches.forEach((match) => {
      if (!this.matchesByRound.has(match.round)) {
        this.matchesByRound.set(match.round, []);
        this.rounds.push(match.round);
      }
      this.matchesByRound.get(match.round)?.push(match);
    });
    this.rounds.sort((left, right) => left - right);
  }

  shouldShowSet(match: Match, setIndex: number): boolean {
    const sets =
      this.editableSets[match.number] ?? this.normalizeEditableSets(match.sets);
    if (setIndex === 0) {
      return true;
    }

    const previousSet = sets[setIndex - 1];
    if (!previousSet || getSetWinner(previousSet) === null) {
      return false;
    }

    if (setIndex === 2) {
      return (
        getMatchWinnerForSets(sets.slice(0, 2)) === null ||
        sets[2].pair1Games > 0 ||
        sets[2].pair2Games > 0
      );
    }

    return true;
  }

  private canAdvancePair(pair: Match["pair1"]): boolean {
    return !this.isByePair(pair) && !this.isPlaceholderPair(pair);
  }

  private isPlaceholderPair(pair: Match["pair1"]): boolean {
    return (
      pair[0].name === pair[1].name &&
      /^(Ganador|Perdedor) P\d+$/.test(pair[0].name)
    );
  }

  private refreshMatches(): void {
    this.matches = this.facade.matches();
    this.groupMatchesByRound();
  }

  private normalizeEditableSets(sets: SetScore[]): SetScore[] {
    const normalized = sets.slice(0, 3).map((set) => ({
      pair1Games: set.pair1Games ?? 0,
      pair2Games: set.pair2Games ?? 0,
    }));

    while (normalized.length < 3) {
      normalized.push({ pair1Games: 0, pair2Games: 0 });
    }

    return normalized;
  }
}

function getMatchWinnerForSets(sets: SetScore[]): "pair1" | "pair2" | null {
  return isMatchComplete(sets) ? getBracketMatchWinner(sets) : null;
}
