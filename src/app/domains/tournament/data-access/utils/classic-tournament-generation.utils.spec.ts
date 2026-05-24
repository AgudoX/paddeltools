import { Pair } from '@shared/models/player.model';
import { generateClassicBracket } from './classic-tournament-generation.utils';

function makePair(id: number): Pair {
  return {
    id,
    player1: { id: id * 2 - 1, name: `P${id}A`, position: 'right', pairId: id },
    player2: { id: id * 2, name: `P${id}B`, position: 'backhand', pairId: id },
  };
}

describe('generateClassicBracket', () => {
  it('creates a basic seeded bracket for 4 pairs', () => {
    const matches = generateClassicBracket(
      [makePair(1), makePair(2), makePair(3), makePair(4)],
      { seeded: true, thirdPlaceMatch: false },
    );

    expect(matches).toHaveLength(3);
    expect(matches.filter((match) => match.round === 1)).toHaveLength(2);
    expect(matches.filter((match) => match.round === 2)).toHaveLength(1);
  });

  it('creates bye matches when the bracket is not a power of two', () => {
    const matches = generateClassicBracket(
      [makePair(1), makePair(2), makePair(3)],
      { seeded: true, thirdPlaceMatch: false },
    );

    expect(matches[0].completed || matches[1].completed).toBe(true);
    expect(matches.some((match) => match.pair1[0].name === 'BYE' || match.pair2[0].name === 'BYE')).toBe(true);
  });

  it('adds a third-place match when enabled', () => {
    const matches = generateClassicBracket(
      [makePair(1), makePair(2), makePair(3), makePair(4)],
      { seeded: false, thirdPlaceMatch: true },
    );

    expect(matches).toHaveLength(4);
    expect(matches.at(-1)?.round).toBe(3);
  });
});
