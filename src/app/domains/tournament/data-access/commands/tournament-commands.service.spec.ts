import { TestBed } from '@angular/core/testing';
import { TournamentCommandsService } from './tournament-commands.service';
import { TournamentStoreService } from '../state/tournament-store.service';
import { TournamentPersistenceService } from '../infrastructure/tournament-persistence.service';
import { ClassicTournamentConfig, Pair, TournamentRecord } from '@shared/models/player.model';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function makePair(id: number): Pair {
  return {
    id,
    player1: { id: id * 2 - 1, name: `P${id}A`, position: 'right', pairId: id },
    player2: { id: id * 2, name: `P${id}B`, position: 'backhand', pairId: id },
  };
}

function makeClassicConfig(): ClassicTournamentConfig {
  const pairs = [makePair(1), makePair(2), makePair(3), makePair(4)];
  return {
    type: 'classic',
    name: 'Classic Cup',
    numberOfPlayers: 8,
    format: 'single-elimination',
    seeded: false,
    thirdPlaceMatch: false,
    pairs,
    players: pairs.flatMap((pair) => [pair.player1, pair.player2]),
  };
}

describe('TournamentCommandsService', () => {
  let service: TournamentCommandsService;
  let store: TournamentStoreService;
  let sessionConfig: ClassicTournamentConfig | null;
  let sessionMatches: TournamentRecord['matches'];
  let historyRecords: TournamentRecord[];
  let persistenceMock: {
    loadSession: ReturnType<typeof vi.fn>;
    saveSession: ReturnType<typeof vi.fn>;
    clearSession: ReturnType<typeof vi.fn>;
    loadHistory: ReturnType<typeof vi.fn>;
    saveHistory: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    sessionConfig = null;
    sessionMatches = [];
    historyRecords = [];

    persistenceMock = {
      loadSession: vi.fn(() => ({
        config: sessionConfig,
        matches: clone(sessionMatches),
        history: clone(historyRecords),
      })),
      saveSession: vi.fn((config, matches) => {
        sessionConfig = clone(config);
        sessionMatches = clone(matches);
      }),
      clearSession: vi.fn(),
      loadHistory: vi.fn(() => clone(historyRecords)),
      saveHistory: vi.fn((history) => {
        historyRecords = clone(history);
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        TournamentCommandsService,
        TournamentStoreService,
        { provide: TournamentPersistenceService, useValue: persistenceMock },
      ],
    });

    service = TestBed.inject(TournamentCommandsService);
    store = TestBed.inject(TournamentStoreService);
  });

  it('clears downstream rounds when a resolved classic winner changes', () => {
    service.generateClassicTournament(makeClassicConfig());
    service.updateClassicMatchWinner(1, 'pair1');
    service.updateClassicMatchWinner(2, 'pair1');
    service.updateClassicMatchWinner(3, 'pair1');

    service.updateClassicMatchWinner(1, 'pair2');

    const matches = store.matches();
    const final = matches.find((match) => match.number === 3);

    expect(final?.pair1[0].name).toBe('P2A');
    expect(final?.pair1[1].name).toBe('P2B');
    expect(final?.completed).toBe(false);
    expect(final?.winner).toBeUndefined();
    expect(final?.sets).toEqual([]);
  });

  it('reopens a resolved classic match and resets dependent placeholders', () => {
    service.generateClassicTournament(makeClassicConfig());
    service.updateClassicMatchWinner(1, 'pair1');
    service.updateClassicMatchWinner(2, 'pair2');
    service.updateClassicMatchWinner(3, 'pair2');

    service.clearClassicMatchResult(2);

    const matches = store.matches();
    const semifinal = matches.find((match) => match.number === 2);
    const final = matches.find((match) => match.number === 3);

    expect(semifinal?.completed).toBe(false);
    expect(semifinal?.winner).toBeUndefined();
    expect(final?.pair2[0].name).toBe('Ganador P2');
    expect(final?.pair2[1].name).toBe('Ganador P2');
    expect(final?.completed).toBe(false);
    expect(final?.winner).toBeUndefined();
  });

  it('throws when generating classic tournament with fewer than 2 pairs', () => {
    const config = makeClassicConfig();
    config.pairs = [makePair(1)];
    expect(() => service.generateClassicTournament(config)).toThrow(
      'Debe haber al menos 2 parejas para crear el torneo',
    );
  });

  it('calculateStatistics returns empty for classic config', () => {
    service.generateClassicTournament(makeClassicConfig());
    expect(service.calculateStatistics()).toEqual([]);
  });

  it('calculatePairStatistics returns empty for classic config', () => {
    service.generateClassicTournament(makeClassicConfig());
    expect(service.calculatePairStatistics()).toEqual([]);
  });

  it('propagates loser to third-place match when match is resolved', () => {
    const config = makeClassicConfig();
    config.thirdPlaceMatch = true;
    service.generateClassicTournament(config);
    service.updateClassicMatchWinner(1, 'pair1');
    const matches = store.matches();
    const third = matches.find((match) => match.number === 4);
    expect(third).toBeDefined();
    expect(third?.pair1[0].name).toBe('P2A');
    expect(third?.pair1[1].name).toBe('P2B');
  });

  it('generateTournament throws when called with classic config', () => {
    expect(() =>
      service.generateTournament(makeClassicConfig()),
    ).toThrow('Usa generateClassicTournament para torneos clásicos');
  });

  it('propagates group standings into playoffs for groups-and-playoffs', () => {
    const config = makeClassicConfig();
    config.format = 'groups-and-playoffs';
    config.seeded = true;
    config.pairs = [
      makePair(1),
      makePair(2),
      makePair(3),
      makePair(4),
    ];
    config.players = config.pairs.flatMap((pair) => [pair.player1, pair.player2]);

    service.generateClassicTournament(config);

    const groupMatches = store.matches().filter((match) => match.stage === 'group');
    for (const match of groupMatches) {
      service.updateClassicMatchWinner(match.number, 'pair1');
    }

    const semifinal = store
      .matches()
      .find((match) => match.stage === 'playoff' && match.round === 1);

    expect(semifinal?.pair1[0].name).not.toContain('Grupo');
    expect(semifinal?.pair2[0].name).not.toContain('Grupo');
  });

  it('updateClassicMatch throws when config is not classic', () => {
    service.generateTournament({
      type: 'americano',
      name: 'Test',
      numberOfPlayers: 8,
      numberOfRounds: 3,
      mode: 'free',
      scoringMode: 'sets',
      players: [
        { id: 1, name: 'A', position: 'right' },
        { id: 2, name: 'B', position: 'backhand' },
        { id: 3, name: 'C', position: 'either' },
        { id: 4, name: 'D', position: 'right' },
        { id: 5, name: 'E', position: 'backhand' },
        { id: 6, name: 'F', position: 'either' },
        { id: 7, name: 'G', position: 'right' },
        { id: 8, name: 'H', position: 'backhand' },
      ],
    });
    expect(() => service.updateClassicMatchWinner(1, 'pair1')).toThrow(
      'Solo se pueden resolver partidos en torneos clásicos',
    );
  });
});
