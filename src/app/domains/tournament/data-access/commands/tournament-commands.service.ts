import { Injectable, inject } from "@angular/core";
import {
  ClassicTournamentConfig,
  Match,
  MatchSlotSource,
  Player,
  PlayerStats,
  ScoringMode,
  SetScore,
  TournamentConfig,
  TournamentRecord,
} from "@shared/models/player.model";
import { TournamentStoreService } from "../state/tournament-store.service";
import { TournamentPersistenceService } from "../infrastructure/tournament-persistence.service";
import { generateFreeMode, generateWithFixedPairs } from "../utils/tournament-generation.utils";
import { generateClassicBracket } from "../utils/classic-tournament-generation.utils";
import { calculatePairStatistics, calculateStatistics } from "../utils/tournament-statistics.utils";
import { generateSummary } from "../utils/tournament-summary.utils";
import { getSetWinner } from "../utils/tournament-scoring.utils";

@Injectable({ providedIn: "root" })
export class TournamentCommandsService {
  private readonly store = inject(TournamentStoreService);
  private readonly persistence = inject(TournamentPersistenceService);

  constructor() {
    const session = this.persistence.loadSession();
    this.store.setConfig(session.config);
    this.store.setMatches(session.matches);
    this.store.setHistory(session.history);
  }

  generateTournament(config: TournamentConfig): string {
    if (config.type === "classic") {
      throw new Error("Usa generateClassicTournament para torneos clásicos");
    }
    const { players, numberOfRounds, mode } = config;
    if (players.length < 8 || players.length % 4 !== 0) {
      throw new Error("El número de jugadores debe ser múltiplo de 4 y mínimo 8");
    }
    if (numberOfRounds < 1) {
      throw new Error("Debe haber al menos 1 ronda");
    }

    const scoringMode: ScoringMode = config.scoringMode ?? "points";
    const matches =
      mode === "fixed-pairs"
        ? generateWithFixedPairs(players, numberOfRounds, scoringMode)
        : generateFreeMode(players, numberOfRounds, scoringMode);

    this.store.setConfig(config);
    this.store.setMatches(matches);
    this.persistence.saveSession(config, matches);
    return this.addToHistory(config, matches);
  }

  generateClassicTournament(config: ClassicTournamentConfig): string {
    if (config.pairs.length < 2) {
      throw new Error("Debe haber al menos 2 parejas para crear el torneo");
    }

    const matches = generateClassicBracket(config.pairs, {
      seeded: config.seeded,
      thirdPlaceMatch: config.thirdPlaceMatch,
      scoringMode: "sets",
    });

    this.store.setConfig(config);
    this.store.setMatches(matches);
    this.persistence.saveSession(config, matches);
    return this.addToHistory(config, matches);
  }

  updateScore(matchNumber: number, scorePair1: number, scorePair2: number): void {
    const matches = this.store.matches().map((match) => {
      if (match.number !== matchNumber) return match;
      return {
        ...match,
        scorePair1,
        scorePair2,
        completed: true,
        winner: scorePair1 > scorePair2 ? ("pair1" as const) : ("pair2" as const),
      } satisfies Match;
    });

    this.store.setMatches(matches);
    const config = this.store.config();
    if (config) {
      this.persistence.saveSession(config, matches);
      this.updateHistoryMatches(matches);
    }
  }

  updateSetScores(matchNumber: number, sets: SetScore[]): void {
    const matches = this.store.matches().map((match) => {
      if (match.number !== matchNumber) return match;

      let pair1Sets = 0;
      let pair2Sets = 0;
      sets.forEach((set) => {
        const winner = getSetWinner(set);
        if (winner === "pair1") pair1Sets++;
        if (winner === "pair2") pair2Sets++;
      });

      return {
        ...match,
        sets,
        completed: pair1Sets >= 2 || pair2Sets >= 2,
        winner:
          pair1Sets >= 2 || pair2Sets >= 2
            ? pair1Sets > pair2Sets
              ? ("pair1" as const)
              : ("pair2" as const)
            : undefined,
      } satisfies Match;
    });

    this.store.setMatches(matches);
    const config = this.store.config();
    if (config) {
      this.persistence.saveSession(config, matches);
      this.updateHistoryMatches(matches);
    }
  }

  updateClassicMatchWinner(
    matchNumber: number,
    winner: "pair1" | "pair2",
  ): void {
    this.updateClassicMatchState(matchNumber, {
      completed: true,
      winner,
      sets: [],
      scorePair1: undefined,
      scorePair2: undefined,
    });
  }

  clearClassicMatchResult(matchNumber: number): void {
    this.updateClassicMatchState(matchNumber, {
      completed: false,
      winner: undefined,
      sets: [],
      scorePair1: undefined,
      scorePair2: undefined,
    });
  }

  private updateClassicMatchState(
    matchNumber: number,
    nextState: Pick<
      Match,
      "completed" | "winner" | "sets" | "scorePair1" | "scorePair2"
    >,
  ): void {
    const config = this.store.config();
    if (config?.type !== "classic") {
      throw new Error("Solo se pueden resolver partidos en torneos clásicos");
    }

    const updatedMatches = this.store.matches().map((match) =>
      match.number === matchNumber
        ? {
            ...match,
            ...nextState,
          }
        : { ...match },
    );

    const propagatedMatches = this.rebuildClassicDependencies(updatedMatches);
    this.store.setMatches(propagatedMatches);
    this.persistence.saveSession(config, propagatedMatches);
    this.updateHistoryMatches(propagatedMatches);
  }

  calculateStatistics(): PlayerStats[] {
    if (this.store.config()?.type === "classic") {
      return [];
    }
    return calculateStatistics(this.store.config(), this.store.matches());
  }

  calculatePairStatistics(): PlayerStats[] {
    if (this.store.config()?.type === "classic") {
      return [];
    }
    return calculatePairStatistics(this.store.config(), this.store.matches());
  }

  generateSummary(matches: Match[]): string {
    return generateSummary(matches);
  }

  loadTournament(recordId: string): TournamentRecord | null {
    const history = this.persistence.loadHistory();
    this.store.setHistory(history);
    const record = history.find((item) => item.id === recordId) ?? null;

    if (record) {
      this.store.setCurrentTournamentId(record.id);
      this.store.setConfig(record.config);
      this.store.setMatches(record.matches);
      this.persistence.saveSession(record.config, record.matches);
    }

    return record;
  }

  getHistory(): TournamentRecord[] {
    return this.persistence.loadHistory();
  }

  deleteHistoryRecord(recordId: string): void {
    const history = this.persistence
      .loadHistory()
      .filter((record) => record.id !== recordId);
    this.persistence.saveHistory(history);
    this.store.setHistory(history);
  }

  clearCurrentTournamentId(): void {
    this.store.clearCurrentTournamentId();
  }

  clearData(): void {
    this.persistence.clearSession();
    this.store.clearTournamentState();
  }

  private addToHistory(config: TournamentConfig, matches: Match[]): string {
    const history = this.persistence.loadHistory();
    const now = new Date();

    let label = config.name?.trim();
    if (!label) {
      const dateStr = now.toLocaleDateString();
      const timeStr = now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      label =
        config.type === "classic"
          ? `Torneo ${config.players.length / 2} parejas · ${dateStr} ${timeStr}`
          : `Americano ${config.players.length} jugs · ${dateStr} ${timeStr}`;
    }

    const record: TournamentRecord = {
      id: crypto.randomUUID?.() ?? Date.now().toString(36),
      createdAt: now.toISOString(),
      label,
      config,
      matches,
    };

    this.store.setCurrentTournamentId(record.id);
    history.unshift(record);
    if (history.length > 20) history.pop();
    this.persistence.saveHistory(history);
    this.store.setHistory(history);

    return record.id;
  }

  private updateHistoryMatches(matches: Match[]): void {
    const currentId = this.store.currentTournamentId();
    if (!currentId) return;

    const history = this.persistence.loadHistory();
    const index = history.findIndex((record) => record.id === currentId);
    if (index === -1) return;

    history[index] = {
      ...history[index],
      matches: matches.map((match) => ({ ...match })),
    };

    this.persistence.saveHistory(history);
    this.store.setHistory(history);
  }

  private rebuildClassicDependencies(matches: Match[]): Match[] {
    const matchMap = new Map<number, Match>(
      matches
        .map((match) => ({ ...match }))
        .sort((left, right) => left.round - right.round || left.number - right.number)
        .map((match) => [match.number, match]),
    );

    for (const match of matchMap.values()) {
      const previousPair1 = this.clonePair(match.pair1);
      const previousPair2 = this.clonePair(match.pair2);

      if (match.pair1Source) {
        match.pair1 = this.resolveClassicSource(matchMap, match.pair1Source);
      }
      if (match.pair2Source) {
        match.pair2 = this.resolveClassicSource(matchMap, match.pair2Source);
      }

      if (
        match.pair1Source ||
        match.pair2Source
      ) {
        const pairChanged =
          !this.arePairsEqual(previousPair1, match.pair1) ||
          !this.arePairsEqual(previousPair2, match.pair2);
        const hasUnresolvedSource =
          (match.pair1Source && this.isPlaceholderPair(match.pair1)) ||
          (match.pair2Source && this.isPlaceholderPair(match.pair2));

        if (hasUnresolvedSource || pairChanged) {
          match.completed = false;
          match.winner = undefined;
          match.sets = [];
          match.scorePair1 = undefined;
          match.scorePair2 = undefined;
        }
      }
    }

    return Array.from(matchMap.values()).sort(
      (left, right) => left.round - right.round || left.number - right.number,
    );
  }

  private resolveClassicSource(
    matchMap: Map<number, Match>,
    source: MatchSlotSource,
  ): [Player, Player] {
    const sourceMatch = matchMap.get(source.matchNumber);
    if (!sourceMatch || !sourceMatch.completed || !sourceMatch.winner) {
      return this.createDependencyPlaceholder(source);
    }

    if (source.kind === "winner") {
      return this.clonePair(
        sourceMatch.winner === "pair1" ? sourceMatch.pair1 : sourceMatch.pair2,
      );
    }

    return this.clonePair(
      sourceMatch.winner === "pair1" ? sourceMatch.pair2 : sourceMatch.pair1,
    );
  }

  private createDependencyPlaceholder(
    source: MatchSlotSource,
  ): [Player, Player] {
    const label = `${
      source.kind === "winner" ? "Ganador" : "Perdedor"
    } P${source.matchNumber}`;

    return [
      {
        id: -30000 - source.matchNumber,
        name: label,
        position: "either",
        pairId: -30000 - source.matchNumber,
      },
      {
        id: -40000 - source.matchNumber,
        name: label,
        position: "either",
        pairId: -30000 - source.matchNumber,
      },
    ];
  }

  private clonePair(pair: [Player, Player]): [Player, Player] {
    return [{ ...pair[0] }, { ...pair[1] }];
  }

  private arePairsEqual(
    left: [Player, Player],
    right: [Player, Player],
  ): boolean {
    return (
      left[0].id === right[0].id &&
      left[0].name === right[0].name &&
      left[1].id === right[1].id &&
      left[1].name === right[1].name
    );
  }

  private isPlaceholderPair(pair: [Player, Player]): boolean {
    return pair[0].name === pair[1].name && /^Ganador P|^Perdedor P/.test(pair[0].name);
  }
}
