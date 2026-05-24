import { Match, Player, PlayerStats, TournamentConfig } from "@shared/models/player.model";
import { getSetWinner } from "./tournament-scoring.utils";

function sortStats(a: PlayerStats, b: PlayerStats): number {
  if (b.matchesWon !== a.matchesWon) return b.matchesWon - a.matchesWon;
  if (b.setsWon !== a.setsWon) return b.setsWon - a.setsWon;
  return b.difference - a.difference;
}

export function calculateStatistics(
  config: TournamentConfig | null,
  matches: Match[],
): PlayerStats[] {
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

      let pair1Sets = 0;
      let pair2Sets = 0;

      for (const set of match.sets) {
        stats1_1.pointsFor += set.pair1Games;
        stats1_2.pointsFor += set.pair1Games;
        stats1_1.pointsAgainst += set.pair2Games;
        stats1_2.pointsAgainst += set.pair2Games;
        stats2_1.pointsFor += set.pair2Games;
        stats2_2.pointsFor += set.pair2Games;
        stats2_1.pointsAgainst += set.pair1Games;
        stats2_2.pointsAgainst += set.pair1Games;

        const winner = getSetWinner(set);
        if (winner === "pair1") pair1Sets++;
        if (winner === "pair2") pair2Sets++;
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
      return;
    }

    if (
      match.scorePair1 === undefined ||
      match.scorePair2 === undefined
    ) {
      return;
    }

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

    stats1_1.pointsFor += match.scorePair1;
    stats1_2.pointsFor += match.scorePair1;
    stats1_1.pointsAgainst += match.scorePair2;
    stats1_2.pointsAgainst += match.scorePair2;
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
  });

  statistics.forEach((stat) => {
    stat.difference = stat.pointsFor - stat.pointsAgainst;
  });

  return Array.from(statistics.values()).sort(sortStats);
}

export function calculatePairStatistics(
  config: TournamentConfig | null,
  matches: Match[],
): PlayerStats[] {
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

      let pair1Sets = 0;
      let pair2Sets = 0;

      for (const set of match.sets) {
        s1.pointsFor += set.pair1Games;
        s1.pointsAgainst += set.pair2Games;
        s2.pointsFor += set.pair2Games;
        s2.pointsAgainst += set.pair1Games;

        const winner = getSetWinner(set);
        if (winner === "pair1") pair1Sets++;
        if (winner === "pair2") pair2Sets++;
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
      return;
    }

    if (
      match.scorePair1 === undefined ||
      match.scorePair2 === undefined
    ) {
      return;
    }

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
  });

  return Array.from(pairStats.values())
    .map((pair) => {
      pair.difference = pair.pointsFor - pair.pointsAgainst;
      return {
        player: {
          id: -pair.pairId,
          name: `${pair.player1.name} & ${pair.player2.name}`,
          position: "either" as const,
          pairId: pair.pairId,
        },
        matchesPlayed: pair.matchesPlayed,
        matchesWon: pair.matchesWon,
        setsWon: pair.setsWon,
        setsLost: pair.setsLost,
        pointsFor: pair.pointsFor,
        pointsAgainst: pair.pointsAgainst,
        difference: pair.difference,
      };
    })
    .sort(sortStats);
}
