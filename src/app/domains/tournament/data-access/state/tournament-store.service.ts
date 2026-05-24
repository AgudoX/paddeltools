import { Injectable, signal } from "@angular/core";
import { Match, TournamentConfig, TournamentRecord } from "@shared/models/player.model";

@Injectable({ providedIn: "root" })
export class TournamentStoreService {
  private readonly _config = signal<TournamentConfig | null>(null);
  private readonly _matches = signal<Match[]>([]);
  private readonly _history = signal<TournamentRecord[]>([]);
  private readonly _currentTournamentId = signal<string | null>(null);

  readonly config = this._config.asReadonly();
  readonly matches = this._matches.asReadonly();
  readonly history = this._history.asReadonly();
  readonly currentTournamentId = this._currentTournamentId.asReadonly();

  setConfig(config: TournamentConfig | null): void {
    this._config.set(config);
  }

  setMatches(matches: Match[]): void {
    this._matches.set(matches);
  }

  setHistory(history: TournamentRecord[]): void {
    this._history.set(history);
  }

  setCurrentTournamentId(id: string | null): void {
    this._currentTournamentId.set(id);
  }

  clearCurrentTournamentId(): void {
    this._currentTournamentId.set(null);
  }

  clearTournamentState(): void {
    this._config.set(null);
    this._matches.set([]);
    this._currentTournamentId.set(null);
  }
}
