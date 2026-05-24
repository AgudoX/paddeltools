import { Injectable, inject, signal } from '@angular/core';
import {
  ClassicTournamentConfig,
  Match,
  SetScore,
  TournamentConfig,
  PlayerStats,
  TournamentRecord,
} from '@shared/models/player.model';
import { TournamentCommandsService } from './commands/tournament-commands.service';
import { TournamentStoreService } from './state/tournament-store.service';

@Injectable({ providedIn: 'root' })
export class TournamentFacade {
  private readonly commands = inject(TournamentCommandsService);
  private readonly store = inject(TournamentStoreService);
  private readonly _loading = signal(false);

  readonly matches = this.store.matches;
  readonly config = this.store.config;
  readonly loading = this._loading.asReadonly();
  readonly history = this.store.history;
  readonly currentTournamentId = this.store.currentTournamentId;

  generateTournament(config: TournamentConfig): string {
    this._loading.set(true);
    try {
      return this.commands.generateTournament(config);
    } finally {
      this._loading.set(false);
    }
  }

  generateClassicTournament(config: ClassicTournamentConfig): string {
    this._loading.set(true);
    try {
      return this.commands.generateClassicTournament(config);
    } finally {
      this._loading.set(false);
    }
  }

  updateScore(matchNumber: number, scorePair1: number, scorePair2: number): void {
    this.commands.updateScore(matchNumber, scorePair1, scorePair2);
  }

  updateSetScores(matchNumber: number, sets: SetScore[]): void {
    this.commands.updateSetScores(matchNumber, sets);
  }

  updateClassicMatchWinner(
    matchNumber: number,
    winner: "pair1" | "pair2",
  ): void {
    this.commands.updateClassicMatchWinner(matchNumber, winner);
  }

  clearClassicMatchResult(matchNumber: number): void {
    this.commands.clearClassicMatchResult(matchNumber);
  }

  calculateStatistics(): PlayerStats[] {
    const config = this.config();
    if (!config) {
      return [];
    }
    if (config.type === 'classic') {
      return [];
    }
    if (config?.mode === 'fixed-pairs') {
      return this.commands.calculatePairStatistics();
    }
    return this.commands.calculateStatistics();
  }

  generateSummary(matches: Match[]): string {
    return this.commands.generateSummary(matches);
  }

  loadTournament(recordId: string): TournamentRecord | null {
    return this.commands.loadTournament(recordId);
  }

  deleteHistoryRecord(recordId: string): void {
    this.commands.deleteHistoryRecord(recordId);
  }

   clearCurrentTournamentId(): void {
    this.commands.clearCurrentTournamentId();
  }

  clearData(): void {
    this.commands.clearData();
  }
}
