import {
  Component,
  OnInit,
  inject,
  ChangeDetectionStrategy,
  computed,
  ElementRef,
  signal,
  viewChild,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { MatIconModule } from "@angular/material/icon";
import { TournamentFacade } from "@domain/tournament/data-access/tournament.facade";
import {
  ClassicTournamentConfig,
  ClassicTournamentFormat,
  CompetitionType,
  Pair,
  Player,
  PairingMode,
  ScoringMode,
  TournamentConfig,
} from "@shared/models/player.model";
import { FloatingButtonComponent } from "@shared/components/floating-button/floating-button.component";
import { PlayerCardComponent } from "@domain/tournament/components/player-card/player-card.component";
import { PairCardComponent } from "@domain/tournament/components/pair-card/pair-card.component";
import { ClassicTournamentFormComponent } from "@domain/tournament/components/classic-tournament-form/classic-tournament-form.component";
import { TournamentTypeTabsComponent } from "@domain/tournament/components/tournament-type-tabs/tournament-type-tabs.component";
import { NeonCounterComponent } from "@shared/components/neon-counter/neon-counter.component";
import { PadelCraftLogoComponent } from "@shared/components/padelcraft-logo/padelcraft-logo.component";
import { NotificationService } from "@shared/services/notification.service";

interface PairForm {
  id: number;
  player1: Player;
  player2: Player;
}

@Component({
  selector: "app-player-form-page",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    FloatingButtonComponent,
    PlayerCardComponent,
    PairCardComponent,
    ClassicTournamentFormComponent,
    TournamentTypeTabsComponent,
    NeonCounterComponent,
    PadelCraftLogoComponent,
  ],
  templateUrl: "./player-form-page.component.html",
  styleUrl: "./player-form-page.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerFormPageComponent implements OnInit {
  private readonly facade = inject(TournamentFacade);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);

  readonly competitionType = signal<CompetitionType>("americano");
  readonly isClassic = computed(() => this.competitionType() === "classic");
  readonly heroSubtitle = computed(() =>
    this.isClassic()
      ? "Diseña cuadros de torneos y descarga un PDF con toda la información"
      : "Organiza tu americano de pádel al instante",
  );
  readonly primaryActionLabel = computed(() =>
    this.isClassic() ? "Crear Torneo" : "Generar Americano",
  );
  readonly primaryActionLoadingLabel = computed(() =>
    this.isClassic() ? "Preparando..." : "Generando...",
  );
  readonly heroActionLabel = computed(() =>
    this.isClassic()
      ? "Configurar parejas"
      : this.mode === "fixed-pairs"
        ? "Ir a parejas"
        : "Ir a jugadores",
  );
  readonly tournamentNameLabel = computed(() =>
    this.isClassic() ? "Nombre del Torneo" : "Nombre del Americano",
  );
  readonly rosterSection = viewChild<ElementRef<HTMLElement>>("rosterSection");

  tournamentName = "";
  numberOfPlayers = 8;
  numberOfRounds = 3;
  mode: PairingMode = "free";
  scoringMode: ScoringMode = "sets";
  classicFormat: ClassicTournamentFormat = "single-elimination";
  classicSeeded = true;
  classicThirdPlaceMatch = false;
  players: Player[] = [];
  pairs: PairForm[] = [];
  errors: string[] = [];
  loading = false;

  ngOnInit(): void {
    const config = this.facade.config();
    if (config) {
      this.tournamentName = "";
      this.numberOfPlayers = config.numberOfPlayers;
      this.players = [...config.players];

      if (config.type === "classic") {
        this.competitionType.set("classic");
        this.classicFormat = config.format;
        this.classicSeeded = config.seeded;
        this.classicThirdPlaceMatch = config.thirdPlaceMatch;
        this.pairs = config.pairs.map((pair) => ({
          id: pair.id,
          player1: { ...pair.player1 },
          player2: { ...pair.player2 },
        }));
      } else {
        this.numberOfRounds = config.numberOfRounds;
        this.mode = config.mode;
        this.scoringMode = config.scoringMode ?? "sets";
      }

      if (this.mode === "fixed-pairs" || this.isClassic()) {
        this.convertPlayersToPairs();
      }
    }

    if (this.players.length === 0 && this.pairs.length === 0) {
      this.updateNumberOfPlayers();
    }
  }

  convertPlayersToPairs(): void {
    this.pairs = [];
    const pairsMap = new Map<number, Player[]>();

    this.players.forEach((player) => {
      if (player.pairId !== undefined && player.pairId !== null) {
        if (!pairsMap.has(player.pairId)) {
          pairsMap.set(player.pairId, []);
        }
        pairsMap.get(player.pairId)?.push(player);
      }
    });

    pairsMap.forEach((pairPlayers, pairId) => {
      if (pairPlayers.length === 2) {
        this.pairs.push({
          id: pairId,
          player1: pairPlayers[0],
          player2: pairPlayers[1],
        });
      }
    });

    const expectedPairs = this.numberOfPlayers / 2;
    while (this.pairs.length < expectedPairs) {
      const newPairId = this.pairs.length + 1;
      const baseId = this.pairs.length * 2 + 1;
      this.pairs.push({
        id: newPairId,
        player1: {
          id: baseId,
          name: `Jugador ${baseId}`,
          position: "either",
          pairId: newPairId,
        },
        player2: {
          id: baseId + 1,
          name: `Jugador ${baseId + 1}`,
          position: "either",
          pairId: newPairId,
        },
      });
    }
  }

  convertPairsToPlayers(): void {
    this.players = [];
    this.pairs.forEach((pair) => {
      pair.player1.pairId = pair.id;
      pair.player2.pairId = pair.id;
      this.players.push(pair.player1, pair.player2);
    });
  }

  updateNumberOfPlayers(): void {
    if (this.mode === "fixed-pairs" || this.isClassic()) {
      const expectedPairs = this.numberOfPlayers / 2;
      const diff = expectedPairs - this.pairs.length;

      if (diff > 0) {
        for (let i = 0; i < diff; i++) {
          const newPairId = this.pairs.length + 1;
          const baseId = this.pairs.length * 2 + 1;
          this.pairs.push({
            id: newPairId,
            player1: {
              id: baseId,
              name: `Jugador ${baseId}`,
              position: "either",
              pairId: newPairId,
            },
            player2: {
              id: baseId + 1,
              name: `Jugador ${baseId + 1}`,
              position: "either",
              pairId: newPairId,
            },
          });
        }
      } else if (diff < 0) {
        this.pairs = this.pairs.slice(0, expectedPairs);
      }

      this.convertPairsToPlayers();
    } else {
      const diff = this.numberOfPlayers - this.players.length;

      if (diff > 0) {
        for (let i = 0; i < diff; i++) {
          const newId =
            this.players.length > 0
              ? Math.max(...this.players.map((p) => p.id)) + 1
              : 1;
          this.players.push({
            id: newId,
            name: `Jugador ${newId}`,
            position: "either",
            pairId: undefined,
          });
        }
      } else if (diff < 0) {
        this.players = this.players.slice(0, this.numberOfPlayers);
      }
    }
  }

  onNumberOfPlayersChange(): void {
    if (this.numberOfPlayers % 4 !== 0) {
      this.numberOfPlayers = Math.max(
        8,
        Math.round(this.numberOfPlayers / 4) * 4,
      );
    }

    if (this.numberOfPlayers < 8) {
      this.numberOfPlayers = 8;
    }

    this.updateNumberOfPlayers();
  }

  onNeonPlayersChange(value: number): void {
    this.numberOfPlayers = value;
    this.onNumberOfPlayersChange();
  }

  onNeonRoundsChange(value: number): void {
    this.numberOfRounds = Math.max(1, value);
  }

  onClassicPlayersChange(value: number): void {
    const minimumPlayers = this.classicFormat === "groups-and-playoffs" ? 8 : 4;
    this.numberOfPlayers = Math.max(minimumPlayers, value);
    this.updateNumberOfPlayers();
  }

  onClassicFormatChange(format: ClassicTournamentFormat): void {
    this.classicFormat = format;
    if (format === "groups-and-playoffs") {
      this.numberOfPlayers = Math.max(8, this.numberOfPlayers);
      this.classicSeeded = true;
    }
    this.updateNumberOfPlayers();
  }

  onModeChange(): void {
    if (this.mode === "free") {
      this.players.forEach((p) => (p.pairId = undefined));
      this.pairs = [];
    } else {
      this.convertPlayersToPairs();
    }
  }

  onPlayerUpdate(change: {
    id: number;
    name?: string;
    position?: Player["position"];
  }): void {
    const player = this.players.find((p) => p.id === change.id);
    if (!player) return;
    if (change.name !== undefined) player.name = change.name;
    if (change.position !== undefined) player.position = change.position;
  }

  onPairUpdate(change: {
    pairId: number;
    playerId: number;
    name?: string;
    position?: Player["position"];
  }): void {
    const pair = this.pairs.find((p) => p.id === change.pairId);
    if (!pair) return;
    const player =
      pair.player1.id === change.playerId ? pair.player1 : pair.player2;
    if (change.name !== undefined) player.name = change.name;
    if (change.position !== undefined) player.position = change.position;
  }

  protected duplicateName(): boolean {
    const name = this.tournamentName.trim();
    return (
      !!name &&
      this.facade
        .history()
        .some((r) => r.label.toLowerCase() === name.toLowerCase())
    );
  }

  validate(): boolean {
    this.errors = [];

    if (this.duplicateName()) {
      this.errors.push("Ya existe un torneo guardado con ese nombre");
    }

    if (this.isClassic()) {
      const minimumPlayers =
        this.classicFormat === "groups-and-playoffs" ? 8 : 4;
      if (this.numberOfPlayers < minimumPlayers) {
        this.errors.push(
          this.classicFormat === "groups-and-playoffs"
            ? "Grupos + playoffs necesita al menos 8 jugadores"
            : "Debe haber al menos 4 jugadores",
        );
      }

      if (this.numberOfPlayers % 2 !== 0) {
        this.errors.push("El número de jugadores debe ser múltiplo de 2");
      }

      this.convertPairsToPlayers();

      this.pairs.forEach((pair, index) => {
        if (!pair.player1.name.trim() || !pair.player2.name.trim()) {
          this.errors.push(
            `La pareja ${index + 1} debe tener ambos nombres completos`,
          );
        }
      });

      const classicNames = this.pairs.flatMap((pair) => [
        pair.player1.name.trim(),
        pair.player2.name.trim(),
      ]);
      const uniqueClassicNames = new Set(
        classicNames.map((name) => name.toLowerCase()),
      );
      if (uniqueClassicNames.size !== classicNames.length) {
        this.errors.push("Los nombres de todas las parejas deben ser únicos");
      }

      if (
        this.classicFormat === "groups-and-playoffs" &&
        this.pairs.length < 4
      ) {
        this.errors.push(
          "Grupos + playoffs necesita al menos 4 parejas completas",
        );
      }

      return this.errors.length === 0;
    }

    if (this.numberOfPlayers < 8) {
      this.errors.push("Debe haber al menos 8 jugadores");
    }

    if (this.numberOfPlayers % 4 !== 0) {
      this.errors.push("El número de jugadores debe ser múltiplo de 4");
    }

    if (this.numberOfRounds < 1) {
      this.errors.push("Debe haber al menos 1 ronda");
    }

    const emptyNames = this.players.filter((p) => !p.name.trim());
    if (emptyNames.length > 0) {
      this.errors.push("Todos los jugadores deben tener nombre");
    }

    const uniqueNames = new Set(
      this.players.map((p) => p.name.trim().toLowerCase()),
    );
    if (uniqueNames.size !== this.players.length) {
      this.errors.push("Los nombres de los jugadores deben ser únicos");
    }

    if (this.mode === "fixed-pairs") {
      this.convertPairsToPlayers();

      this.pairs.forEach((pair, index) => {
        if (!pair.player1.name.trim() || !pair.player2.name.trim()) {
          this.errors.push(
            `La pareja ${index + 1} debe tener ambos nombres completos`,
          );
        }
      });

      const allNames = this.pairs.flatMap((p) => [
        p.player1.name.trim(),
        p.player2.name.trim(),
      ]);
      const unique = new Set(allNames.map((n) => n.toLowerCase()));
      if (unique.size !== allNames.length) {
        this.errors.push("Los nombres de todos los jugadores deben ser únicos");
      }
    }

    return this.errors.length === 0;
  }

  setCompetitionType(type: CompetitionType): void {
    this.competitionType.set(type);
    this.errors = [];

    if (type === "americano") {
      this.mode = "free";
      this.pairs = [];
      this.players.forEach((player) => {
        player.pairId = undefined;
      });
      this.numberOfPlayers = Math.max(8, this.numberOfPlayers);
      this.onNumberOfPlayersChange();
      return;
    }

    this.mode = "free";
    this.numberOfPlayers = Math.max(4, this.numberOfPlayers);
    this.updateNumberOfPlayers();
  }

  handlePrimaryAction(): void {
    if (this.isClassic()) {
      this.generateClassicTournament();
      return;
    }

    this.generateTournament();
  }

  scrollToRoster(): void {
    this.rosterSection()?.nativeElement.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  generateTournament(): void {
    if (!this.validate()) return;

    this.loading = true;

    try {
      const config: TournamentConfig = {
        type: "americano",
        name: this.tournamentName,
        numberOfPlayers: this.numberOfPlayers,
        numberOfRounds: this.numberOfRounds,
        mode: this.mode,
        scoringMode: this.scoringMode,
        players: this.players,
      };

      const tournamentId = this.facade.generateTournament(config);
      this.router.navigate(["/tournament", tournamentId]);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Error al generar el americano";
      this.errors.push(message);
      this.loading = false;
    }
  }

  generateClassicTournament(): void {
    if (!this.validate()) return;

    this.loading = true;
    try {
      this.convertPairsToPlayers();
      const config: ClassicTournamentConfig = {
        type: "classic",
        name: this.tournamentName,
        numberOfPlayers: this.numberOfPlayers,
        format: this.classicFormat,
        seeded: this.classicSeeded,
        thirdPlaceMatch: this.classicThirdPlaceMatch,
        pairs: this.pairs.map((pair) => this.clonePair(pair)),
        players: this.players.map((player) => ({ ...player })),
      };

      const tournamentId = this.facade.generateClassicTournament(config);
      this.router.navigate(["/classic-tournament", tournamentId]);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Error al crear el torneo clásico";
      this.errors.push(message);
      this.loading = false;
    }
  }

  goToHistory(): void {
    this.facade.clearCurrentTournamentId();
    this.router.navigate(["/history"]);
  }

  clear(): void {
    if (confirm("¿Estás seguro de que quieres limpiar todos los datos?")) {
      this.facade.clearData();
      this.competitionType.set("americano");
      this.tournamentName = "";
      this.numberOfPlayers = 8;
      this.numberOfRounds = 3;
      this.mode = "free";
      this.classicFormat = "single-elimination";
      this.classicSeeded = true;
      this.classicThirdPlaceMatch = false;
      this.players = [];
      this.pairs = [];
      this.errors = [];
      this.updateNumberOfPlayers();
      this.notifications.showSuccess("Datos limpiados correctamente");
    }
  }

  private clonePair(pair: PairForm): Pair {
    return {
      id: pair.id,
      player1: { ...pair.player1 },
      player2: { ...pair.player2 },
    };
  }
}
