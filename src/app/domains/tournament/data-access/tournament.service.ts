import { Injectable, inject } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";
import {
  Player,
  Match,
  SetScore,
  TournamentConfig,
  PlayerStats,
  TournamentRecord,
  ScoringMode,
} from "@shared/models/player.model";
import { NotificationService } from "@shared/services/notification.service";

/* ─── Scoring utilities (pure functions) ─── */

export function getSetWinner(set: SetScore): "pair1" | "pair2" | null {
  const { pair1Games: p1, pair2Games: p2 } = set;
  if (p1 < 0 || p2 < 0) return null;
  const max = Math.max(p1, p2);
  const min = Math.min(p1, p2);
  const diff = max - min;
  if (max < 6) return null;
  if (diff >= 2) return p1 > p2 ? "pair1" : "pair2";
  if (max >= 7 && diff === 1) return p1 > p2 ? "pair1" : "pair2";
  return null;
}

export function getMatchWinner(sets: SetScore[]): "pair1" | "pair2" | null {
  let p1 = 0,
    p2 = 0;
  for (const s of sets) {
    const w = getSetWinner(s);
    if (w === "pair1") p1++;
    else if (w === "pair2") p2++;
  }
  if (p1 >= 2) return "pair1";
  if (p2 >= 2) return "pair2";
  return null;
}

export function isSetComplete(set: SetScore): boolean {
  return getSetWinner(set) !== null;
}

export function isMatchComplete(sets: SetScore[]): boolean {
  return getMatchWinner(sets) !== null;
}

export function isValidPointsInput(p1: number, p2: number): boolean {
  if (p1 < 0 || p2 < 0) return false;
  return Math.abs(p1 - p2) >= 2;
}

@Injectable({
  providedIn: "root",
})
export class TournamentService {
  private readonly STORAGE_KEY = "paddletools_config";
  private readonly MATCHES_KEY = "paddletools_matches";
  private readonly HISTORY_KEY = "paddletools_history";

  private configSubject = new BehaviorSubject<TournamentConfig | null>(null);
  private matchesSubject = new BehaviorSubject<Match[]>([]);
  private historySubject = new BehaviorSubject<TournamentRecord[]>([]);
  private readonly _currentTournamentId = new BehaviorSubject<string | null>(
    null,
  );

  currentTournamentId$: Observable<string | null> =
    this._currentTournamentId.asObservable();

  config$: Observable<TournamentConfig | null> =
    this.configSubject.asObservable();
  matches$: Observable<Match[]> = this.matchesSubject.asObservable();
  history$: Observable<TournamentRecord[]> = this.historySubject.asObservable();

  private readonly notificationService = inject(NotificationService);

  constructor() {
    this.loadFromLocalStorage();
  }

  generateTournament(config: TournamentConfig): string {
    const { players, numberOfRounds, mode } = config;

    if (players.length < 8 || players.length % 4 !== 0) {
      throw new Error(
        "El número de jugadores debe ser múltiplo de 4 y mínimo 8",
      );
    }

    if (numberOfRounds < 1) {
      throw new Error("Debe haber al menos 1 ronda");
    }

    const scoringMode: ScoringMode = config.scoringMode ?? "points";
    const matches: Match[] =
      mode === "fixed-pairs"
        ? this.generateWithFixedPairs(players, numberOfRounds, scoringMode)
        : this.generateFreeMode(players, numberOfRounds, scoringMode);

    this.configSubject.next(config);
    this.matchesSubject.next(matches);
    this.saveToLocalStorage(config, matches);
    return this.addToHistory(config, matches);
  }

  private generateFreeMode(
    players: Player[],
    numberOfRounds: number,
    scoringMode: ScoringMode,
  ): Match[] {
    const matches: Match[] = [];
    const previousPartnerships = new Map<string, Set<number>>();
    const previousOpponents = new Map<string, Set<number>>();

    players.forEach((p) => {
      previousPartnerships.set(p.id.toString(), new Set<number>());
      previousOpponents.set(p.id.toString(), new Set<number>());
    });

    const matchCount = new Map<number, number>();
    players.forEach((p) => matchCount.set(p.id, 0));

    const matchesPerRound = players.length / 4;
    let globalMatchNumber = 1;

    for (let round = 0; round < numberOfRounds; round++) {
      const availablePlayers = [...players];
      const roundMatches: Match[] = [];

      for (
        let matchInRound = 0;
        matchInRound < matchesPerRound;
        matchInRound++
      ) {
        const matchPlayers = this.selectBestFourPlayers(
          availablePlayers,
          matchCount,
          previousOpponents,
        );

        matchPlayers.forEach((mp) => {
          const index = availablePlayers.findIndex((p) => p.id === mp.id);
          if (index > -1) {
            availablePlayers.splice(index, 1);
          }
        });

        let bestCombination = this.findBestPairCombination(
          matchPlayers,
          previousPartnerships,
          previousOpponents,
        );

        const [p1, p2, p3, p4] = bestCombination;

        previousPartnerships.get(p1.id.toString())?.add(p2.id);
        previousPartnerships.get(p2.id.toString())?.add(p1.id);
        previousPartnerships.get(p3.id.toString())?.add(p4.id);
        previousPartnerships.get(p4.id.toString())?.add(p3.id);

        previousOpponents.get(p1.id.toString())?.add(p3.id);
        previousOpponents.get(p1.id.toString())?.add(p4.id);
        previousOpponents.get(p2.id.toString())?.add(p3.id);
        previousOpponents.get(p2.id.toString())?.add(p4.id);

        previousOpponents.get(p3.id.toString())?.add(p1.id);
        previousOpponents.get(p3.id.toString())?.add(p2.id);
        previousOpponents.get(p4.id.toString())?.add(p1.id);
        previousOpponents.get(p4.id.toString())?.add(p2.id);

        matchPlayers.forEach((p) => {
          matchCount.set(p.id, (matchCount.get(p.id) || 0) + 1);
        });

        roundMatches.push({
          number: globalMatchNumber++,
          round: round + 1,
          pair1: [p1, p2],
          pair2: [p3, p4],
          scoringMode,
          sets: [],
        });
      }

      matches.push(...roundMatches);
    }

    return matches;
  }

  private selectBestFourPlayers(
    availablePlayers: Player[],
    matchCount: Map<number, number>,
    previousOpponents: Map<string, Set<number>>,
  ): Player[] {
    const sortedByMatches = [...availablePlayers].sort((a, b) => {
      const countA = matchCount.get(a.id) || 0;
      const countB = matchCount.get(b.id) || 0;
      return countA - countB;
    });

    if (sortedByMatches.length <= 4) {
      return sortedByMatches;
    }

    const candidates = sortedByMatches.slice(
      0,
      Math.min(8, sortedByMatches.length),
    );

    let bestGroup: Player[] = candidates.slice(0, 4);
    let bestScore = this.evaluateGroupScore(
      bestGroup,
      matchCount,
      previousOpponents,
    );

    if (candidates.length >= 4) {
      for (let i = 0; i < candidates.length - 3; i++) {
        for (let j = i + 1; j < candidates.length - 2; j++) {
          for (let k = j + 1; k < candidates.length - 1; k++) {
            for (let l = k + 1; l < candidates.length; l++) {
              const group = [
                candidates[i],
                candidates[j],
                candidates[k],
                candidates[l],
              ];
              const score = this.evaluateGroupScore(
                group,
                matchCount,
                previousOpponents,
              );

              if (score < bestScore) {
                bestScore = score;
                bestGroup = group;
              }
            }
          }
        }
      }
    }

    return bestGroup;
  }

  private evaluateGroupScore(
    players: Player[],
    matchCount: Map<number, number>,
    previousOpponents: Map<string, Set<number>>,
  ): number {
    let score = 0;

    score += this.evaluatePositionBalance(players);

    const matchCounts = players.map((p) => matchCount.get(p.id) || 0);
    const variance = Math.max(...matchCounts) - Math.min(...matchCounts);
    score += variance * 5;

    let opponentRepetitions = 0;
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        const p1 = players[i];
        const p2 = players[j];
        if (previousOpponents.get(p1.id.toString())?.has(p2.id)) {
          opponentRepetitions++;
        }
      }
    }
    score += opponentRepetitions * 100;

    return score;
  }

  private evaluatePositionBalance(players: Player[]): number {
    let score = 0;
    const positions = players.map((p) => p.position);

    const rightCount = positions.filter((p) => p === "right").length;
    const backhandCount = positions.filter((p) => p === "backhand").length;
    const eitherCount = positions.filter((p) => p === "either").length;

    if (rightCount === 4 || backhandCount === 4) {
      score += 100;
    } else if (rightCount === 3 || backhandCount === 3) {
      score += 50;
    } else if (rightCount === 2 && backhandCount === 2) {
      score += 0;
    } else if (eitherCount >= 2) {
      score += 5;
    } else {
      score += 20;
    }

    return score;
  }

  private findBestPairCombination(
    players: Player[],
    previousPartnerships: Map<string, Set<number>>,
    previousOpponents: Map<string, Set<number>>,
  ): Player[] {
    const combinations = [
      [players[0], players[1], players[2], players[3]],
      [players[0], players[2], players[1], players[3]],
      [players[0], players[3], players[1], players[2]],
    ];

    let bestCombination = combinations[0];
    let lowestScore = Number.MAX_SAFE_INTEGER;

    for (const combo of combinations) {
      let score = 0;

      if (previousPartnerships.get(combo[0].id.toString())?.has(combo[1].id)) {
        score += 10000;
      }

      if (previousPartnerships.get(combo[2].id.toString())?.has(combo[3].id)) {
        score += 10000;
      }

      let opponentRepetitions = 0;

      if (previousOpponents.get(combo[0].id.toString())?.has(combo[2].id))
        opponentRepetitions++;
      if (previousOpponents.get(combo[0].id.toString())?.has(combo[3].id))
        opponentRepetitions++;
      if (previousOpponents.get(combo[1].id.toString())?.has(combo[2].id))
        opponentRepetitions++;
      if (previousOpponents.get(combo[1].id.toString())?.has(combo[3].id))
        opponentRepetitions++;

      score += opponentRepetitions * 1000;

      const pair1Score = this.evaluatePairPositions(combo[0], combo[1]);
      score += pair1Score;

      const pair2Score = this.evaluatePairPositions(combo[2], combo[3]);
      score += pair2Score;

      if (score < lowestScore) {
        lowestScore = score;
        bestCombination = combo;
      }
    }

    return bestCombination;
  }

  private evaluatePairPositions(player1: Player, player2: Player): number {
    const pos1 = player1.position;
    const pos2 = player2.position;

    if (
      (pos1 === "right" && pos2 === "backhand") ||
      (pos1 === "backhand" && pos2 === "right")
    ) {
      return 0;
    }

    if (pos1 === "either" && pos2 === "either") {
      return 3;
    }

    if (pos1 === "either" || pos2 === "either") {
      return 5;
    }

    if (pos1 === pos2) {
      return 100;
    }

    return 10;
  }

  private generateWithFixedPairs(
    players: Player[],
    numberOfRounds: number,
    scoringMode: ScoringMode,
  ): Match[] {
    const matches: Match[] = [];

    const fixedPairs = new Map<number, Player[]>();
    const freePlayers: Player[] = [];

    players.forEach((p) => {
      if (p.pairId !== undefined && p.pairId !== null) {
        if (!fixedPairs.has(p.pairId)) {
          fixedPairs.set(p.pairId, []);
        }
        fixedPairs.get(p.pairId)?.push(p);
      } else {
        freePlayers.push(p);
      }
    });

    const pairs: [Player, Player][] = [];
    fixedPairs.forEach((pairPlayers) => {
      if (pairPlayers.length === 2) {
        pairs.push([pairPlayers[0], pairPlayers[1]]);
      }
    });

    for (let i = 0; i < freePlayers.length; i += 2) {
      if (i + 1 < freePlayers.length) {
        pairs.push([freePlayers[i], freePlayers[i + 1]]);
      }
    }

    if (pairs.length < 2) {
      throw new Error("No hay suficientes parejas para generar partidos");
    }

    const matchesPerRound = pairs.length / 2;

    if (pairs.length % 2 !== 0) {
      throw new Error(
        "El número de parejas debe ser par para generar rondas completas",
      );
    }

    const previousMatchups = new Map<string, Set<string>>();
    pairs.forEach((_, idx) => {
      previousMatchups.set(idx.toString(), new Set<string>());
    });

    let globalMatchNumber = 1;

    for (let round = 0; round < numberOfRounds; round++) {
      const availablePairs = [...Array(pairs.length).keys()];

      for (
        let matchInRound = 0;
        matchInRound < matchesPerRound;
        matchInRound++
      ) {
        let pair1Idx = -1;
        let pair2Idx = -1;
        let fewestMatchups = Number.MAX_SAFE_INTEGER;

        for (let i = 0; i < availablePairs.length; i++) {
          for (let j = i + 1; j < availablePairs.length; j++) {
            const p1 = availablePairs[i];
            const p2 = availablePairs[j];

            if (!previousMatchups.get(p1.toString())?.has(p2.toString())) {
              const matchups1 = previousMatchups.get(p1.toString())?.size || 0;
              const matchups2 = previousMatchups.get(p2.toString())?.size || 0;
              const total = matchups1 + matchups2;

              if (total < fewestMatchups) {
                fewestMatchups = total;
                pair1Idx = p1;
                pair2Idx = p2;
              }
            }
          }
        }

        if (pair1Idx === -1 && availablePairs.length >= 2) {
          pair1Idx = availablePairs[0];
          pair2Idx = availablePairs[1];
        }

        if (pair1Idx === -1 || pair2Idx === -1) {
          break;
        }

        previousMatchups.get(pair1Idx.toString())?.add(pair2Idx.toString());
        previousMatchups.get(pair2Idx.toString())?.add(pair1Idx.toString());

        availablePairs.splice(availablePairs.indexOf(pair1Idx), 1);
        availablePairs.splice(availablePairs.indexOf(pair2Idx), 1);

        matches.push({
          number: globalMatchNumber++,
          round: round + 1,
          pair1: pairs[pair1Idx],
          pair2: pairs[pair2Idx],
          scoringMode,
          sets: [],
        });
      }
    }

    return matches;
  }

  generateSummary(matches: Match[]): string {
    const lines: string[] = [];

    const matchesByRound = new Map<number, Match[]>();
    matches.forEach((match) => {
      if (!matchesByRound.has(match.round)) {
        matchesByRound.set(match.round, []);
      }
      matchesByRound.get(match.round)?.push(match);
    });

    const rounds = Array.from(matchesByRound.keys()).sort((a, b) => a - b);

    rounds.forEach((roundNumber) => {
      const roundMatches = matchesByRound.get(roundNumber) || [];
      lines.push(`━━━ RONDA ${roundNumber} ━━━`);
      lines.push(`(${roundMatches.length} partido(s) simultáneo(s))\n`);

      roundMatches.forEach((match) => {
        const [p1, p2] = match.pair1;
        const [p3, p4] = match.pair2;

        let line = `Partido ${match.number}: [${p1.name}, ${p2.name}] vs [${p3.name}, ${p4.name}]`;

        if (match.scoringMode === "sets" && match.sets.length > 0) {
          const setStr = match.sets
            .filter((s) => s.pair1Games >= 0 && s.pair2Games >= 0)
            .map((s) => `${s.pair1Games}-${s.pair2Games}`)
            .join(", ");
          if (setStr) line += ` — ${setStr}`;
        } else if (
          match.scorePair1 !== undefined &&
          match.scorePair2 !== undefined
        ) {
          line += ` — ${match.scorePair1}:${match.scorePair2}`;
        }

        lines.push(line);
      });

      lines.push("");
    });

    return lines.join("\n");
  }

  updateScore(
    matchNumber: number,
    scorePair1: number,
    scorePair2: number,
  ): void {
    const matches = this.matchesSubject.value;
    const match = matches.find((m) => m.number === matchNumber);

    if (!match) return;

    match.scorePair1 = scorePair1;
    match.scorePair2 = scorePair2;
    match.completed = true;
    match.winner = scorePair1 > scorePair2 ? "pair1" : "pair2";
    this.matchesSubject.next([...matches]);

    const config = this.configSubject.value;
    if (config) {
      this.saveToLocalStorage(config, matches);
      this.updateHistoryMatches(matches);
    }
  }

  updateSetScores(matchNumber: number, sets: SetScore[]): void {
    const matches = this.matchesSubject.value;
    const match = matches.find((m) => m.number === matchNumber);

    if (!match) return;

    match.sets = sets;
    match.completed = false;
    match.winner = undefined;

    let pair1Sets = 0;
    let pair2Sets = 0;

    for (const set of sets) {
      const w = getSetWinner(set);
      if (w === "pair1") pair1Sets++;
      else if (w === "pair2") pair2Sets++;
    }

    if (pair1Sets >= 2 || pair2Sets >= 2) {
      match.completed = true;
      match.winner = pair1Sets > pair2Sets ? "pair1" : "pair2";
    }

    this.matchesSubject.next([...matches]);

    const config = this.configSubject.value;
    if (config) {
      this.saveToLocalStorage(config, matches);
      this.updateHistoryMatches(matches);
    }
  }

  calculateStatistics(): PlayerStats[] {
    const matches = this.matchesSubject.value;
    const config = this.configSubject.value;

    if (!config) return [];

    const statistics = new Map<number, PlayerStats>();

    config.players.forEach((player) => {
      statistics.set(player.id, {
        player,
        matchesPlayed: 0,
        matchesWon: 0,
        setsWon: 0,
        setsLost: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        difference: 0,
      });
    });

    matches.forEach((match) => {
      if (match.scoringMode === "sets" && match.sets.length > 0) {
        const [p1, p2] = match.pair1;
        const [p3, p4] = match.pair2;
        const stats1_1 = statistics.get(p1.id)!;
        const stats1_2 = statistics.get(p2.id)!;
        const stats2_1 = statistics.get(p3.id)!;
        const stats2_2 = statistics.get(p4.id)!;

        stats1_1.matchesPlayed++;
        stats1_2.matchesPlayed++;
        stats2_1.matchesPlayed++;
        stats2_2.matchesPlayed++;

        let pair1Sets = 0,
          pair2Sets = 0;
        for (const set of match.sets) {
          stats1_1.pointsFor += set.pair1Games;
          stats1_2.pointsFor += set.pair1Games;
          stats1_1.pointsAgainst += set.pair2Games;
          stats1_2.pointsAgainst += set.pair2Games;
          stats2_1.pointsFor += set.pair2Games;
          stats2_2.pointsFor += set.pair2Games;
          stats2_1.pointsAgainst += set.pair1Games;
          stats2_2.pointsAgainst += set.pair1Games;

          const w = getSetWinner(set);
          if (w === "pair1") pair1Sets++;
          else if (w === "pair2") pair2Sets++;
        }

        stats1_1.setsWon += pair1Sets;
        stats1_2.setsWon += pair1Sets;
        stats1_1.setsLost += pair2Sets;
        stats1_2.setsLost += pair2Sets;
        stats2_1.setsWon += pair2Sets;
        stats2_2.setsWon += pair2Sets;
        stats2_1.setsLost += pair1Sets;
        stats2_2.setsLost += pair1Sets;

        if (pair1Sets > pair2Sets) {
          stats1_1.matchesWon++;
          stats1_2.matchesWon++;
        } else if (pair2Sets > pair1Sets) {
          stats2_1.matchesWon++;
          stats2_2.matchesWon++;
        }
      } else if (
        match.scorePair1 !== undefined &&
        match.scorePair2 !== undefined
      ) {
        const [p1, p2] = match.pair1;
        const [p3, p4] = match.pair2;

        const stats1_1 = statistics.get(p1.id)!;
        const stats1_2 = statistics.get(p2.id)!;
        stats1_1.matchesPlayed++;
        stats1_2.matchesPlayed++;
        stats1_1.pointsFor += match.scorePair1;
        stats1_2.pointsFor += match.scorePair1;
        stats1_1.pointsAgainst += match.scorePair2;
        stats1_2.pointsAgainst += match.scorePair2;

        const stats2_1 = statistics.get(p3.id)!;
        const stats2_2 = statistics.get(p4.id)!;
        stats2_1.matchesPlayed++;
        stats2_2.matchesPlayed++;
        stats2_1.pointsFor += match.scorePair2;
        stats2_2.pointsFor += match.scorePair2;
        stats2_1.pointsAgainst += match.scorePair1;
        stats2_2.pointsAgainst += match.scorePair1;

        if (match.scorePair1 > match.scorePair2) {
          stats1_1.matchesWon++;
          stats1_2.matchesWon++;
        } else if (match.scorePair2 > match.scorePair1) {
          stats2_1.matchesWon++;
          stats2_2.matchesWon++;
        }
      }
    });

    statistics.forEach((stats) => {
      stats.difference = stats.pointsFor - stats.pointsAgainst;
    });

    return Array.from(statistics.values()).sort((a, b) => {
      if (b.matchesWon !== a.matchesWon) return b.matchesWon - a.matchesWon;
      if (b.setsWon !== a.setsWon) return b.setsWon - a.setsWon;
      return b.difference - a.difference;
    });
  }

  calculatePairStatistics(): PlayerStats[] {
    const matches = this.matchesSubject.value;
    const config = this.configSubject.value;
    if (!config) return [];

    const pairStats = new Map<
      number,
      {
        pairId: number;
        player1: Player;
        player2: Player;
        matchesPlayed: number;
        matchesWon: number;
        setsWon: number;
        setsLost: number;
        pointsFor: number;
        pointsAgainst: number;
        difference: number;
      }
    >();

    const getOrCreate = (pairId: number, p1: Player, p2: Player) => {
      if (!pairStats.has(pairId)) {
        pairStats.set(pairId, {
          pairId,
          player1: p1,
          player2: p2,
          matchesPlayed: 0,
          matchesWon: 0,
          setsWon: 0,
          setsLost: 0,
          pointsFor: 0,
          pointsAgainst: 0,
          difference: 0,
        });
      }
      return pairStats.get(pairId)!;
    };

    matches.forEach((match) => {
      const p1Id = match.pair1[0].pairId ?? -match.pair1[0].id;
      const p2Id = match.pair2[0].pairId ?? -match.pair2[0].id;

      const s1 = getOrCreate(p1Id, match.pair1[0], match.pair1[1]);
      const s2 = getOrCreate(p2Id, match.pair2[0], match.pair2[1]);

      if (match.scoringMode === "sets" && match.sets.length > 0) {
        s1.matchesPlayed++;
        s2.matchesPlayed++;

        let pair1Sets = 0,
          pair2Sets = 0;
        for (const set of match.sets) {
          s1.pointsFor += set.pair1Games;
          s1.pointsAgainst += set.pair2Games;
          s2.pointsFor += set.pair2Games;
          s2.pointsAgainst += set.pair1Games;

          const w = getSetWinner(set);
          if (w === "pair1") pair1Sets++;
          else if (w === "pair2") pair2Sets++;
        }

        s1.setsWon += pair1Sets;
        s1.setsLost += pair2Sets;
        s2.setsWon += pair2Sets;
        s2.setsLost += pair1Sets;

        if (pair1Sets > pair2Sets) {
          s1.matchesWon++;
        } else if (pair2Sets > pair1Sets) {
          s2.matchesWon++;
        }
      } else if (
        match.scorePair1 !== undefined &&
        match.scorePair2 !== undefined
      ) {
        s1.matchesPlayed++;
        s2.matchesPlayed++;
        s1.pointsFor += match.scorePair1;
        s1.pointsAgainst += match.scorePair2;
        s2.pointsFor += match.scorePair2;
        s2.pointsAgainst += match.scorePair1;

        if (match.scorePair1 > match.scorePair2) {
          s1.matchesWon++;
        } else if (match.scorePair2 > match.scorePair1) {
          s2.matchesWon++;
        }
      }
    });

    return Array.from(pairStats.values())
      .map((p) => {
        p.difference = p.pointsFor - p.pointsAgainst;
        return {
          player: {
            id: -p.pairId,
            name: `${p.player1.name} & ${p.player2.name}`,
            position: "either" as const,
            pairId: p.pairId,
          },
          matchesPlayed: p.matchesPlayed,
          matchesWon: p.matchesWon,
          setsWon: p.setsWon,
          setsLost: p.setsLost,
          pointsFor: p.pointsFor,
          pointsAgainst: p.pointsAgainst,
          difference: p.difference,
        };
      })
      .sort((a, b) => {
        if (b.matchesWon !== a.matchesWon) return b.matchesWon - a.matchesWon;
        if (b.setsWon !== a.setsWon) return b.setsWon - a.setsWon;
        return b.difference - a.difference;
      });
  }

  private saveToLocalStorage(config: TournamentConfig, matches: Match[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
      localStorage.setItem(this.MATCHES_KEY, JSON.stringify(matches));
    } catch {
      this.notificationService.showSystemError("Error interno: no se pudo guardar el torneo.");
    }
  }

  private loadFromLocalStorage(): void {
    try {
      const configStr = localStorage.getItem(this.STORAGE_KEY);
      const matchesStr = localStorage.getItem(this.MATCHES_KEY);

      if (configStr) {
        const config = JSON.parse(configStr) as TournamentConfig;
        if (!config.scoringMode) config.scoringMode = "points";
        this.configSubject.next(config);
      }

      if (matchesStr) {
        const matches = JSON.parse(matchesStr) as Match[];
        this.matchesSubject.next(matches.map((m) => this.migrateMatch(m)));
      }

      const history = this.loadHistory().map((r) => ({
        ...r,
        config: { ...r.config, scoringMode: r.config.scoringMode ?? "points" },
        matches: r.matches.map((m) => this.migrateMatch(m)),
      }));
       this.historySubject.next(history);
     } catch {
       this.notificationService.showSystemError("Error interno: no se pudieron cargar los datos locales.");
     }
   }

  private migrateMatch(m: Match): Match {
    return {
      ...m,
      scoringMode: m.scoringMode ?? "points",
      sets: m.sets ?? [],
      completed: m.completed ?? false,
      winner: m.winner ?? undefined,
    };
  }

  private addToHistory(config: TournamentConfig, matches: Match[]): string {
    const history = this.loadHistory();
    const now = new Date();
    const createdAt = now.toISOString();

    let label = config.name?.trim();
    if (!label) {
      const dateStr = now.toLocaleDateString();
      const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      label = `Americano ${config.players.length} jugs · ${dateStr} ${timeStr}`;
    }

    const record: TournamentRecord = {
      id: crypto.randomUUID?.() ?? Date.now().toString(36),
      createdAt,
      label,
      config,
      matches,
    };

    this._currentTournamentId.next(record.id);
    history.unshift(record);
    if (history.length > 20) history.pop();
    this.saveHistory(history);
    this.historySubject.next(history);
    return record.id;
  }

  getHistory(): TournamentRecord[] {
    return this.loadHistory();
  }

  private updateHistoryMatches(matches: Match[]): void {
    const currentId = this._currentTournamentId.value;
    if (!currentId) return;
    const history = this.loadHistory().map((r) => ({
      ...r,
      config: { ...r.config, scoringMode: r.config.scoringMode ?? "points" },
      matches: r.matches.map((m) => this.migrateMatch(m)),
    }));
    const idx = history.findIndex((r) => r.id === currentId);
    if (idx === -1) return;
    history[idx] = { ...history[idx], matches: matches.map((m) => ({ ...m })) };
    this.saveHistory(history);
    this.historySubject.next(history);
  }

  loadTournament(recordId: string): TournamentRecord | null {
    const history = this.loadHistory().map((r) => ({
      ...r,
      config: { ...r.config, scoringMode: r.config.scoringMode ?? "points" },
      matches: r.matches.map((m) => this.migrateMatch(m)),
    }));
    const record = history.find((r) => r.id === recordId) ?? null;
    if (record) {
      this._currentTournamentId.next(record.id);
      this.configSubject.next(record.config);
      this.matchesSubject.next(record.matches);
      this.saveToLocalStorage(record.config, record.matches);
    }
    return record;
  }

   deleteHistoryRecord(recordId: string): void {
    const history = this.loadHistory().filter((r) => r.id !== recordId);
    this.saveHistory(history);
    this.historySubject.next(history);
  }

  private loadHistory(): TournamentRecord[] {
    try {
      const raw = localStorage.getItem(this.HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveHistory(history: TournamentRecord[]): void {
    try {
      localStorage.setItem(this.HISTORY_KEY, JSON.stringify(history));
    } catch {
      this.notificationService.showSystemError("Error interno: no se pudo guardar el historial.");
    }
  }

  clearCurrentTournamentId(): void {
    this._currentTournamentId.next(null);
  }

  clearData(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.MATCHES_KEY);
    this.configSubject.next(null);
    this.matchesSubject.next([]);
    this.clearCurrentTournamentId();
  }
}
