import { Component, OnInit, ViewChild, ElementRef, inject, ChangeDetectionStrategy, ChangeDetectorRef, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TournamentFacade } from '@domain/tournament/data-access/tournament.facade';
import { Match, PlayerStats, SetScore } from '@shared/models/player.model';
import { PrimaryButtonComponent } from '@shared/components/primary-button/primary-button.component';
import { SnackbarComponent, SnackbarType } from '@shared/components/snackbar/snackbar.component';
import { isValidPointsInput, getMatchWinner as _getMatchWinner, getSetWinner as _getSetWinner, isSetComplete as _isSetComplete, isMatchComplete as _isMatchComplete } from '@domain/tournament/data-access/tournament.service';

@Component({
  selector: 'app-summary',
  standalone: true,
  imports: [FormsModule, MatIconModule, PrimaryButtonComponent, SnackbarComponent],
  templateUrl: './summary.component.html',
  styleUrl: './summary.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SummaryComponent implements OnInit {
  private readonly facade = inject(TournamentFacade);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  @ViewChild('statisticsSection') statisticsSection?: ElementRef;

  matches: Match[] = [];
  statistics: PlayerStats[] = [];
  showStatistics = false;
  editingMatch: number | null = null;
  matchesByRound: Map<number, Match[]> = new Map();
  rounds: number[] = [];
  originalScores: Map<number, { scorePair1?: number; scorePair2?: number; sets: SetScore[] }> = new Map();
  snackbarMessage = signal('');
  snackbarType = signal<SnackbarType>('success');
  showSnackbar = signal(false);
  private snackbarTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.matches = this.facade.matches();
    if (this.matches.length === 0) {
      this.router.navigate(['/']);
    } else {
      this.groupMatchesByRound();
    }
    this.updateStatistics();
  }

  groupMatchesByRound(): void {
    this.matchesByRound.clear();
    this.rounds = [];
    this.matches.forEach(match => {
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
    navigator.clipboard.writeText(summary).then(() => {
      this.showSnack('Resumen copiado al portapapeles', 'success');
    }).catch(() => {
      this.showSnack('No se pudo copiar al portapapeles', 'error');
    });
  }

  shareWhatsApp(): void {
    const summary = this.facade.generateSummary(this.matches);
    const url = `https://wa.me/?text=${encodeURIComponent(summary)}`;
    window.open(url, '_blank');
  }

  backToForm(): void {
    this.router.navigate(['/']);
  }

  toggleStatistics(): void {
    this.showStatistics = !this.showStatistics;
    if (this.showStatistics) {
      this.updateStatistics();
      setTimeout(() => {
        this.statisticsSection?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }

  editScore(matchNumber: number): void {
    const match = this.matches.find(m => m.number === matchNumber);
    if (!match) return;
    this.originalScores.set(matchNumber, {
      scorePair1: match.scorePair1,
      scorePair2: match.scorePair2,
      sets: match.sets.map(s => ({ ...s }))
    });
    this.editingMatch = matchNumber;
  }

  saveScore(match: Match): void {
    if (match.scoringMode === 'points') {
      const p1 = match.scorePair1 ?? 0;
      const p2 = match.scorePair2 ?? 0;
      if (!isValidPointsInput(p1, p2)) {
        this.showSnack('El marcador debe tener una diferencia mínima de 2 puntos', 'error');
        return;
      }
      this.facade.updateScore(match.number, p1, p2);
    } else {
      const validSets = match.sets.filter(s => s.pair1Games > 0 || s.pair2Games > 0);
      if (validSets.length === 0) {
        this.showSnack('Introduce al menos un set con resultado', 'error');
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

  cancelEdit(): void {
    if (this.editingMatch !== null) {
      const match = this.matches.find(m => m.number === this.editingMatch);
      const original = this.originalScores.get(this.editingMatch);
      if (match && original) {
        match.scorePair1 = original.scorePair1;
        match.scorePair2 = original.scorePair2;
        match.sets = original.sets.map(s => ({ ...s }));
      }
      this.originalScores.delete(this.editingMatch);
    }
    this.editingMatch = null;
  }

  updateStatistics(): void {
    this.statistics = this.facade.calculateStatistics();
  }

  hasWinner(match: Match): boolean {
    if (match.scoringMode === 'sets' && match.sets.length > 0) {
      return _isMatchComplete(match.sets);
    }
    return match.scorePair1 !== undefined &&
           match.scorePair2 !== undefined &&
           match.scorePair1 !== match.scorePair2;
  }

  getWinners(match: Match): string {
    if (match.scoringMode === 'sets') {
      const winner = _getMatchWinner(match.sets);
      if (!winner) return '';
      const pair = winner === 'pair1' ? match.pair1 : match.pair2;
      return `${pair[0].name} & ${pair[1].name}`;
    }
    if (!this.hasWinner(match)) return '';
    if ((match.scorePair1 ?? 0) > (match.scorePair2 ?? 0)) {
      return `${match.pair1[0].name} & ${match.pair1[1].name}`;
    }
    return `${match.pair2[0].name} & ${match.pair2[1].name}`;
  }

  protected readonly isSetComplete = _isSetComplete;

  protected getMatchScoreDisplay(match: Match): string {
    if (match.scoringMode === 'sets') {
      const completed = _isMatchComplete(match.sets);
      if (!completed) return '';
      const winner = _getMatchWinner(match.sets);
      if (!winner) return '';
      let p1Sets = 0, p2Sets = 0;
      for (const s of match.sets) {
        const w = _getSetWinner(s);
        if (w === 'pair1') p1Sets++;
        else if (w === 'pair2') p2Sets++;
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

  private showSnack(message: string, type: SnackbarType): void {
    if (this.snackbarTimer) clearTimeout(this.snackbarTimer);
    this.snackbarMessage.set(message);
    this.snackbarType.set(type);
    this.showSnackbar.set(true);
    this.snackbarTimer = setTimeout(() => {
      this.showSnackbar.set(false);
      this.cdr.markForCheck();
    }, 5000);
    this.cdr.markForCheck();
  }

  protected dismissSnackbar(): void {
    if (this.snackbarTimer) clearTimeout(this.snackbarTimer);
    this.showSnackbar.set(false);
    this.cdr.markForCheck();
  }
}
