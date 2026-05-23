import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HistoryDetailPageComponent } from './history-detail-page.component';
import { TournamentFacade } from '@domain/tournament/data-access/tournament.facade';
import { ActivatedRoute, Router } from '@angular/router';
import { TournamentRecord, Match, PlayerStats, Player } from '@shared/models/player.model';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

function makePlayer(id: number, name: string): Player {
  return { id, name, position: 'right' };
}

function makeRecord(overrides?: Partial<TournamentRecord>): TournamentRecord {
  return {
    id: 'rec-1',
    createdAt: new Date().toISOString(),
    label: 'Test Torneo',
    config: {
      name: 'Test Torneo',
      numberOfPlayers: 4,
      numberOfRounds: 2,
      mode: 'free',
      scoringMode: 'sets',
      players: [
        { id: 1, name: 'Alice', position: 'right' },
        { id: 2, name: 'Bob', position: 'backhand' },
        { id: 3, name: 'Charlie', position: 'either' },
        { id: 4, name: 'Diana', position: 'right' },
      ],
    },
    matches: [],
    ...overrides,
  };
}

function makeMatch(number: number, round: number, overrides?: Partial<Match>): Match {
  return {
    number,
    round,
    pair1: [makePlayer(1, 'Alice'), makePlayer(2, 'Bob')],
    pair2: [makePlayer(3, 'Charlie'), makePlayer(4, 'Diana')],
    scoringMode: 'sets',
    sets: [],
    ...overrides,
  };
}

describe('HistoryDetailPageComponent', () => {
  let fixture: ComponentFixture<HistoryDetailPageComponent>;
  let component: HistoryDetailPageComponent;
  let routerSpy: { navigate: ReturnType<typeof vi.fn> };
  let facadeSpy: {
    loadTournament: ReturnType<typeof vi.fn>;
    calculateStatistics: ReturnType<typeof vi.fn>;
  };
  let record: TournamentRecord;

  function getText(selector: string): string {
    const el = fixture.nativeElement.querySelector(selector);
    return el ? el.textContent.trim() : '';
  }

  function getAllText(selector: string): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll(selector))
      .map((el: unknown) => (el as Element).textContent.trim());
  }

  beforeEach(async () => {
    record = makeRecord();
    routerSpy = { navigate: vi.fn() };
    facadeSpy = {
      loadTournament: vi.fn().mockReturnValue(record),
      calculateStatistics: vi.fn().mockReturnValue([]),
    };

    await TestBed.configureTestingModule({
      imports: [HistoryDetailPageComponent, NoopAnimationsModule],
      providers: [
        { provide: Router, useValue: routerSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: vi.fn().mockReturnValue('rec-1') } },
          },
        },
        { provide: TournamentFacade, useValue: facadeSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HistoryDetailPageComponent);
    component = fixture.componentRef.instance;
  });

  describe('loading route', () => {
    it('calls loadTournament with route id', () => {
      fixture.detectChanges();
      expect(facadeSpy.loadTournament).toHaveBeenCalledWith('rec-1');
    });

    it('does not call loadTournament when no id in route', () => {
      const route = TestBed.inject(ActivatedRoute);
      (route.snapshot.paramMap.get as ReturnType<typeof vi.fn>).mockReturnValue(null);
      fixture.detectChanges();
      expect(facadeSpy.loadTournament).not.toHaveBeenCalled();
    });

    it('shows empty state when record not found', () => {
      facadeSpy.loadTournament.mockReturnValue(null);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.empty-state')).toBeTruthy();
      expect(getText('.empty-state p')).toContain('Torneo no encontrado');
    });
  });

  describe('record display', () => {
    it('renders record label', () => {
      fixture.detectChanges();
      expect(getText('.main-title')).toContain('Test Torneo');
    });

    it('shows libre mode text', () => {
      fixture.detectChanges();
      expect(getText('.header-subtitle')).toContain('Libre');
    });

    it('shows fixed-pairs mode text', () => {
      facadeSpy.loadTournament.mockReturnValue(
        makeRecord({ config: { ...makeRecord().config, mode: 'fixed-pairs' } })
      );
      component.ngOnInit();
      fixture.detectChanges();
      expect(getText('.header-subtitle')).toContain('Parejas fijas');
    });

    it('shows match count', () => {
      facadeSpy.loadTournament.mockReturnValue(
        makeRecord({ matches: [makeMatch(1, 1), makeMatch(2, 1)] })
      );
      component.ngOnInit();
      fixture.detectChanges();
      expect(getText('.header-subtitle')).toContain('2 partidos');
    });
  });

  describe('podium', () => {
    it('shows only first when 1 player', () => {
      facadeSpy.calculateStatistics.mockReturnValue([
        { player: { id: 1, name: 'Alice', position: 'right' }, matchesPlayed: 3, matchesWon: 3, setsWon: 6, setsLost: 1, pointsFor: 50, pointsAgainst: 30, difference: 20 },
      ]);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.podium-slot.first')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.podium-slot.second')).toBeFalsy();
      expect(fixture.nativeElement.querySelector('.podium-slot.third')).toBeFalsy();
    });

    it('shows first and second when 2 players', () => {
      facadeSpy.calculateStatistics.mockReturnValue([
        { player: { id: 1, name: 'Alice', position: 'right' }, matchesPlayed: 3, matchesWon: 3, setsWon: 6, setsLost: 1, pointsFor: 50, pointsAgainst: 30, difference: 20 },
        { player: { id: 2, name: 'Bob', position: 'backhand' }, matchesPlayed: 3, matchesWon: 1, setsWon: 3, setsLost: 5, pointsFor: 40, pointsAgainst: 45, difference: -5 },
      ]);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.podium-slot.first')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.podium-slot.second')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.podium-slot.third')).toBeFalsy();
    });

    it('shows full podium when 3+ players', () => {
      const stats: PlayerStats[] = [
        { player: { id: 1, name: 'Alice', position: 'right' }, matchesPlayed: 3, matchesWon: 3, setsWon: 6, setsLost: 1, pointsFor: 50, pointsAgainst: 30, difference: 20 },
        { player: { id: 2, name: 'Bob', position: 'backhand' }, matchesPlayed: 3, matchesWon: 2, setsWon: 5, setsLost: 3, pointsFor: 45, pointsAgainst: 40, difference: 5 },
        { player: { id: 3, name: 'Charlie', position: 'either' }, matchesPlayed: 3, matchesWon: 1, setsWon: 2, setsLost: 6, pointsFor: 35, pointsAgainst: 50, difference: -15 },
      ];
      facadeSpy.calculateStatistics.mockReturnValue(stats);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.podium-slot.first')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.podium-slot.second')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.podium-slot.third')).toBeTruthy();
    });

    it('renders correct names and records on podium', () => {
      const stats: PlayerStats[] = [
        { player: { id: 1, name: 'Alice', position: 'right' }, matchesPlayed: 3, matchesWon: 3, setsWon: 6, setsLost: 1, pointsFor: 50, pointsAgainst: 30, difference: 20 },
        { player: { id: 2, name: 'Bob', position: 'backhand' }, matchesPlayed: 3, matchesWon: 2, setsWon: 5, setsLost: 3, pointsFor: 45, pointsAgainst: 40, difference: 5 },
        { player: { id: 3, name: 'Charlie', position: 'either' }, matchesPlayed: 3, matchesWon: 1, setsWon: 2, setsLost: 6, pointsFor: 35, pointsAgainst: 50, difference: -15 },
      ];
      facadeSpy.calculateStatistics.mockReturnValue(stats);
      fixture.detectChanges();
      const names = getAllText('.podium-name');
      expect(names).toEqual(['Bob', 'Alice', 'Charlie']);
    });
  });

  describe('ranking table', () => {
    it('does not show table when 3 or fewer players', () => {
      const stats: PlayerStats[] = [
        { player: { id: 1, name: 'A', position: 'right' }, matchesPlayed: 2, matchesWon: 2, setsWon: 4, setsLost: 0, pointsFor: 30, pointsAgainst: 10, difference: 20 },
        { player: { id: 2, name: 'B', position: 'backhand' }, matchesPlayed: 2, matchesWon: 1, setsWon: 2, setsLost: 3, pointsFor: 25, pointsAgainst: 30, difference: -5 },
        { player: { id: 3, name: 'C', position: 'either' }, matchesPlayed: 2, matchesWon: 0, setsWon: 1, setsLost: 4, pointsFor: 20, pointsAgainst: 35, difference: -15 },
      ];
      facadeSpy.calculateStatistics.mockReturnValue(stats);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.ranking-table')).toBeFalsy();
    });

    it('shows table when 4+ players', () => {
      const stats: PlayerStats[] = [
        { player: { id: 1, name: 'A', position: 'right' }, matchesPlayed: 3, matchesWon: 3, setsWon: 6, setsLost: 1, pointsFor: 50, pointsAgainst: 30, difference: 20 },
        { player: { id: 2, name: 'B', position: 'backhand' }, matchesPlayed: 3, matchesWon: 2, setsWon: 5, setsLost: 3, pointsFor: 45, pointsAgainst: 40, difference: 5 },
        { player: { id: 3, name: 'C', position: 'either' }, matchesPlayed: 3, matchesWon: 1, setsWon: 2, setsLost: 6, pointsFor: 35, pointsAgainst: 50, difference: -15 },
        { player: { id: 4, name: 'D', position: 'right' }, matchesPlayed: 3, matchesWon: 0, setsWon: 1, setsLost: 6, pointsFor: 30, pointsAgainst: 55, difference: -25 },
      ];
      facadeSpy.calculateStatistics.mockReturnValue(stats);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.ranking-table')).toBeTruthy();
      const rows = fixture.nativeElement.querySelectorAll('.ranking-table tbody tr');
      expect(rows.length).toBe(1);
      expect(rows[0].textContent).toContain('D');
    });
  });

  describe('matches display', () => {
    it('groups matches by round', () => {
      record.matches = [
        makeMatch(1, 1),
        makeMatch(2, 1),
        makeMatch(3, 2),
      ];
      fixture.detectChanges();
      expect(component.rounds).toEqual([1, 2]);
      expect(component.matchesByRound.get(1)?.length).toBe(2);
      expect(component.matchesByRound.get(2)?.length).toBe(1);
    });

    it('shows round titles', () => {
      record.matches = [
        makeMatch(1, 1, { pair1: [makePlayer(1, 'Alice'), makePlayer(2, 'Bob')], pair2: [makePlayer(3, 'Charlie'), makePlayer(4, 'Diana')] }),
      ];
      fixture.detectChanges();
      expect(getText('.round-title')).toContain('Ronda 1');
      expect(getText('.round-info')).toContain('1 partido(s)');
    });

    it('shows match cards for each round', () => {
      record.matches = [
        makeMatch(1, 1),
        makeMatch(2, 1),
        makeMatch(3, 2),
      ];
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('.match-card').length).toBe(3);
    });

    it('renders player names in match', () => {
      record.matches = [
        makeMatch(1, 1, { pair1: [makePlayer(1, 'Alice'), makePlayer(2, 'Bob')] }),
      ];
      fixture.detectChanges();
      expect(getText('.match-card')).toContain('Alice');
      expect(getText('.match-card')).toContain('Bob');
    });
  });

  describe('match display for sets mode', () => {
    it('shows set scores', () => {
      record.matches = [
        makeMatch(1, 1, {
          scoringMode: 'sets',
          sets: [
            { pair1Games: 6, pair2Games: 4 },
            { pair1Games: 3, pair2Games: 6 },
            { pair1Games: 7, pair2Games: 6 },
          ],
        }),
      ];
      fixture.detectChanges();
      const badges = fixture.nativeElement.querySelectorAll('.set-score-badge');
      expect(badges.length).toBe(6);
    });

    it('shows dash when sets is empty in sets mode', () => {
      record.matches = [
        makeMatch(1, 1, { scoringMode: 'sets', sets: [] }),
      ];
      fixture.detectChanges();
      const empties = fixture.nativeElement.querySelectorAll('.sets-empty');
      expect(empties.length).toBe(2);
    });

    it('shows dash when sets is empty', () => {
      record.matches = [
        makeMatch(1, 1, { scoringMode: 'sets', sets: [] }),
      ];
      fixture.detectChanges();
      expect(getText('.match-card')).toContain('-');
    });
  });

  describe('match display for points mode', () => {
    it('shows scorePair1 and scorePair2', () => {
      record.matches = [
        makeMatch(1, 1, { scoringMode: 'points', scorePair1: 10, scorePair2: 8, sets: [] }),
      ];
      fixture.detectChanges();
      const points = fixture.nativeElement.querySelectorAll('.points');
      expect(points.length).toBe(2);
      expect(points[0].textContent).toContain('10');
      expect(points[1].textContent).toContain('8');
    });

    it('hides undefined score', () => {
      record.matches = [
        makeMatch(1, 1, { scoringMode: 'points', scorePair1: undefined, scorePair2: undefined, sets: [] }),
      ];
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('.points').length).toBe(0);
    });
  });

  describe('winner display', () => {
    it('shows winner banner when match has winner (sets)', () => {
      record.matches = [
        makeMatch(1, 1, {
          scoringMode: 'sets',
          sets: [
            { pair1Games: 6, pair2Games: 4 },
            { pair1Games: 6, pair2Games: 3 },
          ],
        }),
      ];
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.winner-banner')).toBeTruthy();
      expect(getText('.winner-banner')).toContain('Alice');
    });

    it('shows winner banner when match has winner (points)', () => {
      record.matches = [
        makeMatch(1, 1, { scoringMode: 'points', scorePair1: 10, scorePair2: 4, sets: [] }),
      ];
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.winner-banner')).toBeTruthy();
    });

    it('does not show winner banner when no winner', () => {
      record.matches = [
        makeMatch(1, 1, { scoringMode: 'points', scorePair1: 5, scorePair2: 5, sets: [] }),
      ];
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.winner-banner')).toBeFalsy();
    });
  });

  describe('matchWinner method', () => {
    it('returns pair1 when pair1 wins in sets', () => {
      const match = makeMatch(1, 1, { sets: [{ pair1Games: 6, pair2Games: 4 }, { pair1Games: 6, pair2Games: 3 }] });
      expect(component.matchWinner(match)).toBe('pair1');
    });

    it('returns pair2 when pair2 wins in points', () => {
      const match = makeMatch(1, 1, { scoringMode: 'points', scorePair1: 4, scorePair2: 10, sets: [] });
      fixture.detectChanges();
      expect(component.matchWinner(match)).toBe('pair2');
    });

    it('returns null for tie in points', () => {
      const match = makeMatch(1, 1, { scoringMode: 'points', scorePair1: 5, scorePair2: 5, sets: [] });
      fixture.detectChanges();
      expect(component.matchWinner(match)).toBeNull();
    });

    it('returns null when no sets completed', () => {
      const match = makeMatch(1, 1, { sets: [{ pair1Games: 2, pair2Games: 3 }] });
      fixture.detectChanges();
      expect(component.matchWinner(match)).toBeNull();
    });
  });

  describe('hasWinner method', () => {
    it('returns true when a set match is complete', () => {
      const match = makeMatch(1, 1, { sets: [{ pair1Games: 6, pair2Games: 4 }, { pair1Games: 6, pair2Games: 3 }] });
      expect(component.hasWinner(match)).toBe(true);
    });

    it('returns false when set match is incomplete', () => {
      const match = makeMatch(1, 1, { sets: [{ pair1Games: 2, pair2Games: 3 }] });
      expect(component.hasWinner(match)).toBe(false);
    });

    it('returns true for points match with winner', () => {
      const match = makeMatch(1, 1, { scoringMode: 'points', scorePair1: 10, scorePair2: 4, sets: [] });
      fixture.detectChanges();
      expect(component.hasWinner(match)).toBe(true);
    });

    it('returns false for points match without scores', () => {
      const match = makeMatch(1, 1, { scoringMode: 'points', sets: [] });
      fixture.detectChanges();
      expect(component.hasWinner(match)).toBe(false);
    });
  });

  describe('getWinners method', () => {
    it('returns pair1 names for sets winner', () => {
      const match = makeMatch(1, 1, { sets: [{ pair1Games: 6, pair2Games: 4 }, { pair1Games: 6, pair2Games: 3 }] });
      expect(component.getWinners(match)).toBe('Alice & Bob');
    });

    it('returns pair2 names for points winner', () => {
      const match = makeMatch(1, 1, { scoringMode: 'points', scorePair1: 4, scorePair2: 10, sets: [] });
      fixture.detectChanges();
      expect(component.getWinners(match)).toBe('Charlie & Diana');
    });

    it('returns empty for no winner in sets', () => {
      const match = makeMatch(1, 1, { sets: [{ pair1Games: 2, pair2Games: 3 }] });
      expect(component.getWinners(match)).toBe('');
    });

    it('returns empty for no winner in points', () => {
      const match = makeMatch(1, 1, { scoringMode: 'points', sets: [] });
      fixture.detectChanges();
      expect(component.getWinners(match)).toBe('');
    });
  });

  describe('getMatchScoreDisplay method', () => {
    it('returns set scores for completed sets match', () => {
      const match = makeMatch(1, 1, { sets: [{ pair1Games: 6, pair2Games: 4 }, { pair1Games: 6, pair2Games: 3 }] });
      expect(component.getMatchScoreDisplay(match)).toBe('2-0');
    });

    it('returns empty string for incomplete sets match', () => {
      const match = makeMatch(1, 1, { sets: [{ pair1Games: 2, pair2Games: 3 }] });
      expect(component.getMatchScoreDisplay(match)).toBe('');
    });

    it('returns score pair for points match', () => {
      const match = makeMatch(1, 1, { scoringMode: 'points', scorePair1: 10, scorePair2: 8, sets: [] });
      fixture.detectChanges();
      expect(component.getMatchScoreDisplay(match)).toBe('10-8');
    });
  });

  describe('trackMatch and trackSet', () => {
    it('trackMatch returns match number', () => {
      expect(component.trackMatch({ number: 42 } as Match)).toBe(42);
    });

    it('trackSet returns index', () => {
      expect(component.trackSet(7)).toBe(7);
    });
  });

  describe('backToHistory', () => {
    it('navigates to /history', () => {
      component.backToHistory();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/history']);
    });
  });

  describe('groupMatchesByRound edge cases', () => {
    it('returns early when record is null', () => {
      component.record = null;
      component.groupMatchesByRound();
      expect(component.rounds).toEqual([]);
    });

    it('sorts rounds in ascending order', () => {
      component.record = makeRecord({ matches: [makeMatch(1, 3), makeMatch(2, 1), makeMatch(3, 2)] });
      component.groupMatchesByRound();
      expect(component.rounds).toEqual([1, 2, 3]);
    });
  });

  describe('podium diff display', () => {
    it('shows positive sets diff with plus sign', () => {
      facadeSpy.calculateStatistics.mockReturnValue([
        { player: { id: 1, name: 'Alice', position: 'right' }, matchesPlayed: 3, matchesWon: 3, setsWon: 6, setsLost: 1, pointsFor: 50, pointsAgainst: 30, difference: 20 },
      ]);
      fixture.detectChanges();
      const diffSpans = fixture.nativeElement.querySelectorAll('.podium-slot.first .diff-label + span');
      expect(diffSpans[1].textContent).toContain('+20');
    });
  });

  describe('empty match number edge case', () => {
    it('renders match number correctly', () => {
      record.matches = [makeMatch(5, 1)];
      fixture.detectChanges();
      expect(getText('.match-number')).toContain('Partido 5');
    });
  });
});
