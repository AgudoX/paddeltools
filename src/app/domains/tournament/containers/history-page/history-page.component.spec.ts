import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HistoryPageComponent } from './history-page.component';
import { TournamentFacade } from '@domain/tournament/data-access/tournament.facade';
import { Router } from '@angular/router';
import { signal, WritableSignal } from '@angular/core';
import { Match, TournamentRecord } from '@shared/models/player.model';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

function makeRecord(id: string, overrides?: Partial<TournamentRecord>): TournamentRecord {
  return {
    id,
    createdAt: new Date().toISOString(),
    label: `Torneo ${id}`,
    config: {
      name: '',
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
    },
    matches: [],
    ...overrides,
  };
}

describe('HistoryPageComponent', () => {
  let fixture: ComponentFixture<HistoryPageComponent>;
  let component: HistoryPageComponent;
  let _history: WritableSignal<TournamentRecord[]>;
  let _currentId: WritableSignal<string | null>;
  let routerSpy: { navigate: ReturnType<typeof vi.fn> };

  function getText(selector: string): string {
    const el = fixture.nativeElement.querySelector(selector);
    return el ? el.textContent.trim() : '';
  }

  function getButtons(): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('app-floating-button button'));
  }

  function getHistoryItems(): NodeListOf<Element> {
    return fixture.nativeElement.querySelectorAll('.history-item');
  }

  beforeEach(async () => {
    _history = signal<TournamentRecord[]>([]);
    _currentId = signal<string | null>(null);
    routerSpy = { navigate: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [HistoryPageComponent, NoopAnimationsModule],
      providers: [
        { provide: Router, useValue: routerSpy },
        {
          provide: TournamentFacade,
          useValue: {
            history: _history.asReadonly(),
            currentTournamentId: _currentId.asReadonly(),
            deleteHistoryRecord: vi.fn(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HistoryPageComponent);
    component = fixture.componentRef.instance;
  });

  describe('empty state', () => {
    it('shows empty message when no history', () => {
      _history.set([]);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.empty-state')).toBeTruthy();
      expect(getText('.empty-state p')).toContain('Aún no hay torneos');
    });

    it('does not show history list when empty', () => {
      _history.set([]);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.history-list')).toBeFalsy();
    });
  });

  describe('with history records', () => {
    beforeEach(() => {
      _history.set([makeRecord('1'), makeRecord('2'), makeRecord('3')]);
      fixture.detectChanges();
    });

    it('renders record labels', () => {
      expect(getText('.history-label')).toContain('Torneo 1');
    });

    it('renders all records', () => {
      expect(getHistoryItems().length).toBe(3);
    });

    it('shows history list', () => {
      expect(fixture.nativeElement.querySelector('.history-list')).toBeTruthy();
    });

    it('shows pagination', () => {
      expect(fixture.nativeElement.querySelector('.pagination')).toBeTruthy();
    });
  });

  describe('display info', () => {
    it('shows libre mode text', () => {
      _history.set([makeRecord('1', { config: { ...makeRecord('1').config, mode: 'free' } })]);
      fixture.detectChanges();
      expect(getText('.history-info')).toContain('Libre');
    });

    it('shows fixed-pairs mode text', () => {
      _history.set([makeRecord('1', { config: { ...makeRecord('1').config, mode: 'fixed-pairs' } })]);
      fixture.detectChanges();
      expect(getText('.history-info')).toContain('Parejas fijas');
    });

    it('shows sets scoring mode text', () => {
      _history.set([makeRecord('1')]);
      fixture.detectChanges();
      expect(getText('.history-info')).toContain('Por sets');
    });

    it('shows points scoring mode text', () => {
      _history.set([makeRecord('1', { config: { ...makeRecord('1').config, scoringMode: 'points' } })]);
      fixture.detectChanges();
      expect(getText('.history-info')).toContain('Puntos directos');
    });

    it('shows classic tournament labels', () => {
      _history.set([
        makeRecord('1', {
          config: {
            type: 'classic',
            name: 'Classic',
            numberOfPlayers: 8,
            format: 'single-elimination',
            seeded: true,
            thirdPlaceMatch: false,
            pairs: [],
            players: makeRecord('1').config.players,
          } as TournamentRecord['config'],
        }),
      ]);
      fixture.detectChanges();
      expect(getText('.history-info')).toContain('Torneo clásico');
      expect(getText('.history-info')).toContain('Cuadro con siembra');
    });

    it('shows match count and player count', () => {
      const record = makeRecord('1');
      record.matches = [{ number: 1 } as Match, { number: 2 } as Match];
      record.config.players = record.config.players.slice(0, 6);
      _history.set([record]);
      fixture.detectChanges();
      const info = getText('.history-info');
      expect(info).toContain('2 partidos');
      expect(info).toContain('6 jugadores');
    });
  });

  describe('pagination', () => {
    it('defaults to page 0', () => {
      _history.set(Array.from({ length: 12 }, (_, i) => makeRecord(`${i + 1}`)));
      fixture.detectChanges();
      expect(component.page()).toBe(0);
    });

    it('shows first page of records', () => {
      const records = Array.from({ length: 12 }, (_, i) => makeRecord(`${i + 1}`));
      _history.set(records);
      fixture.detectChanges();
      expect(getHistoryItems().length).toBe(5);
    });

    it('calculates total pages', () => {
      _history.set(Array.from({ length: 12 }, (_, i) => makeRecord(`${i + 1}`)));
      fixture.detectChanges();
      expect(component.totalPages()).toBe(3);
    });

    it('disables prev on first page', () => {
      _history.set(Array.from({ length: 12 }, (_, i) => makeRecord(`${i + 1}`)));
      fixture.detectChanges();
      const buttons = getButtons();
      const prev = buttons.find(b => b.textContent.includes('Anterior'));
      expect(prev?.disabled).toBe(true);
    });

    it('navigates to next page', () => {
      _history.set(Array.from({ length: 12 }, (_, i) => makeRecord(`${i + 1}`)));
      fixture.detectChanges();
      component.nextPage();
      fixture.detectChanges();
      expect(component.page()).toBe(1);
      expect(getHistoryItems().length).toBe(5);
    });

    it('disables next on last page', () => {
      _history.set(Array.from({ length: 12 }, (_, i) => makeRecord(`${i + 1}`)));
      fixture.detectChanges();
      component.nextPage();
      component.nextPage();
      fixture.detectChanges();
      expect(component.page()).toBe(2);
      const buttons = getButtons();
      const next = buttons.find(b => b.textContent.includes('Siguiente'));
      expect(next?.disabled).toBe(true);
    });

    it('prevPage does not go below 0', () => {
      component.page.set(0);
      component.prevPage();
      expect(component.page()).toBe(0);
    });

    it('nextPage does not exceed max', () => {
      _history.set([makeRecord('1')]);
      fixture.detectChanges();
      component.nextPage();
      component.nextPage();
      expect(component.page()).toBe(0);
    });

    it('shows page info text', () => {
      _history.set(Array.from({ length: 12 }, (_, i) => makeRecord(`${i + 1}`)));
      fixture.detectChanges();
      expect(getText('.page-info')).toContain('Página 1 de 3');
    });

    it('computes currentIndex correctly', () => {
      _history.set(Array.from({ length: 7 }, (_, i) => makeRecord(`${i + 1}`)));
      fixture.detectChanges();
      expect(component.currentIndex()).toBe(0);
      component.nextPage();
      fixture.detectChanges();
      expect(component.currentIndex()).toBe(5);
    });

    it('disables both buttons when record count is 1 and totalPages is 1', () => {
      _history.set([makeRecord('1')]);
      fixture.detectChanges();
      expect(component.totalPages()).toBe(1);
      const buttons = getButtons();
      const prev = buttons.find(b => b.textContent.includes('Anterior'));
      const next = buttons.find(b => b.textContent.includes('Siguiente'));
      expect(prev?.disabled).toBe(true);
      expect(next?.disabled).toBe(true);
    });
  });

  describe('actions', () => {
    beforeEach(() => {
      _history.set([makeRecord('1')]);
      fixture.detectChanges();
    });

    it('viewTournament navigates to tournament route', () => {
      component.viewTournament('1');
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/tournament', '1']);
    });

    it('viewTournament navigates to / when record not found', () => {
      component.viewTournament('non-existent');
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
    });

    it('viewTournament navigates to classic route for classic records', () => {
      _history.set([
        makeRecord('classic-1', {
          config: {
            type: 'classic',
            name: 'Classic',
            numberOfPlayers: 8,
            format: 'single-elimination',
            seeded: true,
            thirdPlaceMatch: false,
            pairs: [],
            players: makeRecord('1').config.players,
          } as TournamentRecord['config'],
        }),
      ]);
      fixture.detectChanges();
      component.viewTournament('classic-1');
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/classic-tournament', 'classic-1']);
    });

    it('onDelete calls facade.deleteHistoryRecord', () => {
      const facade = TestBed.inject(TournamentFacade);
      component.onDelete('rec-1');
      expect(facade.deleteHistoryRecord).toHaveBeenCalledWith('rec-1');
    });

    it('backToSummary navigates to /tournament/:id when currentId exists', () => {
      _currentId.set('current-1');
      fixture.detectChanges();
      component.backToSummary();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/tournament', 'current-1']);
    });

    it('backToSummary navigates to / when no currentId', () => {
      _currentId.set(null);
      component.backToSummary();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
    });

    it('backToForm navigates to /', () => {
      component.backToForm();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
    });
  });
});
