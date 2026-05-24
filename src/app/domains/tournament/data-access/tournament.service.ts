import { Injectable, effect, inject } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import {
  ClassicTournamentConfig,
  Match,
  PlayerStats,
  Player,
  ScoringMode,
  SetScore,
  TournamentConfig,
  TournamentRecord,
} from "@shared/models/player.model";
import { TournamentCommandsService } from "./commands/tournament-commands.service";
import { TournamentPersistenceService } from "./infrastructure/tournament-persistence.service";
import { TournamentStoreService } from "./state/tournament-store.service";
import { NotificationService } from "@shared/services/notification.service";
import { generateWithFixedPairs } from "./utils/tournament-generation.utils";

export {
  getMatchWinner,
  getSetWinner,
  isMatchComplete,
  isSetComplete,
  isValidPointsInput,
} from "./utils/tournament-scoring.utils";

@Injectable({
  providedIn: "root",
})
export class TournamentService {
  private readonly store = inject(TournamentStoreService);
  private readonly commands = inject(TournamentCommandsService);
  private readonly persistence = inject(TournamentPersistenceService);
  readonly notificationService = inject(NotificationService);

  readonly configSubject = new BehaviorSubject<TournamentConfig | null>(this.store.config());
  readonly matchesSubject = new BehaviorSubject<Match[]>(this.store.matches());
  readonly historySubject = new BehaviorSubject<TournamentRecord[]>(this.store.history());
  readonly _currentTournamentId = new BehaviorSubject<string | null>(
    this.store.currentTournamentId(),
  );

  readonly currentTournamentId$ = this._currentTournamentId.asObservable();
  readonly config$ = this.configSubject.asObservable();
  readonly matches$ = this.matchesSubject.asObservable();
  readonly history$ = this.historySubject.asObservable();

  constructor() {
    effect(() => this.syncSubjects());
    this.syncSubjects();
  }

  generateTournament(config: TournamentConfig): string {
    const id = this.commands.generateTournament(config);
    this.syncSubjects();
    return id;
  }

  generateClassicTournament(config: ClassicTournamentConfig): string {
    const id = this.commands.generateClassicTournament(config);
    this.syncSubjects();
    return id;
  }

  updateScore(matchNumber: number, scorePair1: number, scorePair2: number): void {
    this.commands.updateScore(matchNumber, scorePair1, scorePair2);
    this.syncSubjects();
  }

  updateSetScores(matchNumber: number, sets: SetScore[]): void {
    this.commands.updateSetScores(matchNumber, sets);
    this.syncSubjects();
  }

  updateClassicMatchWinner(
    matchNumber: number,
    winner: "pair1" | "pair2",
  ): void {
    this.commands.updateClassicMatchWinner(matchNumber, winner);
    this.syncSubjects();
  }

  calculateStatistics(): PlayerStats[] {
    return this.commands.calculateStatistics();
  }

  calculatePairStatistics(): PlayerStats[] {
    return this.commands.calculatePairStatistics();
  }

  generateSummary(matches: Match[]): string {
    return this.commands.generateSummary(matches);
  }

  loadTournament(recordId: string): TournamentRecord | null {
    const record = this.commands.loadTournament(recordId);
    this.syncSubjects();
    return record;
  }

  getHistory(): TournamentRecord[] {
    return this.commands.getHistory();
  }

  loadFromLocalStorage(): void {
    const session = this.persistence.loadSession();
    this.store.setConfig(session.config);
    this.store.setMatches(session.matches);
    this.store.setHistory(session.history);
    this.syncSubjects();
  }

  loadHistory(): TournamentRecord[] {
    return this.persistence.loadHistory();
  }

  migrateMatch(match: Match): Match {
    return this.persistence.migrateMatch(match);
  }

  generateWithFixedPairs(
    players: Player[],
    numberOfRounds: number,
    scoringMode: ScoringMode,
  ): Match[] {
    return generateWithFixedPairs(players, numberOfRounds, scoringMode);
  }

  saveToLocalStorage(config: TournamentConfig, matches: Match[]): void {
    this.persistence.saveSession(config, matches);
  }

  saveHistory(history: TournamentRecord[]): void {
    this.persistence.saveHistory(history);
  }

  deleteHistoryRecord(recordId: string): void {
    this.commands.deleteHistoryRecord(recordId);
    this.syncSubjects();
  }

  clearCurrentTournamentId(): void {
    this.commands.clearCurrentTournamentId();
    this.syncSubjects();
  }

  clearData(): void {
    this.commands.clearData();
    this.syncSubjects();
  }

  private syncSubjects(): void {
    this.configSubject.next(this.store.config());
    this.matchesSubject.next(this.store.matches());
    this.historySubject.next(this.store.history());
    this._currentTournamentId.next(this.store.currentTournamentId());
  }
}
