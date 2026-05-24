import {
  Component,
  OnInit,
  ElementRef,
  inject,
  ChangeDetectionStrategy,
  viewChild,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router, ActivatedRoute } from "@angular/router";
import { MatIconModule } from "@angular/material/icon";
import { TournamentFacade } from "@domain/tournament/data-access/tournament.facade";
import { Match, PlayerStats, SetScore } from "@shared/models/player.model";
import { PrimaryButtonComponent } from "@shared/components/primary-button/primary-button.component";
import { FloatingButtonComponent } from "@shared/components/floating-button/floating-button.component";
import {
  isValidPointsInput,
  getMatchWinner as _getMatchWinner,
  getSetWinner as _getSetWinner,
  isSetComplete as _isSetComplete,
  isMatchComplete as _isMatchComplete,
} from "@domain/tournament/data-access/utils/tournament-scoring.utils";
import { NotificationService } from "@shared/services/notification.service";

@Component({
  selector: "app-summary-page",
  standalone: true,
  imports: [
    FormsModule,
    MatIconModule,
    PrimaryButtonComponent,
    FloatingButtonComponent,
  ],
  templateUrl: "./summary-page.component.html",
  styleUrl: "./summary-page.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SummaryPageComponent implements OnInit {
  private readonly facade = inject(TournamentFacade);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly notifications = inject(NotificationService);
  protected readonly statisticsSection = viewChild<ElementRef<HTMLElement>>(
    "statisticsSection",
  );

  matches: Match[] = [];
  statistics: PlayerStats[] = [];
  showStatistics = false;
  showMobileMenu = false;
  editingMatch: number | null = null;
  matchesByRound: Map<number, Match[]> = new Map();
  rounds: number[] = [];
  originalScores: Map<
    number,
    { scorePair1?: number; scorePair2?: number; sets: SetScore[] }
  > = new Map();
  ngOnInit(): void {
    const tournamentId = this.route.snapshot.paramMap.get("id");
    if (tournamentId) {
      this.facade.loadTournament(tournamentId);
    }

    this.matches = this.facade.matches();
    if (this.matches.length === 0) {
      this.router.navigate(["/"]);
      return;
    }

    this.groupMatchesByRound();
    this.updateStatistics();
  }

  groupMatchesByRound(): void {
    this.matchesByRound.clear();
    this.rounds = [];
    this.matches.forEach((match) => {
      if (!this.matchesByRound.has(match.round)) {
        this.matchesByRound.set(match.round, []);
        this.rounds.push(match.round);
      }
      this.matchesByRound.get(match.round)?.push(match);
    });
    this.rounds.sort((a, b) => a - b);
  }

  copySummary(): void {
    const summary = this.facade.generateSummary(this.matches);
    navigator.clipboard
      .writeText(summary)
      .then(() => {
        this.notifications.showSuccess("Resumen copiado al portapapeles");
      })
      .catch(() => {
        this.notifications.showError("No se pudo copiar al portapapeles");
      });
  }

  shareWhatsApp(): void {
    const summary = this.facade.generateSummary(this.matches);
    const url = `https://wa.me/?text=${encodeURIComponent(summary)}`;
    this.notifications.showSuccess("Abriendo resumen en WhatsApp");
    window.open(url, "_blank");
  }

  backToForm(): void {
    this.notifications.showSuccess("Volviendo a configuración");
    this.showMobileMenu = false;
    this.router.navigate(["/"]);
  }

  toggleStatistics(): void {
    const newValue = !this.showStatistics;
    this.showStatistics = newValue;
    this.showMobileMenu = false;
    this.notifications.showSuccess(
      newValue ? "Mostrando clasificación" : "Ocultando clasificación",
    );
    if (newValue) {
      this.updateStatistics();
      setTimeout(() => {
        this.statisticsSection()?.nativeElement.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    }
  }

  editScore(matchNumber: number): void {
    const match = this.matches.find((m) => m.number === matchNumber);
    if (!match) return;
    this.originalScores.set(matchNumber, {
      scorePair1: match.scorePair1,
      scorePair2: match.scorePair2,
      sets: match.sets.map((s) => ({ ...s })),
    });
    while (match.sets.length < 3) {
      match.sets.push({ pair1Games: 0, pair2Games: 0 });
    }
    this.editingMatch = matchNumber;
  }

  saveScore(match: Match): void {
    if (match.scoringMode === "points") {
      const p1 = match.scorePair1 ?? 0;
      const p2 = match.scorePair2 ?? 0;
      if (!isValidPointsInput(p1, p2)) {
        this.notifications.showError(
          "El marcador debe tener una diferencia mínima de 2 puntos",
        );
        return;
      }
      this.facade.updateScore(match.number, p1, p2);
    } else {
      const validSets = match.sets.filter(
        (s) => s.pair1Games > 0 || s.pair2Games > 0,
      );
      if (validSets.length === 0) {
        this.notifications.showError("Introduce al menos un set con resultado");
        return;
      }
      this.facade.updateSetScores(match.number, match.sets);
    }

    if (this.editingMatch !== null) {
      this.originalScores.delete(this.editingMatch);
    }
    this.editingMatch = null;
    this.updateStatistics();
  }

  clearEdit(): void {
    if (this.editingMatch !== null) {
      const match = this.matches.find((m) => m.number === this.editingMatch);
      const original = this.originalScores.get(this.editingMatch);
      if (match && original) {
        match.scorePair1 = original.scorePair1;
        match.scorePair2 = original.scorePair2;
        match.sets = original.sets.map((s) => ({ ...s }));
      }
      this.originalScores.delete(this.editingMatch);
    }
    this.editingMatch = null;
  }

  updateStatistics(): void {
    this.statistics = this.facade.calculateStatistics();
  }

  goToHistory(): void {
    this.notifications.showSuccess("Abriendo historial");
    this.showMobileMenu = false;
    this.router.navigate(["/history"]);
  }

  copyRanking(): void {
    const text = this.buildRankingText();
    navigator.clipboard
      .writeText(text)
      .then(() => {
        this.notifications.showSuccess("Ranking copiado al portapapeles");
      })
      .catch(() => {
        this.notifications.showError("No se pudo copiar el ranking");
      });
  }

  shareRankingWhatsApp(): void {
    const text = this.buildRankingText();
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    this.notifications.showSuccess("Abriendo ranking en WhatsApp");
    window.open(url, "_blank");
  }

  toggleMobileMenu(): void {
    this.showMobileMenu = !this.showMobileMenu;
  }

  private buildRankingText(): string {
    let text = "🏆 CLASIFICACIÓN\n\n";
    this.statistics.forEach((s, i) => {
      const pos = i + 1;
      text += `${pos}. ${s.player.name} — ${s.matchesWon}G / ${s.matchesPlayed}PJ | Sets: ${s.setsWon}-${s.setsLost} | PF: ${s.pointsFor} PC: ${s.pointsAgainst} (${s.difference > 0 ? "+" : ""}${s.difference})\n`;
    });
    return text;
  }

  hasWinner(match: Match): boolean {
    if (match.scoringMode === "sets" && match.sets.length > 0) {
      return _isMatchComplete(match.sets);
    }
    return (
      match.scorePair1 !== undefined &&
      match.scorePair2 !== undefined &&
      match.scorePair1 !== match.scorePair2
    );
  }

  matchWinner(match: Match): "pair1" | "pair2" | null {
    if (match.scoringMode === "sets") {
      return _getMatchWinner(match.sets);
    }
    if (!this.hasWinner(match)) return null;
    return (match.scorePair1 ?? 0) > (match.scorePair2 ?? 0)
      ? "pair1"
      : "pair2";
  }

  getWinners(match: Match): string {
    if (match.scoringMode === "sets") {
      const winner = _getMatchWinner(match.sets);
      if (!winner) return "";
      const pair = winner === "pair1" ? match.pair1 : match.pair2;
      return `${pair[0].name} & ${pair[1].name}`;
    }
    if (!this.hasWinner(match)) return "";
    if ((match.scorePair1 ?? 0) > (match.scorePair2 ?? 0)) {
      return `${match.pair1[0].name} & ${match.pair1[1].name}`;
    }
    return `${match.pair2[0].name} & ${match.pair2[1].name}`;
  }

  protected readonly isSetComplete = _isSetComplete;
  protected readonly getSetWinner = _getSetWinner;

  protected shouldShowSet(match: Match, setIdx: number): boolean {
    if (setIdx === 0) return true;
    const prev = match.sets[setIdx - 1];
    if (!prev) return false;
    if (_isSetComplete(prev)) {
      if (setIdx === 2) {
        const w1 = _getSetWinner(match.sets[0]);
        const w2 = _getSetWinner(match.sets[1]);
        if (w1 && w2 && w1 !== w2) return true;
        const cur = match.sets[2];
        return cur ? cur.pair1Games > 0 || cur.pair2Games > 0 : false;
      }
      return true;
    }
    const cur = match.sets[setIdx];
    return cur ? cur.pair1Games > 0 || cur.pair2Games > 0 : false;
  }

  protected getMatchScoreDisplay(match: Match): string {
    if (match.scoringMode === "sets") {
      const completed = _isMatchComplete(match.sets);
      if (!completed) return "";
      const winner = _getMatchWinner(match.sets);
      if (!winner) return "";
      let p1Sets = 0,
        p2Sets = 0;
      for (const s of match.sets) {
        const w = _getSetWinner(s);
        if (w === "pair1") p1Sets++;
        else if (w === "pair2") p2Sets++;
      }
      return `${p1Sets}-${p2Sets}`;
    }
    return `${match.scorePair1}-${match.scorePair2}`;
  }

  trackMatch(_idx: number, m: Match): number {
    return m.number;
  }

  trackRound(r: number): number {
    return r;
  }

  trackSet(_idx: number): number {
    return _idx;
  }

  clearOnZero(match: Match, field: string, setIndex?: number): void {
    if (setIndex !== undefined) {
      const set = match.sets[setIndex] as unknown as Record<string, number | null>;
      if (set[field] === 0) set[field] = null;
    } else {
      const m = match as unknown as Record<string, number | null | undefined>;
      if (m[field] === 0) m[field] = null;
    }
  }

}
