import { Pair } from '@shared/models/player.model';
import {
  calculateClassicGroupStandings,
  generateClassicBracket,
} from './classic-tournament-generation.utils';

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

  it('creates groups and playoff placeholders when using groups-and-playoffs', () => {
    const matches = generateClassicBracket(
      [
        makePair(1),
        makePair(2),
        makePair(3),
        makePair(4),
        makePair(5),
        makePair(6),
      ],
      {
        format: 'groups-and-playoffs',
        seeded: true,
        thirdPlaceMatch: false,
      },
    );

    const groupMatches = matches.filter((match) => match.stage === 'group');
    const playoffMatches = matches.filter((match) => match.stage === 'playoff');

    expect(groupMatches.length).toBeGreaterThan(0);
    expect(playoffMatches).toHaveLength(3);
    expect(playoffMatches[0].pair1[0].name).toContain('Grupo');
  });

  it('calculates standings for completed group matches', () => {
    const matches = generateClassicBracket(
      [makePair(1), makePair(2), makePair(3), makePair(4)],
      {
        format: 'groups-and-playoffs',
        seeded: true,
        thirdPlaceMatch: false,
      },
    );

    const groupAMatches = matches.filter((match) => match.groupKey === 'Grupo A');
    groupAMatches[0].completed = true;
    groupAMatches[0].winner = 'pair1';
    groupAMatches[0].sets = [
      { pair1Games: 6, pair2Games: 4 },
      { pair1Games: 6, pair2Games: 3 },
    ];

    const standings = calculateClassicGroupStandings(matches, 'Grupo A');

    expect(standings[0].wins).toBe(1);
    expect(standings[0].losses).toBe(0);
    expect(standings).toHaveLength(2);
  });
});
