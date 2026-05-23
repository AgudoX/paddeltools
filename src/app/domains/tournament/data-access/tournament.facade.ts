import { Injectable, inject, signal, DestroyRef } from '@angular/core';
import { TournamentService } from './tournament.service';
import { Match, SetScore, TournamentConfig, PlayerStats, TournamentRecord } from '@shared/models/player.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Injectable({ providedIn: 'root' })
export class TournamentFacade {
  private readonly apiService = inject(TournamentService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _matches = signal<Match[]>([]);
  private readonly _config = signal<TournamentConfig | null>(null);
  private readonly _loading = signal(false);
  private readonly _history = signal<TournamentRecord[]>([]);

  readonly matches = this._matches.asReadonly();
  readonly config = this._config.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly history = this._history.asReadonly();

  constructor() {
    this.apiService.matches$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(m => this._matches.set(m));

    this.apiService.config$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(c => this._config.set(c));

    this.apiService.history$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(h => this._history.set(h));
  }

  generateTournament(config: TournamentConfig): void {
    this._loading.set(true);
    try {
      this.apiService.generateTournament(config);
    } finally {
      this._loading.set(false);
    }
  }

  updateScore(matchNumber: number, scorePair1: number, scorePair2: number): void {
    this.apiService.updateScore(matchNumber, scorePair1, scorePair2);
  }

  updateSetScores(matchNumber: number, sets: SetScore[]): void {
    this.apiService.updateSetScores(matchNumber, sets);
  }

  calculateStatistics(): PlayerStats[] {
    return this.apiService.calculateStatistics();
  }

  generateSummary(matches: Match[]): string {
    return this.apiService.generateSummary(matches);
  }

  loadTournament(recordId: string): TournamentRecord | null {
    return this.apiService.loadTournament(recordId);
  }

  deleteHistoryRecord(recordId: string): void {
    this.apiService.deleteHistoryRecord(recordId);
  }

  clearData(): void {
    this.apiService.clearData();
  }
}
