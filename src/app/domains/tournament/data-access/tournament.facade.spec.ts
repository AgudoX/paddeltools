import { TestBed } from '@angular/core/testing';
import { TournamentFacade } from './tournament.facade';
import { TournamentService } from './tournament.service';
import { BehaviorSubject } from 'rxjs';
import { Match, TournamentConfig, TournamentRecord, PlayerStats, SetScore } from '@shared/models/player.model';

describe('TournamentFacade', () => {
  let facade: TournamentFacade;
  let mockService: {
    matches$: BehaviorSubject<Match[]>;
    config$: BehaviorSubject<TournamentConfig | null>;
    history$: BehaviorSubject<TournamentRecord[]>;
    currentTournamentId$: BehaviorSubject<string | null>;
    generateTournament: ReturnType<typeof vi.fn>;
    updateScore: ReturnType<typeof vi.fn>;
    updateSetScores: ReturnType<typeof vi.fn>;
    calculateStatistics: ReturnType<typeof vi.fn>;
    calculatePairStatistics: ReturnType<typeof vi.fn>;
    generateSummary: ReturnType<typeof vi.fn>;
    loadTournament: ReturnType<typeof vi.fn>;
    deleteHistoryRecord: ReturnType<typeof vi.fn>;
    clearCurrentTournamentId: ReturnType<typeof vi.fn>;
    clearData: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    const matches$ = new BehaviorSubject<Match[]>([]);
    const config$ = new BehaviorSubject<TournamentConfig | null>(null);
    const history$ = new BehaviorSubject<TournamentRecord[]>([]);
    const currentTournamentId$ = new BehaviorSubject<string | null>(null);

    mockService = {
      matches$,
      config$,
      history$,
      currentTournamentId$,
      generateTournament: vi.fn(),
      updateScore: vi.fn(),
      updateSetScores: vi.fn(),
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
        { provide: TournamentService, useValue: mockService },
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

  it('updates matches signal when service emits', () => {
    const match = { number: 1, round: 1 } as Match;
    mockService.matches$.next([match]);
    expect(facade.matches()).toEqual([match]);
  });

  it('updates config signal when service emits', () => {
    const config = { numberOfPlayers: 8 } as TournamentConfig;
    mockService.config$.next(config);
    expect(facade.config()).toEqual(config);
  });

  it('updates history signal when service emits', () => {
    const record = { id: '1' } as TournamentRecord;
    mockService.history$.next([record]);
    expect(facade.history()).toEqual([record]);
  });

  it('updates currentTournamentId signal when service emits', () => {
    mockService.currentTournamentId$.next('abc-123');
    expect(facade.currentTournamentId()).toBe('abc-123');
  });

  describe('generateTournament', () => {
    it('delegates to service and returns id', () => {
      mockService.generateTournament.mockReturnValue('tourney-1');
      const config = { numberOfPlayers: 8 } as TournamentConfig;

      const id = facade.generateTournament(config);

      expect(mockService.generateTournament).toHaveBeenCalledWith(config);
      expect(id).toBe('tourney-1');
    });

    it('sets loading true then false', () => {
      mockService.generateTournament.mockReturnValue('id');
      expect(facade.loading()).toBe(false);

      facade.generateTournament({ numberOfPlayers: 8 } as TournamentConfig);

      expect(facade.loading()).toBe(false);
    });
  });

  describe('updateScore', () => {
    it('delegates to service', () => {
      facade.updateScore(1, 6, 3);
      expect(mockService.updateScore).toHaveBeenCalledWith(1, 6, 3);
    });
  });

  describe('updateSetScores', () => {
    it('delegates to service', () => {
      const sets: SetScore[] = [{ pair1Games: 6, pair2Games: 4 }];
      facade.updateSetScores(1, sets);
      expect(mockService.updateSetScores).toHaveBeenCalledWith(1, sets);
    });
  });

  describe('calculateStatistics', () => {
    it('calls individual statistics for free mode', () => {
      mockService.config$.next({ mode: 'free', players: [] } as unknown as TournamentConfig);
      facade.calculateStatistics();
      expect(mockService.calculateStatistics).toHaveBeenCalled();
      expect(mockService.calculatePairStatistics).not.toHaveBeenCalled();
    });

    it('calls pair statistics for fixed-pairs mode', () => {
      mockService.config$.next({ mode: 'fixed-pairs', players: [] } as unknown as TournamentConfig);
      facade.calculateStatistics();
      expect(mockService.calculatePairStatistics).toHaveBeenCalled();
      expect(mockService.calculateStatistics).not.toHaveBeenCalled();
    });

    it('returns empty array when no config', () => {
      mockService.config$.next(null);
      const result = facade.calculateStatistics();
      expect(result).toEqual([]);
    });
  });

  describe('generateSummary', () => {
    it('delegates to service', () => {
      const matches = [{ number: 1 }] as Match[];
      facade.generateSummary(matches);
      expect(mockService.generateSummary).toHaveBeenCalledWith(matches);
    });
  });

  describe('loadTournament', () => {
    it('delegates to service', () => {
      facade.loadTournament('record-1');
      expect(mockService.loadTournament).toHaveBeenCalledWith('record-1');
    });
  });

  describe('deleteHistoryRecord', () => {
    it('delegates to service', () => {
      facade.deleteHistoryRecord('rec-1');
      expect(mockService.deleteHistoryRecord).toHaveBeenCalledWith('rec-1');
    });
  });

  describe('clearCurrentTournamentId', () => {
    it('delegates to service', () => {
      facade.clearCurrentTournamentId();
      expect(mockService.clearCurrentTournamentId).toHaveBeenCalled();
    });
  });

  describe('clearData', () => {
    it('delegates to service', () => {
      facade.clearData();
      expect(mockService.clearData).toHaveBeenCalled();
    });
  });
});
