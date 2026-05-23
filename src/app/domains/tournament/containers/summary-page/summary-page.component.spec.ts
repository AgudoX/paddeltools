import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SummaryPageComponent } from './summary-page.component';
import { TournamentFacade } from '@domain/tournament/data-access/tournament.facade';
import { NotificationService } from '@shared/services/notification.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Match, PlayerStats } from '@shared/models/player.model';
import { signal, WritableSignal, Signal } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

function makeMatch(number: number, round: number, overrides?: Partial<Match>): Match {
  return {
    number,
    round,
    pair1: [
      { id: 1, name: 'Alice', position: 'right' },
      { id: 2, name: 'Bob', position: 'backhand' },
    ],
    pair2: [
      { id: 3, name: 'Charlie', position: 'either' },
      { id: 4, name: 'Diana', position: 'right' },
    ],
    scoringMode: 'sets',
    sets: [],
    ...overrides,
  };
}

function makeStats(overrides?: Partial<PlayerStats>): PlayerStats {
  return {
    player: { id: 1, name: 'Alice', position: 'right' },
    matchesPlayed: 3,
    matchesWon: 2,
    setsWon: 5,
    setsLost: 3,
    pointsFor: 60,
    pointsAgainst: 45,
    difference: 15,
    ...overrides,
  };
}

describe('SummaryPageComponent', () => {
  let fixture: ComponentFixture<SummaryPageComponent>;
  let component: SummaryPageComponent;
  let _matches: WritableSignal<Match[]>;
  let routerSpy: { navigate: ReturnType<typeof vi.fn> };
  let notificationSpy: {
    showSuccess: ReturnType<typeof vi.fn>;
    showError: ReturnType<typeof vi.fn>;
  };
  let facadeSpy: {
    matches: Signal<Match[]>;
    loadTournament: ReturnType<typeof vi.fn>;
    calculateStatistics: ReturnType<typeof vi.fn>;
    generateSummary: ReturnType<typeof vi.fn>;
    updateScore: ReturnType<typeof vi.fn>;
    updateSetScores: ReturnType<typeof vi.fn>;
  };
  let clipboardSpy: { writeText: ReturnType<typeof vi.fn> };
  let windowOpenSpy: ReturnType<typeof vi.fn>;

  function getText(selector: string): string {
    const el = fixture.nativeElement.querySelector(selector);
    return el ? el.textContent.trim() : '';
  }

  function getAllText(selector: string): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll(selector))
      .map((el: unknown) => (el as Element).textContent.trim());
  }

  beforeEach(async () => {
    _matches = signal<Match[]>([]);
    routerSpy = { navigate: vi.fn() };
    notificationSpy = { showSuccess: vi.fn(), showError: vi.fn() };
    facadeSpy = {
      matches: _matches.asReadonly(),
      loadTournament: vi.fn(),
      calculateStatistics: vi.fn().mockReturnValue([]),
      generateSummary: vi.fn().mockReturnValue('summary text'),
      updateScore: vi.fn(),
      updateSetScores: vi.fn(),
    };
    clipboardSpy = { writeText: vi.fn().mockResolvedValue(undefined) };
    Object.defineProperty(navigator, 'clipboard', {
      value: clipboardSpy,
      configurable: true,
      writable: true,
    });
    windowOpenSpy = vi.fn();
  });

  async function createComponent(matches: Match[] = [], routeId: string | null = 'test-1') {
    _matches.set(matches);
    await TestBed.configureTestingModule({
      imports: [SummaryPageComponent, NoopAnimationsModule],
      providers: [
        { provide: Router, useValue: routerSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: vi.fn().mockReturnValue(routeId) } },
          },
        },
        { provide: TournamentFacade, useValue: facadeSpy },
        { provide: NotificationService, useValue: notificationSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SummaryPageComponent);
    component = fixture.componentRef.instance;
    fixture.detectChanges();
  }

  describe('ngOnInit', () => {
    it('loads tournament and reads matches', async () => {
      await createComponent([makeMatch(1, 1)]);
      expect(facadeSpy.loadTournament).toHaveBeenCalledWith('test-1');
      expect(component.matches.length).toBe(1);
    });

    it('navigates to / when no matches', async () => {
      await createComponent();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
    });

    it('does not load tournament when no route param', async () => {
      _matches.set([makeMatch(1, 1)]);
      await TestBed.configureTestingModule({
        imports: [SummaryPageComponent, NoopAnimationsModule],
        providers: [
          { provide: Router, useValue: routerSpy },
          {
            provide: ActivatedRoute,
            useValue: {
              snapshot: { paramMap: { get: vi.fn().mockReturnValue(null) } },
            },
          },
          { provide: TournamentFacade, useValue: facadeSpy },
          { provide: NotificationService, useValue: notificationSpy },
        ],
      }).compileComponents();
      fixture = TestBed.createComponent(SummaryPageComponent);
      component = fixture.componentRef.instance;
      fixture.detectChanges();
      expect(facadeSpy.loadTournament).not.toHaveBeenCalled();
    });
  });

  describe('matches and rounds', () => {
    beforeEach(async () => {
      await createComponent([
        makeMatch(1, 1),
        makeMatch(2, 1),
        makeMatch(3, 2),
      ]);
    });

    it('groups matches by round', () => {
      expect(component.rounds).toEqual([1, 2]);
      expect(component.matchesByRound.get(1)?.length).toBe(2);
      expect(component.matchesByRound.get(2)?.length).toBe(1);
    });

    it('renders round titles', () => {
      expect(getText('.round-title')).toContain('Ronda 1');
    });

    it('renders match cards', () => {
      expect(fixture.nativeElement.querySelectorAll('.match-card').length).toBe(3);
    });
  });

  describe('actions', () => {
    beforeEach(async () => {
      await createComponent([makeMatch(1, 1)]);
    });

    it('backToForm navigates to /', () => {
      component.backToForm();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
    });

    it('goToHistory navigates to /history', () => {
      component.goToHistory();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/history']);
    });

    it('copySummary calls clipboard', async () => {
      component.copySummary();
      await Promise.resolve();
      expect(facadeSpy.generateSummary).toHaveBeenCalledWith(component.matches);
      expect(clipboardSpy.writeText).toHaveBeenCalledWith('summary text');
      expect(notificationSpy.showSuccess).toHaveBeenCalledWith('Resumen copiado al portapapeles');
    });

    it('copySummary shows error on clipboard failure', async () => {
      clipboardSpy.writeText.mockRejectedValue(new Error('fail'));
      component.copySummary();
      await new Promise(r => setTimeout(r, 0));
      expect(notificationSpy.showError).toHaveBeenCalled();
    });

    it('shareWhatsApp opens blank', () => {
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      component.shareWhatsApp();
      expect(openSpy).toHaveBeenCalledWith(
        expect.stringContaining('https://wa.me/'),
        '_blank',
      );
    });
  });

  describe('toggleStatistics', () => {
    beforeEach(async () => {
      await createComponent([makeMatch(1, 1)]);
    });

    it('toggles showStatistics', () => {
      expect(component.showStatistics).toBe(false);
      component.toggleStatistics();
      expect(component.showStatistics).toBe(true);
      component.toggleStatistics();
      expect(component.showStatistics).toBe(false);
    });

    it('updates statistics when showing', () => {
      facadeSpy.calculateStatistics.mockReturnValue([makeStats()]);
      component.toggleStatistics();
      expect(facadeSpy.calculateStatistics).toHaveBeenCalled();
      expect(component.statistics.length).toBe(1);
    });

    it('closes the mobile menu when toggling statistics', () => {
      component.showMobileMenu = true;
      component.toggleStatistics();
      expect(component.showMobileMenu).toBe(false);
    });
  });

  describe('statistics display', () => {
    it('populates statistics when ranking is enabled', async () => {
      facadeSpy.calculateStatistics.mockReturnValue([makeStats()]);
      await createComponent([makeMatch(1, 1)]);
      component.showStatistics = true;
      component.updateStatistics();
      expect(component.showStatistics).toBe(true);
      expect(component.statistics).toHaveLength(1);
    });

    it('keeps a single ranked entry when only one player stat exists', async () => {
      facadeSpy.calculateStatistics.mockReturnValue([makeStats()]);
      await createComponent([makeMatch(1, 1)]);
      component.showStatistics = true;
      component.updateStatistics();
      expect(component.statistics).toHaveLength(1);
      expect(component.statistics[0].player.name).toBe('Alice');
    });

    it('keeps all ranking rows when 4+ players exist', async () => {
      const stats: PlayerStats[] = [
        makeStats({ player: { id: 1, name: 'A', position: 'right' } }),
        makeStats({ player: { id: 2, name: 'B', position: 'backhand' } }),
        makeStats({ player: { id: 3, name: 'C', position: 'either' } }),
        makeStats({ player: { id: 4, name: 'D', position: 'right' } }),
      ];
      facadeSpy.calculateStatistics.mockReturnValue(stats);
      await createComponent([makeMatch(1, 1)]);
      component.showStatistics = true;
      component.updateStatistics();
      expect(component.statistics).toHaveLength(4);
      expect(component.statistics.slice(3)).toHaveLength(1);
    });
  });

  describe('editScore / saveScore / clearEdit', () => {
    let match: Match;

    beforeEach(async () => {
      match = makeMatch(1, 1, {
        scoringMode: 'sets',
        sets: [{ pair1Games: 6, pair2Games: 4 }],
      });
      await createComponent([match]);
    });

    it('enters edit mode for given match', () => {
      component.editScore(1);
      expect(component.editingMatch).toBe(1);
      expect(match.sets.length).toBe(3);
    });

    it('does nothing for non-existent match', () => {
      component.editScore(999);
      expect(component.editingMatch).toBeNull();
    });

    it('saves sets score and updates statistics', () => {
      component.editingMatch = 1;
      component.saveScore(match);
      expect(facadeSpy.updateSetScores).toHaveBeenCalledWith(1, match.sets);
      expect(component.editingMatch).toBeNull();
      expect(facadeSpy.calculateStatistics).toHaveBeenCalled();
    });

    it('validates at least one set with score', () => {
      match.sets = [{ pair1Games: 0, pair2Games: 0 }];
      fixture.detectChanges();
      component.editingMatch = 1;
      component.saveScore(match);
      expect(notificationSpy.showError).toHaveBeenCalled();
      expect(facadeSpy.updateSetScores).not.toHaveBeenCalled();
    });

    it('clears edit and restores original scores', () => {
      component.editScore(1);
      match.sets[0].pair1Games = 999;
      component.clearEdit();
      expect(component.editingMatch).toBeNull();
      expect(match.sets[0].pair1Games).toBe(6);
    });
  });

  describe('saveScore in points mode', () => {
    let match: Match;

    beforeEach(async () => {
      match = makeMatch(1, 1, {
        scoringMode: 'points',
        sets: [],
        scorePair1: 10,
        scorePair2: 7,
      });
      await createComponent([match]);
    });

    it('saves points score', () => {
      component.editingMatch = 1;
      component.saveScore(match);
      expect(facadeSpy.updateScore).toHaveBeenCalledWith(1, 10, 7);
      expect(component.editingMatch).toBeNull();
    });

    it('validates minimum 2 point difference', () => {
      match.scorePair1 = 5;
      match.scorePair2 = 5;
      fixture.detectChanges();
      component.editingMatch = 1;
      component.saveScore(match);
      expect(notificationSpy.showError).toHaveBeenCalled();
      expect(facadeSpy.updateScore).not.toHaveBeenCalled();
    });

    it('rejects undefined scores because they resolve to an invalid tied result', () => {
      match.scorePair1 = undefined;
      match.scorePair2 = undefined;
      fixture.detectChanges();
      component.editingMatch = 1;
      component.saveScore(match);
      expect(notificationSpy.showError).toHaveBeenCalled();
      expect(facadeSpy.updateScore).not.toHaveBeenCalled();
    });
  });

  describe('matchWinner', () => {
    it('returns pair1 when pair1 wins in sets', () => {
      const match = makeMatch(1, 1, {
        sets: [
          { pair1Games: 6, pair2Games: 4 },
          { pair1Games: 6, pair2Games: 3 },
        ],
      });
      expect(component.matchWinner(match)).toBe('pair1');
    });

    it('returns pair2 when pair2 wins in points', () => {
      const match = makeMatch(1, 1, {
        scoringMode: 'points',
        sets: [],
        scorePair1: 4,
        scorePair2: 10,
      });
      expect(component.matchWinner(match)).toBe('pair2');
    });

    it('returns null for tie in points', () => {
      const match = makeMatch(1, 1, {
        scoringMode: 'points',
        sets: [],
        scorePair1: 5,
        scorePair2: 5,
      });
      expect(component.matchWinner(match)).toBeNull();
    });
  });

  describe('hasWinner', () => {
    it('returns true for completed set match', () => {
      const match = makeMatch(1, 1, {
        sets: [
          { pair1Games: 6, pair2Games: 4 },
          { pair1Games: 6, pair2Games: 3 },
        ],
      });
      expect(component.hasWinner(match)).toBe(true);
    });

    it('returns false for incomplete set match', () => {
      const match = makeMatch(1, 1, {
        sets: [{ pair1Games: 2, pair2Games: 3 }],
      });
      expect(component.hasWinner(match)).toBe(false);
    });

    it('returns false for points match without scores', () => {
      const match = makeMatch(1, 1, { scoringMode: 'points', sets: [] });
      expect(component.hasWinner(match)).toBe(false);
    });
  });

  describe('getWinners', () => {
    it('returns pair1 names for sets winner', () => {
      const match = makeMatch(1, 1, {
        sets: [
          { pair1Games: 6, pair2Games: 4 },
          { pair1Games: 6, pair2Games: 3 },
        ],
      });
      expect(component.getWinners(match)).toBe('Alice & Bob');
    });

    it('returns pair2 names for points winner', () => {
      const match = makeMatch(1, 1, {
        scoringMode: 'points',
        sets: [],
        scorePair1: 4,
        scorePair2: 10,
      });
      expect(component.getWinners(match)).toBe('Charlie & Diana');
    });

    it('returns empty for no winner', () => {
      const match = makeMatch(1, 1, { sets: [{ pair1Games: 2, pair2Games: 3 }] });
      expect(component.getWinners(match)).toBe('');
    });
  });

  describe('getMatchScoreDisplay', () => {
    it('returns set score for completed sets match', () => {
      const match = makeMatch(1, 1, {
        sets: [
          { pair1Games: 6, pair2Games: 4 },
          { pair1Games: 6, pair2Games: 3 },
        ],
      });
      expect((component as any).getMatchScoreDisplay(match)).toBe('2-0');
    });

    it('returns empty string for incomplete sets match', () => {
      const match = makeMatch(1, 1, { sets: [{ pair1Games: 2, pair2Games: 3 }] });
      expect((component as any).getMatchScoreDisplay(match)).toBe('');
    });

    it('returns score pair for points match', () => {
      const match = makeMatch(1, 1, {
        scoringMode: 'points',
        sets: [],
        scorePair1: 10,
        scorePair2: 8,
      });
      expect((component as any).getMatchScoreDisplay(match)).toBe('10-8');
    });

    it('returns inverse set score when pair2 wins two sets', () => {
      const match = makeMatch(1, 1, {
        sets: [
          { pair1Games: 4, pair2Games: 6 },
          { pair1Games: 3, pair2Games: 6 },
        ],
      });
      expect((component as any).getMatchScoreDisplay(match)).toBe('0-2');
    });
  });

  describe('shouldShowSet', () => {
    it('always shows first set', () => {
      const match = makeMatch(1, 1, { sets: [{ pair1Games: 0, pair2Games: 0 }] });
      expect((component as any).shouldShowSet(match, 0)).toBe(true);
    });

    it('shows set 2 if set 1 is complete', () => {
      const match = makeMatch(1, 1, {
        sets: [
          { pair1Games: 6, pair2Games: 4 },
          { pair1Games: 0, pair2Games: 0 },
        ],
      });
      expect((component as any).shouldShowSet(match, 1)).toBe(true);
    });

    it('shows set 3 if sets are split (tiebreak)', () => {
      const match = makeMatch(1, 1, {
        sets: [
          { pair1Games: 6, pair2Games: 4 },
          { pair1Games: 4, pair2Games: 6 },
          { pair1Games: 0, pair2Games: 0 },
        ],
      });
      expect((component as any).shouldShowSet(match, 2)).toBe(true);
    });

    it('does not show set 3 when same player won first two', () => {
      const match = makeMatch(1, 1, {
        sets: [
          { pair1Games: 6, pair2Games: 4 },
          { pair1Games: 6, pair2Games: 3 },
          { pair1Games: 0, pair2Games: 0 },
        ],
      });
      expect((component as any).shouldShowSet(match, 2)).toBe(false);
    });

    it('shows set 3 if it has data even when same player won first two', () => {
      const match = makeMatch(1, 1, {
        sets: [
          { pair1Games: 6, pair2Games: 4 },
          { pair1Games: 6, pair2Games: 3 },
          { pair1Games: 1, pair2Games: 0 },
        ],
      });
      expect((component as any).shouldShowSet(match, 2)).toBe(true);
    });

    it('returns false for out of bounds index', () => {
      const match = makeMatch(1, 1, { sets: [{ pair1Games: 0, pair2Games: 0 }] });
      expect((component as any).shouldShowSet(match, 5)).toBe(false);
    });

    it('shows the current set when the previous one is incomplete but current has data', () => {
      const match = makeMatch(1, 1, {
        sets: [
          { pair1Games: 5, pair2Games: 5 },
          { pair1Games: 1, pair2Games: 0 },
        ],
      });
      expect((component as any).shouldShowSet(match, 1)).toBe(true);
    });
  });

  describe('copyRanking', () => {
    beforeEach(async () => {
      await createComponent([makeMatch(1, 1)]);
      facadeSpy.calculateStatistics.mockReturnValue([makeStats()]);
      component.toggleStatistics();
      notificationSpy.showSuccess.mockClear();
    });

    it('copies ranking to clipboard', async () => {
      component.copyRanking();
      await Promise.resolve();
      expect(clipboardSpy.writeText).toHaveBeenCalled();
      expect(notificationSpy.showSuccess).toHaveBeenCalledWith('Ranking copiado al portapapeles');
    });

    it('shows error on clipboard failure', async () => {
      clipboardSpy.writeText.mockRejectedValue(new Error('fail'));
      component.copyRanking();
      await new Promise(r => setTimeout(r, 0));
      expect(notificationSpy.showError).toHaveBeenCalled();
    });
  });

  describe('shareRankingWhatsApp', () => {
    beforeEach(async () => {
      await createComponent([makeMatch(1, 1)]);
      facadeSpy.calculateStatistics.mockReturnValue([makeStats()]);
      component.toggleStatistics();
    });

    it('opens whatsapp with ranking text', () => {
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      component.shareRankingWhatsApp();
      expect(openSpy).toHaveBeenCalledWith(
        expect.stringContaining('https://wa.me/'),
        '_blank',
      );
    });
  });

  describe('toggleMobileMenu', () => {
    it('toggles the mobile menu state', async () => {
      await createComponent([makeMatch(1, 1)]);
      expect(component.showMobileMenu).toBe(false);
      component.toggleMobileMenu();
      expect(component.showMobileMenu).toBe(true);
      component.toggleMobileMenu();
      expect(component.showMobileMenu).toBe(false);
    });
  });

  describe('track functions', () => {
    it('trackMatch returns match number', () => {
      expect(component.trackMatch(0, { number: 42 } as Match)).toBe(42);
    });

    it('trackRound returns round', () => {
      expect(component.trackRound(3)).toBe(3);
    });

    it('trackSet returns index', () => {
      expect(component.trackSet(7)).toBe(7);
    });
  });

  describe('podium diff display', () => {
    it('preserves negative point diff in ranking data', async () => {
      facadeSpy.calculateStatistics.mockReturnValue([
        makeStats({ pointsFor: 30, pointsAgainst: 50, difference: -20 }),
      ]);
      await createComponent([makeMatch(1, 1)]);
      component.showStatistics = true;
      component.updateStatistics();
      expect(component.statistics[0].difference).toBe(-20);
    });
  });
});
