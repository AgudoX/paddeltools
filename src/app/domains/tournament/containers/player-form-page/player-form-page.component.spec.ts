import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlayerFormPageComponent } from './player-form-page.component';
import { TournamentFacade } from '@domain/tournament/data-access/tournament.facade';
import { NotificationService } from '@shared/services/notification.service';
import { Router } from '@angular/router';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { signal } from '@angular/core';
import { TournamentConfig, TournamentRecord } from '@shared/models/player.model';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('PlayerFormPageComponent', () => {
  let fixture: ComponentFixture<PlayerFormPageComponent>;
  let component: PlayerFormPageComponent;
  let routerSpy: { navigate: ReturnType<typeof vi.fn> };
  let notificationSpy: {
    showSuccess: ReturnType<typeof vi.fn>;
    showError: ReturnType<typeof vi.fn>;
  };
  let facadeSpy: {
    config: ReturnType<typeof signal>;
    history: ReturnType<typeof signal>;
    generateTournament: ReturnType<typeof vi.fn>;
    generateClassicTournament: ReturnType<typeof vi.fn>;
    clearData: ReturnType<typeof vi.fn>;
    clearCurrentTournamentId: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    routerSpy = { navigate: vi.fn() };
    notificationSpy = { showSuccess: vi.fn(), showError: vi.fn() };
    facadeSpy = {
      config: signal(null),
      history: signal<TournamentRecord[]>([]),
      generateTournament: vi.fn().mockReturnValue('tourney-1'),
      generateClassicTournament: vi.fn().mockReturnValue('classic-1'),
      clearData: vi.fn(),
      clearCurrentTournamentId: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [PlayerFormPageComponent, NoopAnimationsModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: TournamentFacade, useValue: facadeSpy },
        { provide: NotificationService, useValue: notificationSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PlayerFormPageComponent);
    component = fixture.componentRef.instance;
  });

  describe('ngOnInit', () => {
    it('initializes with defaults when no config', () => {
      fixture.detectChanges();
      expect(component.competitionType()).toBe('americano');
      expect(component.numberOfPlayers).toBe(8);
      expect(component.numberOfRounds).toBe(3);
      expect(component.mode).toBe('free');
      expect(component.players.length).toBe(8);
    });

    it('loads config when available', () => {
      facadeSpy.config.set({
        numberOfPlayers: 8,
        numberOfRounds: 4,
        mode: 'fixed-pairs' as const,
        scoringMode: 'points' as const,
        players: [
          { id: 1, name: 'Alice', position: 'right', pairId: 1 },
          { id: 2, name: 'Bob', position: 'backhand', pairId: 1 },
          { id: 3, name: 'Charlie', position: 'either', pairId: 2 },
          { id: 4, name: 'Diana', position: 'right', pairId: 2 },
        ],
        name: 'Saved Config',
      });
      fixture.detectChanges();
      expect(component.numberOfPlayers).toBe(8);
      expect(component.numberOfRounds).toBe(4);
      expect(component.mode).toBe('fixed-pairs');
      expect(component.scoringMode).toBe('points');
      expect(component.pairs.length).toBe(4);
    });

    it('sets the name to empty string when config is restored', () => {
      facadeSpy.config.set({
        numberOfPlayers: 8,
        numberOfRounds: 3,
        mode: 'free',
        scoringMode: 'sets',
        players: [
          { id: 1, name: 'Alice', position: 'right' },
          { id: 2, name: 'Bob', position: 'backhand' },
        ],
        name: 'Existing Name',
      });
      component.tournamentName = 'existing name';
      fixture.detectChanges();
      expect(component.tournamentName).toBe('');
    });
  });

  describe('updateNumberOfPlayers', () => {
    describe('free mode', () => {
      beforeEach(() => {
        component.mode = 'free';
        component.players = [];
      });

      it('adds players when diff is positive', () => {
        component.numberOfPlayers = 6;
        component.updateNumberOfPlayers();
        expect(component.players.length).toBe(6);
      });

      it('removes players when diff is negative', () => {
        component.players = [
          { id: 1, name: 'A', position: 'right' },
          { id: 2, name: 'B', position: 'backhand' },
          { id: 3, name: 'C', position: 'either' },
          { id: 4, name: 'D', position: 'right' },
        ];
        component.numberOfPlayers = 2;
        component.updateNumberOfPlayers();
        expect(component.players.length).toBe(2);
      });

      it('assigns incremental ids', () => {
        component.numberOfPlayers = 3;
        component.updateNumberOfPlayers();
        const ids = component.players.map((p) => p.id);
        expect(ids).toEqual([1, 2, 3]);
      });

      it('does nothing when diff is zero', () => {
        component.numberOfPlayers = 0;
        component.updateNumberOfPlayers();
        expect(component.players.length).toBe(0);
      });
    });

    describe('fixed-pairs mode', () => {
      beforeEach(() => {
        component.mode = 'fixed-pairs';
        component.pairs = [];
      });

      it('adds pairs when diff is positive', () => {
        component.numberOfPlayers = 8;
        component.updateNumberOfPlayers();
        expect(component.pairs.length).toBe(4);
      });

      it('removes pairs when diff is negative', () => {
        component.numberOfPlayers = 8;
        component.updateNumberOfPlayers();
        component.numberOfPlayers = 4;
        component.updateNumberOfPlayers();
      expect(component.pairs.length).toBe(2);
      });

      it('sets pairId on converted players', () => {
        component.numberOfPlayers = 4;
        component.updateNumberOfPlayers();
        expect(component.players.every((p) => p.pairId !== undefined)).toBe(true);
      });
    });
  });

  describe('onNumberOfPlayersChange', () => {
    it('rounds up to nearest multiple of 4', () => {
      component.numberOfPlayers = 10;
      component.onNumberOfPlayersChange();
      expect(component.numberOfPlayers).toBe(12);
    });

    it('set to min 8 when less than 8', () => {
      component.numberOfPlayers = 3;
      component.onNumberOfPlayersChange();
      expect(component.numberOfPlayers).toBe(8);
    });

    it('keeps valid multiple of 4', () => {
      component.numberOfPlayers = 12;
      component.onNumberOfPlayersChange();
      expect(component.numberOfPlayers).toBe(12);
    });
  });

  describe('onNeonPlayersChange', () => {
    it('updates and rounds players count', () => {
      component.onNeonPlayersChange(10);
      expect(component.numberOfPlayers).toBe(12);
    });
  });

  describe('onNeonRoundsChange', () => {
    it('updates rounds count', () => {
      component.onNeonRoundsChange(5);
      expect(component.numberOfRounds).toBe(5);
    });

    it('does not go below 1', () => {
      component.onNeonRoundsChange(0);
      expect(component.numberOfRounds).toBe(1);
    });
  });

  describe('onModeChange', () => {
    it('clears pairs and pairIds when switching to free', () => {
      component.mode = 'free';
      component.pairs = [{ id: 1, player1: { id: 1, name: 'A', position: 'right', pairId: 1 }, player2: { id: 2, name: 'B', position: 'backhand', pairId: 1 } }];
      component.players = [
        { id: 1, name: 'A', position: 'right', pairId: 1 },
        { id: 2, name: 'B', position: 'backhand', pairId: 1 },
      ];
      component.onModeChange();
      expect(component.pairs.length).toBe(0);
      expect(component.players[0].pairId).toBeUndefined();
    });

    it('converts to pairs when switching to fixed-pairs', () => {
      component.mode = 'fixed-pairs';
      component.players = [
        { id: 1, name: 'A', position: 'right', pairId: 1 },
        { id: 2, name: 'B', position: 'backhand', pairId: 1 },
      ];
      component.numberOfPlayers = 4;
      component.onModeChange();
      expect(component.pairs.length).toBe(2);
    });
  });

  describe('hero CTA', () => {
    it('shows player-oriented label in free americano mode', () => {
      component.mode = 'free';
      expect(component.heroActionLabel()).toBe('Ir a jugadores');
    });

    it('shows pair-oriented label in classic mode', () => {
      component.setCompetitionType('classic');
      expect(component.heroActionLabel()).toBe('Configurar parejas');
    });

    it('scrolls to the roster section when requested', () => {
      const scrollIntoView = vi.fn();
      const rosterSection = {
        nativeElement: { scrollIntoView },
      };

      (
        component as unknown as {
          rosterSection: () => typeof rosterSection;
        }
      ).rosterSection = () => rosterSection;

      component.scrollToRoster();

      expect(scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'start',
      });
      expect(facadeSpy.generateTournament).not.toHaveBeenCalled();
      expect(facadeSpy.generateClassicTournament).not.toHaveBeenCalled();
    });
  });

  describe('onPlayerUpdate', () => {
    it('updates player name and position', () => {
      component.players = [{ id: 5, name: 'Old', position: 'right' }];
      component.onPlayerUpdate({ id: 5, name: 'New', position: 'backhand' });
      expect(component.players[0].name).toBe('New');
      expect(component.players[0].position).toBe('backhand');
    });

    it('updates only name', () => {
      component.players = [{ id: 5, name: 'Old', position: 'right' }];
      component.onPlayerUpdate({ id: 5, name: 'New' });
      expect(component.players[0].name).toBe('New');
      expect(component.players[0].position).toBe('right');
    });

    it('returns early for unknown player', () => {
      component.players = [{ id: 1, name: 'A', position: 'right' }];
      component.onPlayerUpdate({ id: 999, name: 'Ghost' });
      expect(component.players[0].name).toBe('A');
    });
  });

  describe('onPairUpdate', () => {
    it('updates pair player name and position', () => {
      component.pairs = [
        {
          id: 1,
          player1: { id: 1, name: 'P1Old', position: 'right', pairId: 1 },
          player2: { id: 2, name: 'P2Old', position: 'backhand', pairId: 1 },
        },
      ];
      component.onPairUpdate({ pairId: 1, playerId: 1, name: 'P1New', position: 'either' });
      expect(component.pairs[0].player1.name).toBe('P1New');
      expect(component.pairs[0].player1.position).toBe('either');
    });

    it('returns early for unknown pair', () => {
      component.pairs = [
        {
          id: 1,
          player1: { id: 1, name: 'A', position: 'right', pairId: 1 },
          player2: { id: 2, name: 'B', position: 'backhand', pairId: 1 },
        },
      ];
      component.onPairUpdate({ pairId: 999, playerId: 1, name: 'X' });
      expect(component.pairs[0].player1.name).toBe('A');
    });
  });

  describe('duplicateName', () => {
    it('returns true when name exists in history', () => {
      facadeSpy.history.set([
        { id: '1', label: 'My Torneo', createdAt: '', config: {} as TournamentConfig, matches: [] },
      ]);
      component.tournamentName = 'My Torneo';
      expect((component as unknown as { duplicateName: () => boolean }).duplicateName()).toBe(true);
    });

    it('returns false when name is unique', () => {
      facadeSpy.history.set([
        { id: '1', label: 'Other', createdAt: '', config: {} as TournamentConfig, matches: [] },
      ]);
      component.tournamentName = 'My Torneo';
      expect((component as unknown as { duplicateName: () => boolean }).duplicateName()).toBe(false);
    });

    it('is case-insensitive', () => {
      facadeSpy.history.set([
        { id: '1', label: 'Mi Torneo', createdAt: '', config: {} as TournamentConfig, matches: [] },
      ]);
      component.tournamentName = 'MI TORNEO';
      expect((component as unknown as { duplicateName: () => boolean }).duplicateName()).toBe(true);
    });

    it('returns false when name is empty', () => {
      component.tournamentName = '   ';
      expect((component as unknown as { duplicateName: () => boolean }).duplicateName()).toBe(false);
    });
  });

  describe('validate', () => {
    beforeEach(() => {
      component.numberOfPlayers = 8;
      component.numberOfRounds = 3;
      component.mode = 'free';
      component.players = [
        { id: 1, name: 'Alice', position: 'right' },
        { id: 2, name: 'Bob', position: 'backhand' },
        { id: 3, name: 'Charlie', position: 'either' },
        { id: 4, name: 'Diana', position: 'right' },
        { id: 5, name: 'Eve', position: 'backhand' },
        { id: 6, name: 'Frank', position: 'either' },
        { id: 7, name: 'Grace', position: 'right' },
        { id: 8, name: 'Hank', position: 'backhand' },
      ];
    });

    it('returns true for valid form', () => {
      expect(component.validate()).toBe(true);
      expect(component.errors.length).toBe(0);
    });

    it('returns error when players < 8', () => {
      component.numberOfPlayers = 6;
      component.players = component.players.slice(0, 6);
      expect(component.validate()).toBe(false);
      expect(component.errors).toContain('Debe haber al menos 8 jugadores');
    });

    it('returns error when players is not multiple of 4', () => {
      component.numberOfPlayers = 10;
      expect(component.validate()).toBe(false);
      expect(component.errors).toContain('El número de jugadores debe ser múltiplo de 4');
    });

    it('returns error when rounds < 1', () => {
      component.numberOfRounds = 0;
      expect(component.validate()).toBe(false);
      expect(component.errors).toContain('Debe haber al menos 1 ronda');
    });

    it('returns error for empty player names', () => {
      component.players[0].name = '';
      expect(component.validate()).toBe(false);
      expect(component.errors).toContain('Todos los jugadores deben tener nombre');
    });

    it('returns error for duplicate player names', () => {
      component.players[0].name = 'Alice';
      component.players[1].name = 'Alice';
      expect(component.validate()).toBe(false);
      expect(component.errors).toContain('Los nombres de los jugadores deben ser únicos');
    });

    it('returns error for duplicate tournament name', () => {
      component.tournamentName = 'Test Name';
      facadeSpy.history.set([
        { id: '1', label: 'Test Name', createdAt: '', config: {} as TournamentConfig, matches: [] },
      ]);
      expect(component.validate()).toBe(false);
      expect(component.errors).toContain('Ya existe un torneo guardado con ese nombre');
    });
  });

  describe('validate fixed-pairs mode', () => {
    beforeEach(() => {
      component.numberOfPlayers = 8;
      component.numberOfRounds = 3;
      component.mode = 'fixed-pairs';
      component.players = [
        { id: 1, name: 'Alice', position: 'right', pairId: 1 },
        { id: 2, name: 'Bob', position: 'backhand', pairId: 1 },
        { id: 3, name: 'Charlie', position: 'either', pairId: 2 },
        { id: 4, name: 'Diana', position: 'right', pairId: 2 },
        { id: 5, name: 'Eve', position: 'backhand', pairId: 3 },
        { id: 6, name: 'Frank', position: 'either', pairId: 3 },
        { id: 7, name: 'Grace', position: 'right', pairId: 4 },
        { id: 8, name: 'Hank', position: 'backhand', pairId: 4 },
      ];
      component.pairs = [
        { id: 1, player1: { id: 1, name: 'Alice', position: 'right', pairId: 1 }, player2: { id: 2, name: 'Bob', position: 'backhand', pairId: 1 } },
        { id: 2, player1: { id: 3, name: 'Charlie', position: 'either', pairId: 2 }, player2: { id: 4, name: 'Diana', position: 'right', pairId: 2 } },
        { id: 3, player1: { id: 5, name: 'Eve', position: 'backhand', pairId: 3 }, player2: { id: 6, name: 'Frank', position: 'either', pairId: 3 } },
        { id: 4, player1: { id: 7, name: 'Grace', position: 'right', pairId: 4 }, player2: { id: 8, name: 'Hank', position: 'backhand', pairId: 4 } },
      ];
    });

    it('returns true for valid fixed-pairs form', () => {
      expect(component.validate()).toBe(true);
    });

    it('returns error when pair has empty names', () => {
      component.pairs[0].player1.name = '';
      expect(component.validate()).toBe(false);
      expect(component.errors).toContain('La pareja 1 debe tener ambos nombres completos');
    });

    it('returns error for duplicate names in fixed-pairs', () => {
      component.pairs[0].player1.name = 'Alice';
      component.pairs[1].player2.name = 'alice';
      expect(component.validate()).toBe(false);
      expect(component.errors).toContain('Los nombres de todos los jugadores deben ser únicos');
    });
  });

  describe('validate classic mode', () => {
    beforeEach(() => {
      component.setCompetitionType('classic');
      component.numberOfPlayers = 8;
      component.mode = 'fixed-pairs';
      component.players = [
        { id: 1, name: 'Alice', position: 'right', pairId: 1 },
        { id: 2, name: 'Bob', position: 'backhand', pairId: 1 },
        { id: 3, name: 'Charlie', position: 'either', pairId: 2 },
        { id: 4, name: 'Diana', position: 'right', pairId: 2 },
        { id: 5, name: 'Eve', position: 'backhand', pairId: 3 },
        { id: 6, name: 'Frank', position: 'either', pairId: 3 },
        { id: 7, name: 'Grace', position: 'right', pairId: 4 },
        { id: 8, name: 'Hank', position: 'backhand', pairId: 4 },
      ];
      component.pairs = [
        { id: 1, player1: { id: 1, name: 'Alice', position: 'right', pairId: 1 }, player2: { id: 2, name: 'Bob', position: 'backhand', pairId: 1 } },
        { id: 2, player1: { id: 3, name: 'Charlie', position: 'either', pairId: 2 }, player2: { id: 4, name: 'Diana', position: 'right', pairId: 2 } },
        { id: 3, player1: { id: 5, name: 'Eve', position: 'backhand', pairId: 3 }, player2: { id: 6, name: 'Frank', position: 'either', pairId: 3 } },
        { id: 4, player1: { id: 7, name: 'Grace', position: 'right', pairId: 4 }, player2: { id: 8, name: 'Hank', position: 'backhand', pairId: 4 } },
      ];
    });

    it('returns error when players < 4 in classic mode', () => {
      component.numberOfPlayers = 2;
      expect(component.validate()).toBe(false);
      expect(component.errors).toContain('Debe haber al menos 4 jugadores');
    });

    it('returns error when players is not multiple of 2 in classic mode', () => {
      component.numberOfPlayers = 7;
      expect(component.validate()).toBe(false);
      expect(component.errors).toContain('El número de jugadores debe ser múltiplo de 2');
    });

    it('returns error when pair has empty names in classic mode', () => {
      component.pairs[0].player1.name = '';
      expect(component.validate()).toBe(false);
      expect(component.errors).toContain('La pareja 1 debe tener ambos nombres completos');
    });

    it('returns error for duplicate names in classic mode', () => {
      component.pairs[0].player1.name = 'Alice';
      component.pairs[1].player1.name = 'alice';
      expect(component.validate()).toBe(false);
      expect(component.errors).toContain('Los nombres de todas las parejas deben ser únicos');
    });
  });

  describe('generateTournament', () => {
    beforeEach(() => {
      component.numberOfPlayers = 8;
      component.numberOfRounds = 3;
      component.mode = 'free';
      component.players = [
        { id: 1, name: 'A', position: 'right' },
        { id: 2, name: 'B', position: 'backhand' },
        { id: 3, name: 'C', position: 'either' },
        { id: 4, name: 'D', position: 'right' },
        { id: 5, name: 'E', position: 'backhand' },
        { id: 6, name: 'F', position: 'either' },
        { id: 7, name: 'G', position: 'right' },
        { id: 8, name: 'H', position: 'backhand' },
      ];
    });

    it('generates tournament and navigates', () => {
      component.generateTournament();
      expect(facadeSpy.generateTournament).toHaveBeenCalled();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/tournament', 'tourney-1']);
    });

    it('does not generate when validation fails', () => {
      component.numberOfPlayers = 2;
      component.generateTournament();
      expect(facadeSpy.generateTournament).not.toHaveBeenCalled();
    });

    it('catches error and adds to errors', () => {
      facadeSpy.generateTournament.mockImplementation(() => { throw new Error('Custom error'); });
      component.generateTournament();
      expect(component.errors).toContain('Custom error');
      expect(component.loading).toBe(false);
    });

    it('handles non-Error throws', () => {
      facadeSpy.generateTournament.mockImplementation(() => { throw 'string error'; });
      component.generateTournament();
      expect(component.errors).toContain('Error al generar el americano');
      expect(component.loading).toBe(false);
    });
  });

  describe('competition type tabs', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('switches to classic mode and applies the classic theme', () => {
      component.setCompetitionType('classic');
      fixture.detectChanges();

      expect(component.competitionType()).toBe('classic');
      expect(component.isClassic()).toBe(true);
      expect(component.primaryActionLabel()).toBe('Crear Torneo');
      expect(fixture.nativeElement.querySelector('.arena')?.classList.contains('arena--classic')).toBe(true);
      expect(fixture.nativeElement.textContent).toContain('Cuadro clásico y exportación PDF');
    });

    it('restores americano constraints when switching back from classic', () => {
      component.numberOfPlayers = 6;
      component.setCompetitionType('classic');
      component.setCompetitionType('americano');

      expect(component.competitionType()).toBe('americano');
      expect(component.numberOfPlayers).toBe(8);
    });

    it('shows feedback instead of generating when classic primary action is pressed', () => {
      component.setCompetitionType('classic');
      component.handlePrimaryAction();

      expect(facadeSpy.generateTournament).not.toHaveBeenCalled();
      expect(facadeSpy.generateClassicTournament).toHaveBeenCalled();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/classic-tournament', 'classic-1']);
    });
  });

  describe('handlePrimaryAction in americano mode', () => {
    beforeEach(() => {
      component.numberOfPlayers = 8;
      component.numberOfRounds = 3;
      component.mode = 'free';
      component.players = [
        { id: 1, name: 'A', position: 'right' },
        { id: 2, name: 'B', position: 'backhand' },
        { id: 3, name: 'C', position: 'either' },
        { id: 4, name: 'D', position: 'right' },
        { id: 5, name: 'E', position: 'backhand' },
        { id: 6, name: 'F', position: 'either' },
        { id: 7, name: 'G', position: 'right' },
        { id: 8, name: 'H', position: 'backhand' },
      ];
    });

    it('calls generateTournament when not classic', () => {
      component.setCompetitionType('americano');
      component.handlePrimaryAction();
      expect(facadeSpy.generateTournament).toHaveBeenCalled();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/tournament', 'tourney-1']);
    });
  });

  describe('generateClassicTournament error', () => {
    beforeEach(() => {
      component.numberOfPlayers = 8;
      component.mode = 'fixed-pairs';
      component.players = [
        { id: 1, name: 'A', position: 'right', pairId: 1 },
        { id: 2, name: 'B', position: 'backhand', pairId: 1 },
      ];
      component.pairs = [
        { id: 1, player1: { id: 1, name: 'A', position: 'right', pairId: 1 }, player2: { id: 2, name: 'B', position: 'backhand', pairId: 1 } },
      ];
    });

    it('catches error and adds to errors', () => {
      facadeSpy.generateClassicTournament.mockImplementation(() => { throw new Error('Classic error'); });
      component.setCompetitionType('classic');
      component.handlePrimaryAction();
      expect(component.errors).toContain('Classic error');
      expect(component.loading).toBe(false);
    });

    it('handles non-Error throws', () => {
      facadeSpy.generateClassicTournament.mockImplementation(() => { throw 'string throw'; });
      component.setCompetitionType('classic');
      component.handlePrimaryAction();
      expect(component.errors).toContain('Error al crear el torneo clásico');
      expect(component.loading).toBe(false);
    });
  });

  describe('goToHistory', () => {
    it('clears current id and navigates', () => {
      component.goToHistory();
      expect(facadeSpy.clearCurrentTournamentId).toHaveBeenCalled();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/history']);
    });
  });

  describe('clear', () => {
    beforeEach(() => {
      component.setCompetitionType('classic');
      component.tournamentName = 'Test';
      component.numberOfPlayers = 12;
      component.mode = 'fixed-pairs';
      component.players = [{ id: 1, name: 'A', position: 'right' }];
      component.pairs = [{ id: 1, player1: { id: 1, name: 'A', position: 'right', pairId: 1 }, player2: { id: 2, name: 'B', position: 'backhand', pairId: 1 } }];
      component.errors = ['some error'];
    });

    it('clears data when confirmed', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      component.clear();
      expect(facadeSpy.clearData).toHaveBeenCalled();
      expect(component.competitionType()).toBe('americano');
      expect(component.tournamentName).toBe('');
      expect(component.numberOfPlayers).toBe(8);
      expect(component.mode).toBe('free');
      expect(component.players.length).toBeGreaterThan(0);
      expect(component.pairs.length).toBe(0);
      expect(component.errors.length).toBe(0);
      expect(notificationSpy.showSuccess).toHaveBeenCalled();
    });

    it('does nothing when not confirmed', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      component.clear();
      expect(facadeSpy.clearData).not.toHaveBeenCalled();
    });
  });

  describe('convertPlayersToPairs', () => {
    it('groups players by pairId', () => {
      component.players = [
        { id: 1, name: 'A', position: 'right', pairId: 1 },
        { id: 2, name: 'B', position: 'backhand', pairId: 1 },
        { id: 3, name: 'C', position: 'either', pairId: 2 },
        { id: 4, name: 'D', position: 'right', pairId: 2 },
      ];
      component.numberOfPlayers = 4;
      component.convertPlayersToPairs();
      expect(component.pairs.length).toBe(2);
      expect(component.pairs[0].player1.name).toBe('A');
      expect(component.pairs[0].player2.name).toBe('B');
    });

    it('fills missing pairs', () => {
      component.players = [
        { id: 1, name: 'A', position: 'right', pairId: 1 },
        { id: 2, name: 'B', position: 'backhand', pairId: 1 },
      ];
      component.numberOfPlayers = 8;
      component.convertPlayersToPairs();
      expect(component.pairs.length).toBe(4);
    });
  });

  describe('convertPairsToPlayers', () => {
    it('converts pairs to players with pairIds', () => {
      component.pairs = [
        { id: 5, player1: { id: 1, name: 'A', position: 'right', pairId: 5 }, player2: { id: 2, name: 'B', position: 'backhand', pairId: 5 } },
      ];
      component.convertPairsToPlayers();
      expect(component.players.length).toBe(2);
      expect(component.players[0].pairId).toBe(5);
    });
  });
});
