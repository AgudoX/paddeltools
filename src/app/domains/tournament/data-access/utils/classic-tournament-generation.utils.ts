import {
  Match,
  Pair,
  Player,
  ScoringMode,
} from "@shared/models/player.model";

const BYE_PAIR_ID = -10_000;
const PLACEHOLDER_PAIR_ID = -20_000;

type PairSlot = Pair | null;

export interface ClassicBracketOptions {
  seeded: boolean;
  thirdPlaceMatch: boolean;
  scoringMode?: ScoringMode;
}

export function generateClassicBracket(
  pairs: Pair[],
  options: ClassicBracketOptions,
): Match[] {
  if (pairs.length < 2) {
    throw new Error("Debe haber al menos 2 parejas para crear un torneo clásico");
  }

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
        pair1: resolveWinnerPair(left) ?? createPlaceholderPair(`Ganador P${left.number}`),
        pair2: resolveWinnerPair(right) ?? createPlaceholderPair(`Ganador P${right.number}`),
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

function nextPowerOfTwo(value: number): number {
  let result = 1;
  while (result < value) {
    result *= 2;
  }
  return result;
}
