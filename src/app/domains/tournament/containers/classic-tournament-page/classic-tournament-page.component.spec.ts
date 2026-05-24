import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ClassicTournamentPageComponent } from './classic-tournament-page.component';
import { TournamentFacade } from '@domain/tournament/data-access/tournament.facade';
import { NotificationService } from '@shared/services/notification.service';
import { Match, SetScore, TournamentRecord } from '@shared/models/player.model';
import { TournamentPdfService } from '@domain/tournament/data-access/infrastructure/tournament-pdf.service';
import { signal } from '@angular/core';

function makeClassicRecord(): TournamentRecord {
  return {
    id: 'classic-1',
    createdAt: new Date().toISOString(),
    label: 'Classic One',
    config: {
      type: 'classic',
      name: 'Classic One',
      numberOfPlayers: 8,
      format: 'single-elimination',
      seeded: true,
      thirdPlaceMatch: false,
      pairs: [
        {
          id: 1,
          player1: { id: 1, name: 'Ana', position: 'right', pairId: 1 },
          player2: { id: 2, name: 'Bea', position: 'backhand', pairId: 1 },
        },
        {
          id: 2,
          player1: { id: 3, name: 'Carla', position: 'right', pairId: 2 },
          player2: { id: 4, name: 'Dani', position: 'backhand', pairId: 2 },
        },
      ],
      players: [
        { id: 1, name: 'Ana', position: 'right', pairId: 1 },
        { id: 2, name: 'Bea', position: 'backhand', pairId: 1 },
        { id: 3, name: 'Carla', position: 'right', pairId: 2 },
        { id: 4, name: 'Dani', position: 'backhand', pairId: 2 },
      ],
    },
    matches: [
      {
        number: 1,
        round: 1,
        pair1: [
          { id: 1, name: 'Ana', position: 'right', pairId: 1 },
          { id: 2, name: 'Bea', position: 'backhand', pairId: 1 },
        ],
        pair2: [
          { id: 3, name: 'Carla', position: 'right', pairId: 2 },
          { id: 4, name: 'Dani', position: 'backhand', pairId: 2 },
        ],
        scoringMode: 'sets',
        sets: [],
        completed: false,
      },
    ],
  };
}

describe('ClassicTournamentPageComponent', () => {
  let fixture: ComponentFixture<ClassicTournamentPageComponent>;
  let component: ClassicTournamentPageComponent;
  let routerSpy: { navigate: ReturnType<typeof vi.fn> };
  let matchesSignal: ReturnType<typeof signal>;
  let facadeSpy: {
    loadTournament: ReturnType<typeof vi.fn>;
    updateClassicMatchWinner: ReturnType<typeof vi.fn>;
    clearClassicMatchResult: ReturnType<typeof vi.fn>;
    updateSetScores: ReturnType<typeof vi.fn>;
    matches: ReturnType<typeof signal>;
  };
  let notificationSpy: {
    showSuccess: ReturnType<typeof vi.fn>;
    showError: ReturnType<typeof vi.fn>;
  };
  let pdfSpy: { exportClassicBracket: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    routerSpy = { navigate: vi.fn() };
    matchesSignal = signal(makeClassicRecord().matches);
    facadeSpy = {
      loadTournament: vi.fn().mockReturnValue(makeClassicRecord()),
      updateClassicMatchWinner: vi.fn(),
      clearClassicMatchResult: vi.fn(),
      updateSetScores: vi.fn(),
      matches: matchesSignal.asReadonly(),
    };
    notificationSpy = { showSuccess: vi.fn(), showError: vi.fn() };
    pdfSpy = { exportClassicBracket: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [ClassicTournamentPageComponent, NoopAnimationsModule],
      providers: [
        { provide: Router, useValue: routerSpy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: vi.fn().mockReturnValue('classic-1') } } },
        },
        { provide: TournamentFacade, useValue: facadeSpy },
        { provide: NotificationService, useValue: notificationSpy },
        { provide: TournamentPdfService, useValue: pdfSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ClassicTournamentPageComponent);
    component = fixture.componentRef.instance;
  });

  it('loads the classic tournament record', () => {
    fixture.detectChanges();
    expect(facadeSpy.loadTournament).toHaveBeenCalledWith('classic-1');
    expect(component.config?.type).toBe('classic');
  });

  it('renders pairs and bracket title', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Parejas participantes');
    expect(fixture.nativeElement.textContent).toContain('Ana');
    expect(fixture.nativeElement.textContent).toContain('Cuadro del torneo');
  });

  it('exports the classic bracket PDF from the couples view', () => {
    fixture.detectChanges();
    component.exportPdf();
    expect(pdfSpy.exportClassicBracket).toHaveBeenCalledOnce();
    expect(pdfSpy.exportClassicBracket).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'classic', name: 'Classic One' }),
      expect.any(Array),
      'Classic One',
    );
    expect(notificationSpy.showSuccess).toHaveBeenCalledWith(
      'Descargando PDF del torneo',
    );
  });

  it('shows an error if the PDF export fails', () => {
    pdfSpy.exportClassicBracket.mockImplementation(() => { throw new Error('blocked'); });

    fixture.detectChanges();
    component.exportPdf();

    expect(notificationSpy.showError).toHaveBeenCalledWith(
      'No se pudo preparar el PDF del torneo',
    );
  });

  it('resolves a match and refreshes the bracket', () => {
    fixture.detectChanges();
    component.resolveMatch(1, 'pair1');
    expect(facadeSpy.updateClassicMatchWinner).toHaveBeenCalledWith(1, 'pair1');
    expect(notificationSpy.showSuccess).toHaveBeenCalledWith('Cuadro actualizado');
  });

  it('reverts a resolved match result', () => {
    fixture.detectChanges();
    component.revertMatch(1);
    expect(facadeSpy.clearClassicMatchResult).toHaveBeenCalledWith(1);
    expect(notificationSpy.showSuccess).toHaveBeenCalledWith('Resultado revertido');
  });

  it('saves edited set scores for a classic match', () => {
    fixture.detectChanges();
    component.startMatchEdit(1);
    const sets: SetScore[] = [
      { pair1Games: 6, pair2Games: 4 },
      { pair1Games: 6, pair2Games: 3 },
      { pair1Games: 0, pair2Games: 0 },
    ];
    component.editableSets[1] = sets;

    component.saveMatchEdit(component.matches[0]);

    expect(facadeSpy.updateSetScores).toHaveBeenCalledWith(1, sets);
    expect(notificationSpy.showSuccess).toHaveBeenCalledWith(
      'Resultado guardado y cuadro recalculado',
    );
  });

  it('redirects to / when no id in route', () => {
    const route = TestBed.inject(ActivatedRoute);
    (route.snapshot.paramMap.get as ReturnType<typeof vi.fn>).mockReturnValue(null);
    fixture.detectChanges();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
  });

  it('sets config to null when record type is not classic', () => {
    facadeSpy.loadTournament.mockReturnValue({ ...makeClassicRecord(), config: { ...makeClassicRecord().config, type: 'americano' } });
    fixture.detectChanges();
    expect(component.config).toBeNull();
  });

  it('sets config to null when record is null', () => {
    facadeSpy.loadTournament.mockReturnValue(null);
    fixture.detectChanges();
    expect(component.config).toBeNull();
  });

  it('shows error when exporting PDF with no config', () => {
    facadeSpy.loadTournament.mockReturnValue(null);
    fixture.detectChanges();
    component.exportPdf();
    expect(notificationSpy.showError).toHaveBeenCalledWith('No hay torneo clásico para exportar');
  });

  it('shows error when resolveMatch throws', () => {
    facadeSpy.updateClassicMatchWinner.mockImplementation(() => { throw new Error('fail'); });
    fixture.detectChanges();
    component.resolveMatch(1, 'pair1');
    expect(notificationSpy.showError).toHaveBeenCalledWith('No se pudo actualizar el cuadro');
  });

  it('shows error when revertMatch throws', () => {
    facadeSpy.clearClassicMatchResult.mockImplementation(() => { throw new Error('fail'); });
    fixture.detectChanges();
    component.revertMatch(1);
    expect(notificationSpy.showError).toHaveBeenCalledWith('No se pudo reabrir el partido');
  });

  it('cancels match edit and clears editing state', () => {
    fixture.detectChanges();
    component.startMatchEdit(1);
    expect(component.editingMatch).toBe(1);
    component.cancelMatchEdit(1);
    expect(component.editingMatch).toBeNull();
    expect(component.editableSets[1]).toBeUndefined();
  });

  it('cancelMatchEdit does nothing for non-matching number', () => {
    fixture.detectChanges();
    component.startMatchEdit(1);
    component.cancelMatchEdit(999);
    expect(component.editingMatch).toBe(1);
  });

  it('startMatchEdit returns early for non-existent match', () => {
    fixture.detectChanges();
    component.startMatchEdit(999);
    expect(component.editingMatch).toBeNull();
  });

  it('saveMatchEdit shows error when no filled sets', () => {
    fixture.detectChanges();
    component.startMatchEdit(1);
    component.editableSets[1] = [
      { pair1Games: 0, pair2Games: 0 },
      { pair1Games: 0, pair2Games: 0 },
      { pair1Games: 0, pair2Games: 0 },
    ];
    component.saveMatchEdit(component.matches[0]);
    expect(notificationSpy.showError).toHaveBeenCalledWith('Introduce al menos un set con resultado');
  });

  it('saveMatchEdit shows error when sets have tie scores', () => {
    fixture.detectChanges();
    component.startMatchEdit(1);
    component.editableSets[1] = [
      { pair1Games: 6, pair2Games: 4 },
      { pair1Games: 3, pair2Games: 6 },
      { pair1Games: 5, pair2Games: 5 },
    ];
    component.saveMatchEdit(component.matches[0]);
    expect(notificationSpy.showError).toHaveBeenCalledWith('Revisa los sets: el marcador no es valido');
  });

  it('saveMatchEdit shows error when facade throws', () => {
    facadeSpy.updateSetScores.mockImplementation(() => { throw new Error('fail'); });
    fixture.detectChanges();
    component.startMatchEdit(1);
    component.editableSets[1] = [
      { pair1Games: 6, pair2Games: 4 },
      { pair1Games: 6, pair2Games: 3 },
      { pair1Games: 0, pair2Games: 0 },
    ];
    component.saveMatchEdit(component.matches[0]);
    expect(notificationSpy.showError).toHaveBeenCalledWith('No se pudo guardar el resultado');
  });

  describe('pairLabel', () => {
    it('returns BYE for a bye pair', () => {
      const byePair: Match['pair1'] = [
        { id: 0, name: 'BYE', position: 'right' },
        { id: 0, name: 'BYE', position: 'backhand' },
      ];
      expect(component.pairLabel(byePair)).toBe('BYE');
    });

    it('returns single name when both players share the same name', () => {
      const pair: Match['pair1'] = [
        { id: 1, name: 'Ganador P1', position: 'right' },
        { id: 1, name: 'Ganador P1', position: 'backhand' },
      ];
      expect(component.pairLabel(pair)).toBe('Ganador P1');
    });

    it('returns formatted pair for normal pair', () => {
      const pair: Match['pair1'] = [
        { id: 1, name: 'Alice', position: 'right' },
        { id: 2, name: 'Bob', position: 'backhand' },
      ];
      expect(component.pairLabel(pair)).toBe('Alice & Bob');
    });
  });

  describe('isByePair', () => {
    it('returns true when first player name is BYE', () => {
      const pair: Match['pair1'] = [
        { id: 0, name: 'BYE', position: 'right' },
        { id: 0, name: 'BYE', position: 'backhand' },
      ];
      expect(component.isByePair(pair)).toBe(true);
    });

    it('returns false for normal pair', () => {
      const pair: Match['pair1'] = [
        { id: 1, name: 'Alice', position: 'right' },
        { id: 2, name: 'Bob', position: 'backhand' },
      ];
      expect(component.isByePair(pair)).toBe(false);
    });
  });

  describe('roundTitle', () => {
    const validPair: Match['pair1'] = [
      { id: 1, name: 'Alice', position: 'right' },
      { id: 2, name: 'Bob', position: 'backhand' },
    ];

    it('returns "3er puesto" for final round with thirdPlaceMatch', () => {
      facadeSpy.loadTournament.mockReturnValue({
        ...makeClassicRecord(),
        config: { ...makeClassicRecord().config, thirdPlaceMatch: true },
        matches: [
          { number: 1, round: 1, pair1: validPair, pair2: validPair, scoringMode: 'sets', sets: [] },
          { number: 2, round: 2, pair1: validPair, pair2: validPair, scoringMode: 'sets', sets: [] },
        ],
      });
      fixture.detectChanges();
      expect(component.roundTitle(2)).toBe('3er puesto');
    });

    it('returns "Final" for the final round', () => {
      facadeSpy.loadTournament.mockReturnValue({
        ...makeClassicRecord(),
        matches: [
          { number: 1, round: 1, pair1: validPair, pair2: validPair, scoringMode: 'sets', sets: [] },
          { number: 2, round: 2, pair1: validPair, pair2: validPair, scoringMode: 'sets', sets: [] },
        ],
      });
      fixture.detectChanges();
      expect(component.roundTitle(2)).toBe('Final');
    });

    it('returns "Semifinal" for semifinal round', () => {
      facadeSpy.loadTournament.mockReturnValue({
        ...makeClassicRecord(),
        matches: [
          { number: 1, round: 1, pair1: validPair, pair2: validPair, scoringMode: 'sets', sets: [] },
          { number: 2, round: 2, pair1: validPair, pair2: validPair, scoringMode: 'sets', sets: [] },
          { number: 3, round: 3, pair1: validPair, pair2: validPair, scoringMode: 'sets', sets: [] },
        ],
      });
      fixture.detectChanges();
      expect(component.roundTitle(2)).toBe('Semifinal');
    });

    it('returns "Ronda X" for other rounds', () => {
      facadeSpy.loadTournament.mockReturnValue({
        ...makeClassicRecord(),
        matches: [
          { number: 1, round: 3, pair1: validPair, pair2: validPair, scoringMode: 'sets', sets: [] },
          { number: 2, round: 5, pair1: validPair, pair2: validPair, scoringMode: 'sets', sets: [] },
        ],
      });
      fixture.detectChanges();
      expect(component.roundTitle(3)).toBe('Ronda 3');
    });
  });

  describe('canResolveMatch', () => {
    it('returns false when pair1 is a bye', () => {
      const match: Match = {
        number: 1, round: 1, scoringMode: 'sets', sets: [],
        pair1: [{ id: 0, name: 'BYE', position: 'right' }, { id: 0, name: 'BYE', position: 'backhand' }],
        pair2: [{ id: 1, name: 'Alice', position: 'right' }, { id: 2, name: 'Bob', position: 'backhand' }],
      };
      expect(component.canResolveMatch(match)).toBe(false);
    });
  });

  describe('backToForm and goToHistory', () => {
    it('navigates to /', () => {
      fixture.detectChanges();
      component.backToForm();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
    });

    it('navigates to /history', () => {
      fixture.detectChanges();
      component.goToHistory();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/history']);
    });
  });

  describe('shouldShowSet', () => {
    beforeEach(() => {
      fixture.detectChanges();
      component.startMatchEdit(1);
    });

    it('returns true for setIndex 0', () => {
      expect(component.shouldShowSet(component.matches[0], 0)).toBe(true);
    });

    it('returns false for setIndex 1 when previous set is incomplete', () => {
      component.editableSets[1] = [
        { pair1Games: 3, pair2Games: 5 },
        { pair1Games: 0, pair2Games: 0 },
        { pair1Games: 0, pair2Games: 0 },
      ];
      expect(component.shouldShowSet(component.matches[0], 1)).toBe(false);
    });

    it('returns true for setIndex 1 when previous set is complete', () => {
      component.editableSets[1] = [
        { pair1Games: 6, pair2Games: 4 },
        { pair1Games: 0, pair2Games: 0 },
        { pair1Games: 0, pair2Games: 0 },
      ];
      expect(component.shouldShowSet(component.matches[0], 1)).toBe(true);
    });

    it('returns true for setIndex 2 when first two sets are split (tiebreak)', () => {
      component.editableSets[1] = [
        { pair1Games: 6, pair2Games: 4 },
        { pair1Games: 3, pair2Games: 6 },
        { pair1Games: 0, pair2Games: 0 },
      ];
      expect(component.shouldShowSet(component.matches[0], 2)).toBe(true);
    });

    it('returns true for setIndex 2 when match is already decided but set 3 has scores', () => {
      component.editableSets[1] = [
        { pair1Games: 6, pair2Games: 4 },
        { pair1Games: 6, pair2Games: 3 },
        { pair1Games: 1, pair2Games: 0 },
      ];
      expect(component.shouldShowSet(component.matches[0], 2)).toBe(true);
    });

    it('returns false for setIndex 2 when match is already decided and set 3 is empty', () => {
      component.editableSets[1] = [
        { pair1Games: 6, pair2Games: 4 },
        { pair1Games: 6, pair2Games: 3 },
        { pair1Games: 0, pair2Games: 0 },
      ];
      expect(component.shouldShowSet(component.matches[0], 2)).toBe(false);
    });
  });
});
