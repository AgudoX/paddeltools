import { Match, Player, ScoringMode } from "@shared/models/player.model";

function evaluatePositionBalance(players: Player[]): number {
  const positions = players.map((player) => player.position);
  const rightCount = positions.filter((position) => position === "right").length;
  const backhandCount = positions.filter(
    (position) => position === "backhand",
  ).length;
  const eitherCount = positions.filter((position) => position === "either").length;

  if (rightCount === 4 || backhandCount === 4) return 100;
  if (rightCount === 3 || backhandCount === 3) return 50;
  if (rightCount === 2 && backhandCount === 2) return 0;
  if (eitherCount >= 2) return 5;
  return 20;
}

function evaluateGroupScore(
  players: Player[],
  matchCount: Map<number, number>,
  previousOpponents: Map<string, Set<number>>,
): number {
  let score = evaluatePositionBalance(players);
  const matchCounts = players.map((player) => matchCount.get(player.id) || 0);
  score += (Math.max(...matchCounts) - Math.min(...matchCounts)) * 5;

  let opponentRepetitions = 0;
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      if (previousOpponents.get(players[i].id.toString())?.has(players[j].id)) {
        opponentRepetitions++;
      }
    }
  }

  return score + opponentRepetitions * 100;
}

function selectBestFourPlayers(
  availablePlayers: Player[],
  matchCount: Map<number, number>,
  previousOpponents: Map<string, Set<number>>,
): Player[] {
  const sortedByMatches = [...availablePlayers].sort((a, b) => {
    return (matchCount.get(a.id) || 0) - (matchCount.get(b.id) || 0);
  });

  if (sortedByMatches.length <= 4) return sortedByMatches;

  const candidates = sortedByMatches.slice(0, Math.min(8, sortedByMatches.length));
  let bestGroup = candidates.slice(0, 4);
  let bestScore = evaluateGroupScore(bestGroup, matchCount, previousOpponents);

  for (let i = 0; i < candidates.length - 3; i++) {
    for (let j = i + 1; j < candidates.length - 2; j++) {
      for (let k = j + 1; k < candidates.length - 1; k++) {
        for (let l = k + 1; l < candidates.length; l++) {
          const group = [candidates[i], candidates[j], candidates[k], candidates[l]];
          const score = evaluateGroupScore(group, matchCount, previousOpponents);
          if (score < bestScore) {
            bestScore = score;
            bestGroup = group;
          }
        }
      }
    }
  }

  return bestGroup;
}

function evaluatePairPositions(player1: Player, player2: Player): number {
  const pos1 = player1.position;
  const pos2 = player2.position;

  if (
    (pos1 === "right" && pos2 === "backhand") ||
    (pos1 === "backhand" && pos2 === "right")
  ) {
    return 0;
  }
  if (pos1 === "either" && pos2 === "either") return 3;
  if (pos1 === "either" || pos2 === "either") return 5;
  if (pos1 === pos2) return 100;
  return 10;
}

function findBestPairCombination(
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
    if (previousOpponents.get(combo[0].id.toString())?.has(combo[2].id)) opponentRepetitions++;
    if (previousOpponents.get(combo[0].id.toString())?.has(combo[3].id)) opponentRepetitions++;
    if (previousOpponents.get(combo[1].id.toString())?.has(combo[2].id)) opponentRepetitions++;
    if (previousOpponents.get(combo[1].id.toString())?.has(combo[3].id)) opponentRepetitions++;

    score += opponentRepetitions * 1000;
    score += evaluatePairPositions(combo[0], combo[1]);
    score += evaluatePairPositions(combo[2], combo[3]);

    if (score < lowestScore) {
      lowestScore = score;
      bestCombination = combo;
    }
  }

  return bestCombination;
}

export function generateFreeMode(
  players: Player[],
  numberOfRounds: number,
  scoringMode: ScoringMode,
): Match[] {
  const matches: Match[] = [];
  const previousPartnerships = new Map<string, Set<number>>();
  const previousOpponents = new Map<string, Set<number>>();

  players.forEach((player) => {
    previousPartnerships.set(player.id.toString(), new Set<number>());
    previousOpponents.set(player.id.toString(), new Set<number>());
  });

  const matchCount = new Map<number, number>();
  players.forEach((player) => matchCount.set(player.id, 0));

  const matchesPerRound = players.length / 4;
  let globalMatchNumber = 1;

  for (let round = 0; round < numberOfRounds; round++) {
    const availablePlayers = [...players];

    for (let matchInRound = 0; matchInRound < matchesPerRound; matchInRound++) {
      const matchPlayers = selectBestFourPlayers(
        availablePlayers,
        matchCount,
        previousOpponents,
      );

      matchPlayers.forEach((player) => {
        const index = availablePlayers.findIndex((candidate) => candidate.id === player.id);
        if (index > -1) {
          availablePlayers.splice(index, 1);
        }
      });

      const [p1, p2, p3, p4] = findBestPairCombination(
        matchPlayers,
        previousPartnerships,
        previousOpponents,
      );

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

      matchPlayers.forEach((player) => {
        matchCount.set(player.id, (matchCount.get(player.id) || 0) + 1);
      });

      matches.push({
        number: globalMatchNumber++,
        round: round + 1,
        pair1: [p1, p2],
        pair2: [p3, p4],
        scoringMode,
        sets: [],
      });
    }
  }

  return matches;
}

export function generateWithFixedPairs(
  players: Player[],
  numberOfRounds: number,
  scoringMode: ScoringMode,
): Match[] {
  const matches: Match[] = [];
  const fixedPairs = new Map<number, Player[]>();
  const freePlayers: Player[] = [];

  players.forEach((player) => {
    if (player.pairId !== undefined && player.pairId !== null) {
      if (!fixedPairs.has(player.pairId)) {
        fixedPairs.set(player.pairId, []);
      }
      fixedPairs.get(player.pairId)?.push(player);
    } else {
      freePlayers.push(player);
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
  if (pairs.length % 2 !== 0) {
    throw new Error("El número de parejas debe ser par para generar rondas completas");
  }

  const previousMatchups = new Map<string, Set<string>>();
  pairs.forEach((_, index) => {
    previousMatchups.set(index.toString(), new Set<string>());
  });

  const matchesPerRound = pairs.length / 2;
  let globalMatchNumber = 1;

  for (let round = 0; round < numberOfRounds; round++) {
    const availablePairs = [...Array(pairs.length).keys()];

    for (let matchInRound = 0; matchInRound < matchesPerRound; matchInRound++) {
      let pair1Idx = -1;
      let pair2Idx = -1;
      let fewestMatchups = Number.MAX_SAFE_INTEGER;

      for (let i = 0; i < availablePairs.length; i++) {
        for (let j = i + 1; j < availablePairs.length; j++) {
          const p1 = availablePairs[i];
          const p2 = availablePairs[j];

          if (!previousMatchups.get(p1.toString())?.has(p2.toString())) {
            const total =
              (previousMatchups.get(p1.toString())?.size || 0) +
              (previousMatchups.get(p2.toString())?.size || 0);

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
