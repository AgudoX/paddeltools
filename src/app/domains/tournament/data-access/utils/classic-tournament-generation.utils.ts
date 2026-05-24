import {
  ClassicTournamentFormat,
  Match,
  Pair,
  Player,
  ScoringMode,
  SetScore,
} from "@shared/models/player.model";
import { getSetWinner } from "./tournament-scoring.utils";

const BYE_PAIR_ID = -10_000;
const PLACEHOLDER_PAIR_ID = -20_000;

type PairSlot = Pair | null;

export interface ClassicBracketOptions {
  format?: ClassicTournamentFormat;
  seeded: boolean;
  thirdPlaceMatch: boolean;
  scoringMode?: ScoringMode;
}

export interface ClassicGroupStanding {
  groupKey: string;
  pair: [Player, Player];
  pairId: number;
  played: number;
  wins: number;
  losses: number;
  setsWon: number;
  setsLost: number;
  gamesFor: number;
  gamesAgainst: number;
  setDifference: number;
  gameDifference: number;
}

export function generateClassicBracket(
  pairs: Pair[],
  options: ClassicBracketOptions,
): Match[] {
  if (pairs.length < 2) {
    throw new Error("Debe haber al menos 2 parejas para crear un torneo clásico");
  }

  if (options.format === "groups-and-playoffs") {
    return generateGroupsAndPlayoffsBracket(pairs, options);
  }

  return generateSingleEliminationBracket(pairs, options);
}

export function calculateClassicGroupStandings(
  matches: Match[],
  groupKey: string,
): ClassicGroupStanding[] {
  const groupMatches = matches.filter(
    (match) => match.stage === "group" && match.groupKey === groupKey,
  );
  const standings = new Map<number, ClassicGroupStanding>();

  groupMatches.forEach((match) => {
    const pair1 = clonePair(match.pair1);
    const pair2 = clonePair(match.pair2);
    const pair1Id = getPairId(pair1);
    const pair2Id = getPairId(pair2);

    ensureStanding(standings, groupKey, pair1Id, pair1);
    ensureStanding(standings, groupKey, pair2Id, pair2);

    if (!match.completed || !match.winner) {
      return;
    }

    const entry1 = standings.get(pair1Id)!;
    const entry2 = standings.get(pair2Id)!;
    entry1.played += 1;
    entry2.played += 1;

    if (match.winner === "pair1") {
      entry1.wins += 1;
      entry2.losses += 1;
    } else {
      entry2.wins += 1;
      entry1.losses += 1;
    }

    const completedSets = normalizeCompletedSets(match.sets);
    completedSets.forEach((set) => {
      entry1.gamesFor += set.pair1Games;
      entry1.gamesAgainst += set.pair2Games;
      entry2.gamesFor += set.pair2Games;
      entry2.gamesAgainst += set.pair1Games;

      const winner = getSetWinner(set);
      if (winner === "pair1") {
        entry1.setsWon += 1;
        entry2.setsLost += 1;
      }
      if (winner === "pair2") {
        entry2.setsWon += 1;
        entry1.setsLost += 1;
      }
    });

    if (completedSets.length === 0) {
      if (match.winner === "pair1") {
        entry1.setsWon += 1;
        entry2.setsLost += 1;
      } else {
        entry2.setsWon += 1;
        entry1.setsLost += 1;
      }
    }
  });

  return Array.from(standings.values())
    .map((entry) => ({
      ...entry,
      setDifference: entry.setsWon - entry.setsLost,
      gameDifference: entry.gamesFor - entry.gamesAgainst,
    }))
    .sort((left, right) => {
      if (right.wins !== left.wins) {
        return right.wins - left.wins;
      }
      if (right.setDifference !== left.setDifference) {
        return right.setDifference - left.setDifference;
      }
      if (right.gameDifference !== left.gameDifference) {
        return right.gameDifference - left.gameDifference;
      }
      return pairDisplayName(left.pair).localeCompare(pairDisplayName(right.pair), "es");
    });
}

export function isClassicGroupComplete(matches: Match[], groupKey: string): boolean {
  const groupMatches = matches.filter(
    (match) => match.stage === "group" && match.groupKey === groupKey,
  );
  return groupMatches.length > 0 && groupMatches.every((match) => !!match.completed);
}

export function getClassicGroupKeys(matches: Match[]): string[] {
  return Array.from(
    new Set(
      matches
        .filter((match) => match.stage === "group" && match.groupKey)
        .map((match) => match.groupKey!),
    ),
  ).sort((left, right) => left.localeCompare(right, "es"));
}

function generateSingleEliminationBracket(
  pairs: Pair[],
  options: ClassicBracketOptions,
): Match[] {
  const scoringMode = options.scoringMode ?? "sets";
  const bracketSize = nextPowerOfTwo(pairs.length);
  const slots = options.seeded
    ? placeSeededPairs(pairs, bracketSize)
    : placeSequentialPairs(pairs, bracketSize);

  const rounds: Match[] = [];
  let matchNumber = 1;
  let previousRound = createFirstRound(slots, scoringMode, matchNumber);
  rounds.push(...previousRound.matches);
  matchNumber = previousRound.nextMatchNumber;

  let roundNumber = 2;
  while (previousRound.matches.length > 1) {
    const nextRoundMatches: Match[] = [];

    for (let index = 0; index < previousRound.matches.length; index += 2) {
      const left = previousRound.matches[index];
      const right = previousRound.matches[index + 1];
      if (!right) {
        continue;
      }

      nextRoundMatches.push({
        number: matchNumber++,
        round: roundNumber,
        stage: "playoff",
        pair1:
          resolveWinnerPair(left) ?? createPlaceholderPair(`Ganador P${left.number}`),
        pair2:
          resolveWinnerPair(right) ?? createPlaceholderPair(`Ganador P${right.number}`),
        pair1Source: { kind: "winner", matchNumber: left.number },
        pair2Source: { kind: "winner", matchNumber: right.number },
        scoringMode,
        sets: [],
        completed: false,
      });
    }

    rounds.push(...nextRoundMatches);
    previousRound = {
      matches: nextRoundMatches,
      nextMatchNumber: matchNumber,
    };
    roundNumber++;
  }

  if (options.thirdPlaceMatch && rounds.length >= 3) {
    const semifinals = rounds.filter((match) => match.round === roundNumber - 2);
    if (semifinals.length >= 2) {
      rounds.push({
        number: matchNumber,
        round: roundNumber,
        stage: "playoff",
        pair1: createPlaceholderPair(`Perdedor P${semifinals[0].number}`),
        pair2: createPlaceholderPair(`Perdedor P${semifinals[1].number}`),
        pair1Source: { kind: "loser", matchNumber: semifinals[0].number },
        pair2Source: { kind: "loser", matchNumber: semifinals[1].number },
        scoringMode,
        sets: [],
        completed: false,
      });
    }
  }

  return rounds;
}

function generateGroupsAndPlayoffsBracket(
  pairs: Pair[],
  options: ClassicBracketOptions,
): Match[] {
  if (pairs.length < 4) {
    throw new Error(
      "Grupos + playoffs necesita al menos 4 parejas para armar el cuadro",
    );
  }

  const scoringMode = options.scoringMode ?? "sets";
  const groupCount = resolveGroupCount(pairs.length);
  const groupKeys = Array.from({ length: groupCount }, (_, index) =>
    `Grupo ${String.fromCharCode(65 + index)}`,
  );
  const groups = assignPairsToGroups(pairs, groupCount, options.seeded);
  const matches: Match[] = [];
  let matchNumber = 1;

  groups.forEach((groupPairs, index) => {
    const groupKey = groupKeys[index];
    const groupMatches = createGroupMatches(groupPairs, groupKey, scoringMode, matchNumber);
    matches.push(...groupMatches.matches);
    matchNumber = groupMatches.nextMatchNumber;
  });

  const playoffMatches = createPlayoffMatchesForGroups(
    groupKeys,
    scoringMode,
    matchNumber,
    options.thirdPlaceMatch,
  );
  matches.push(...playoffMatches);

  return matches;
}

function createPlayoffMatchesForGroups(
  groupKeys: string[],
  scoringMode: ScoringMode,
  startMatchNumber: number,
  thirdPlaceMatch: boolean,
): Match[] {
  const qualifierSources =
    groupKeys.length <= 2
      ? [
          { groupKey: groupKeys[0], rank: 1 },
          { groupKey: groupKeys[1], rank: 2 },
          { groupKey: groupKeys[1], rank: 1 },
          { groupKey: groupKeys[0], rank: 2 },
        ]
      : [
          { groupKey: groupKeys[0], rank: 1 },
          { groupKey: groupKeys[3], rank: 2 },
          { groupKey: groupKeys[1], rank: 1 },
          { groupKey: groupKeys[2], rank: 2 },
          { groupKey: groupKeys[2], rank: 1 },
          { groupKey: groupKeys[1], rank: 2 },
          { groupKey: groupKeys[3], rank: 1 },
          { groupKey: groupKeys[0], rank: 2 },
        ];

  const firstRoundMatches: Match[] = [];
  let matchNumber = startMatchNumber;
  let qualifierIndex = 0;

  while (qualifierIndex < qualifierSources.length) {
    const pair1Source = qualifierSources[qualifierIndex++];
    const pair2Source = qualifierSources[qualifierIndex++];
    firstRoundMatches.push({
      number: matchNumber++,
      round: 1,
      stage: "playoff",
      pair1: createGroupRankPlaceholder(pair1Source.groupKey, pair1Source.rank),
      pair2: createGroupRankPlaceholder(pair2Source.groupKey, pair2Source.rank),
      pair1Source: { kind: "group-rank", ...pair1Source },
      pair2Source: { kind: "group-rank", ...pair2Source },
      scoringMode,
      sets: [],
      completed: false,
    });
  }

  const rounds: Match[] = [...firstRoundMatches];
  let previousRoundMatches = firstRoundMatches;
  let roundNumber = 2;

  while (previousRoundMatches.length > 1) {
    const nextRoundMatches: Match[] = [];
    for (let index = 0; index < previousRoundMatches.length; index += 2) {
      const left = previousRoundMatches[index];
      const right = previousRoundMatches[index + 1];
      if (!right) {
        continue;
      }

      nextRoundMatches.push({
        number: matchNumber++,
        round: roundNumber,
        stage: "playoff",
        pair1: createPlaceholderPair(`Ganador P${left.number}`),
        pair2: createPlaceholderPair(`Ganador P${right.number}`),
        pair1Source: { kind: "winner", matchNumber: left.number },
        pair2Source: { kind: "winner", matchNumber: right.number },
        scoringMode,
        sets: [],
        completed: false,
      });
    }
    rounds.push(...nextRoundMatches);
    previousRoundMatches = nextRoundMatches;
    roundNumber += 1;
  }

  if (thirdPlaceMatch && firstRoundMatches.length >= 2) {
    const semifinals = rounds.filter((match) => match.round === roundNumber - 2);
    if (semifinals.length >= 2) {
      rounds.push({
        number: matchNumber,
        round: roundNumber,
        stage: "playoff",
        pair1: createPlaceholderPair(`Perdedor P${semifinals[0].number}`),
        pair2: createPlaceholderPair(`Perdedor P${semifinals[1].number}`),
        pair1Source: { kind: "loser", matchNumber: semifinals[0].number },
        pair2Source: { kind: "loser", matchNumber: semifinals[1].number },
        scoringMode,
        sets: [],
        completed: false,
      });
    }
  }

  return rounds;
}

function createGroupMatches(
  groupPairs: Pair[],
  groupKey: string,
  scoringMode: ScoringMode,
  startMatchNumber: number,
): { matches: Match[]; nextMatchNumber: number } {
  const matches: Match[] = [];
  let matchNumber = startMatchNumber;
  let round = 1;

  for (let left = 0; left < groupPairs.length; left++) {
    for (let right = left + 1; right < groupPairs.length; right++) {
      matches.push({
        number: matchNumber++,
        round,
        stage: "group",
        groupKey,
        pair1: toMatchPair(groupPairs[left]),
        pair2: toMatchPair(groupPairs[right]),
        scoringMode,
        sets: [],
        completed: false,
      });
      round = round === 3 ? 1 : round + 1;
    }
  }

  return { matches, nextMatchNumber: matchNumber };
}

function resolveGroupCount(pairCount: number): number {
  return pairCount <= 8 ? 2 : 4;
}

function assignPairsToGroups(
  pairs: Pair[],
  groupCount: number,
  seeded: boolean,
): Pair[][] {
  const orderedPairs = seeded ? [...pairs] : [...pairs];
  const groups = Array.from({ length: groupCount }, () => [] as Pair[]);
  const maxIndex = groupCount - 1;

  orderedPairs.forEach((pair, index) => {
    const cycle = Math.floor(index / groupCount);
    const offset = index % groupCount;
    const groupIndex = cycle % 2 === 0 ? offset : maxIndex - offset;
    groups[groupIndex].push(pair);
  });

  return groups;
}

function createFirstRound(
  slots: PairSlot[],
  scoringMode: ScoringMode,
  startMatchNumber: number,
): { matches: Match[]; nextMatchNumber: number } {
  const matches: Match[] = [];
  let matchNumber = startMatchNumber;

  for (let index = 0; index < slots.length; index += 2) {
    const left = slots[index];
    const right = slots[index + 1];
    const leftPair = left ? toMatchPair(left) : createByePair();
    const rightPair = right ? toMatchPair(right) : createByePair();
    const completed = !left || !right;
    const winner = !left && right ? "pair2" : left && !right ? "pair1" : undefined;

    matches.push({
      number: matchNumber++,
      round: 1,
      stage: "playoff",
      pair1: leftPair,
      pair2: rightPair,
      scoringMode,
      sets: [],
      completed,
      winner,
    });
  }

  return { matches, nextMatchNumber: matchNumber };
}

function placeSeededPairs(pairs: Pair[], bracketSize: number): PairSlot[] {
  const positions = buildSeedPositions(bracketSize);
  const slots = Array<PairSlot>(bracketSize).fill(null);

  pairs.forEach((pair, index) => {
    const position = positions[index] - 1;
    slots[position] = pair;
  });

  return slots;
}

function placeSequentialPairs(pairs: Pair[], bracketSize: number): PairSlot[] {
  return [...pairs, ...Array<PairSlot>(bracketSize - pairs.length).fill(null)];
}

function buildSeedPositions(size: number): number[] {
  let positions = [1, 2];

  while (positions.length < size) {
    const nextSize = positions.length * 2 + 1;
    positions = positions.flatMap((seed) => [seed, nextSize - seed]);
  }

  return positions;
}

function resolveWinnerPair(match: Match): [Player, Player] | null {
  if (!match.completed || !match.winner) {
    return null;
  }

  return match.winner === "pair1" ? match.pair1 : match.pair2;
}

function toMatchPair(pair: Pair): [Player, Player] {
  return [{ ...pair.player1 }, { ...pair.player2 }];
}

function createByePair(): [Player, Player] {
  return [
    { id: BYE_PAIR_ID, name: "BYE", position: "either", pairId: BYE_PAIR_ID },
    { id: BYE_PAIR_ID - 1, name: "BYE", position: "either", pairId: BYE_PAIR_ID },
  ];
}

function createPlaceholderPair(label: string): [Player, Player] {
  return [
    {
      id: PLACEHOLDER_PAIR_ID,
      name: label,
      position: "either",
      pairId: PLACEHOLDER_PAIR_ID,
    },
    {
      id: PLACEHOLDER_PAIR_ID - 1,
      name: label,
      position: "either",
      pairId: PLACEHOLDER_PAIR_ID,
    },
  ];
}

function createGroupRankPlaceholder(
  groupKey: string,
  rank: number,
): [Player, Player] {
  const label = `${rank}º ${groupKey}`;
  return createPlaceholderPair(label);
}

function nextPowerOfTwo(value: number): number {
  let result = 1;
  while (result < value) {
    result *= 2;
  }
  return result;
}

function ensureStanding(
  standings: Map<number, ClassicGroupStanding>,
  groupKey: string,
  pairId: number,
  pair: [Player, Player],
): void {
  if (standings.has(pairId)) {
    return;
  }

  standings.set(pairId, {
    groupKey,
    pair,
    pairId,
    played: 0,
    wins: 0,
    losses: 0,
    setsWon: 0,
    setsLost: 0,
    gamesFor: 0,
    gamesAgainst: 0,
    setDifference: 0,
    gameDifference: 0,
  });
}

function normalizeCompletedSets(sets: SetScore[]): SetScore[] {
  return sets.filter((set) => getSetWinner(set) !== null);
}

function getPairId(pair: [Player, Player]): number {
  return pair[0].pairId ?? pair[0].id;
}

function clonePair(pair: [Player, Player]): [Player, Player] {
  return [{ ...pair[0] }, { ...pair[1] }];
}

function pairDisplayName(pair: [Player, Player]): string {
  return pair[0].name === pair[1].name
    ? pair[0].name
    : `${pair[0].name} ${pair[1].name}`;
}
