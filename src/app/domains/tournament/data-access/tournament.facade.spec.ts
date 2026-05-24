import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TournamentFacade } from './tournament.facade';
import { TournamentStoreService } from './state/tournament-store.service';
import { TournamentCommandsService } from './commands/tournament-commands.service';
import { ClassicTournamentConfig, Match, TournamentConfig, TournamentRecord, PlayerStats, SetScore } from '@shared/models/player.model';

describe('TournamentFacade', () => {
  let facade: TournamentFacade;
  let storeSignals: {
    matches: ReturnType<typeof signal<Match[]>>;
    config: ReturnType<typeof signal<TournamentConfig | null>>;
    history: ReturnType<typeof signal<TournamentRecord[]>>;
    currentTournamentId: ReturnType<typeof signal<string | null>>;
  };
  let commands: {
    generateTournament: ReturnType<typeof vi.fn>;
    generateClassicTournament: ReturnType<typeof vi.fn>;
    updateScore: ReturnType<typeof vi.fn>;
    updateSetScores: ReturnType<typeof vi.fn>;
    updateClassicMatchWinner: ReturnType<typeof vi.fn>;
    clearClassicMatchResult: ReturnType<typeof vi.fn>;
    calculateStatistics: ReturnType<typeof vi.fn>;
    calculatePairStatistics: ReturnType<typeof vi.fn>;
    generateSummary: ReturnType<typeof vi.fn>;
    loadTournament: ReturnType<typeof vi.fn>;
    deleteHistoryRecord: ReturnType<typeof vi.fn>;
    clearCurrentTournamentId: ReturnType<typeof vi.fn>;
    clearData: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    storeSignals = {
      matches: signal<Match[]>([]),
      config: signal<TournamentConfig | null>(null),
      history: signal<TournamentRecord[]>([]),
      currentTournamentId: signal<string | null>(null),
    };

    commands = {
      generateTournament: vi.fn(),
      generateClassicTournament: vi.fn(),
      updateScore: vi.fn(),
      updateSetScores: vi.fn(),
      updateClassicMatchWinner: vi.fn(),
      clearClassicMatchResult: vi.fn(),
      calculateStatistics: vi.fn(() => [] as PlayerStats[]),
      calculatePairStatistics: vi.fn(() => [] as PlayerStats[]),
      generateSummary: vi.fn(),
      loadTournament: vi.fn(),
      deleteHistoryRecord: vi.fn(),
      clearCurrentTournamentId: vi.fn(),
      clearData: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        TournamentFacade,
        {
          provide: TournamentStoreService,
          useValue: {
            matches: storeSignals.matches.asReadonly(),
            config: storeSignals.config.asReadonly(),
            history: storeSignals.history.asReadonly(),
            currentTournamentId: storeSignals.currentTournamentId.asReadonly(),
          },
        },
        { provide: TournamentCommandsService, useValue: commands },
      ],
    });

    facade = TestBed.inject(TournamentFacade);
  });

  it('reflects empty initial state', () => {
    expect(facade.matches()).toEqual([]);
    expect(facade.config()).toBeNull();
    expect(facade.history()).toEqual([]);
    expect(facade.currentTournamentId()).toBeNull();
    expect(facade.loading()).toBe(false);
  });

  it('reads matches from the store signal', () => {
    const match = { number: 1, round: 1 } as Match;
    storeSignals.matches.set([match]);
    expect(facade.matches()).toEqual([match]);
  });

  it('reads config from the store signal', () => {
    const config = { numberOfPlayers: 8 } as TournamentConfig;
    storeSignals.config.set(config);
    expect(facade.config()).toEqual(config);
  });

  it('reads history from the store signal', () => {
    const record = { id: '1' } as TournamentRecord;
    storeSignals.history.set([record]);
    expect(facade.history()).toEqual([record]);
  });

  it('reads current tournament id from the store signal', () => {
    storeSignals.currentTournamentId.set('abc-123');
    expect(facade.currentTournamentId()).toBe('abc-123');
  });

  describe('generateTournament', () => {
    it('delegates to commands and returns id', () => {
      commands.generateTournament.mockReturnValue('tourney-1');
      const config = { numberOfPlayers: 8 } as TournamentConfig;

      const id = facade.generateTournament(config);

      expect(commands.generateTournament).toHaveBeenCalledWith(config);
      expect(id).toBe('tourney-1');
    });

    it('sets loading true then false', () => {
      commands.generateTournament.mockReturnValue('id');
      facade.generateTournament({ numberOfPlayers: 8 } as TournamentConfig);
      expect(facade.loading()).toBe(false);
    });
  });

  it('delegates classic generation and returns id', () => {
    commands.generateClassicTournament.mockReturnValue('classic-1');
    const config = {
      type: 'classic',
      name: 'Classic',
      numberOfPlayers: 8,
      format: 'single-elimination',
      seeded: true,
      thirdPlaceMatch: false,
      pairs: [],
      players: [],
    } as ClassicTournamentConfig;

    const id = facade.generateClassicTournament(config);

    expect(commands.generateClassicTournament).toHaveBeenCalledWith(config);
    expect(id).toBe('classic-1');
  });

  it('delegates updateScore', () => {
    facade.updateScore(1, 6, 3);
    expect(commands.updateScore).toHaveBeenCalledWith(1, 6, 3);
  });

  it('delegates updateSetScores', () => {
    const sets: SetScore[] = [{ pair1Games: 6, pair2Games: 4 }];
    facade.updateSetScores(1, sets);
    expect(commands.updateSetScores).toHaveBeenCalledWith(1, sets);
  });

  it('delegates updateClassicMatchWinner', () => {
    facade.updateClassicMatchWinner(3, 'pair2');
    expect(commands.updateClassicMatchWinner).toHaveBeenCalledWith(3, 'pair2');
  });

  it('delegates clearClassicMatchResult', () => {
    facade.clearClassicMatchResult(3);
    expect(commands.clearClassicMatchResult).toHaveBeenCalledWith(3);
  });

  describe('calculateStatistics', () => {
    it('calls individual statistics for free mode', () => {
      storeSignals.config.set({ mode: 'free', players: [] } as unknown as TournamentConfig);
      facade.calculateStatistics();
      expect(commands.calculateStatistics).toHaveBeenCalled();
      expect(commands.calculatePairStatistics).not.toHaveBeenCalled();
    });

    it('calls pair statistics for fixed-pairs mode', () => {
      storeSignals.config.set({ mode: 'fixed-pairs', players: [] } as unknown as TournamentConfig);
      facade.calculateStatistics();
      expect(commands.calculatePairStatistics).toHaveBeenCalled();
      expect(commands.calculateStatistics).not.toHaveBeenCalled();
    });

    it('returns empty array when no config', () => {
      storeSignals.config.set(null);
      expect(facade.calculateStatistics()).toEqual([]);
    });

    it('returns empty array for classic tournaments', () => {
      storeSignals.config.set({
        type: 'classic',
        name: 'Classic',
        numberOfPlayers: 8,
        format: 'single-elimination',
        seeded: true,
        thirdPlaceMatch: false,
        pairs: [],
        players: [],
      } as ClassicTournamentConfig);
      expect(facade.calculateStatistics()).toEqual([]);
    });
  });

  it('delegates generateSummary', () => {
    const matches = [{ number: 1 }] as Match[];
    facade.generateSummary(matches);
    expect(commands.generateSummary).toHaveBeenCalledWith(matches);
  });

  it('delegates loadTournament', () => {
    facade.loadTournament('record-1');
    expect(commands.loadTournament).toHaveBeenCalledWith('record-1');
  });

  it('delegates deleteHistoryRecord', () => {
    facade.deleteHistoryRecord('rec-1');
    expect(commands.deleteHistoryRecord).toHaveBeenCalledWith('rec-1');
  });

  it('delegates clearCurrentTournamentId', () => {
    facade.clearCurrentTournamentId();
    expect(commands.clearCurrentTournamentId).toHaveBeenCalled();
  });

  it('delegates clearData', () => {
    facade.clearData();
    expect(commands.clearData).toHaveBeenCalled();
  });
});
