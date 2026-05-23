import { Component, OnInit, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TournamentFacade } from '@domain/tournament/data-access/tournament.facade';
import { Player, PairingMode, ScoringMode, TournamentConfig } from '@shared/models/player.model';
import { PrimaryButtonComponent } from '@shared/components/primary-button/primary-button.component';
import { SnackbarComponent, SnackbarType } from '@shared/components/snackbar/snackbar.component';
import { PlayerCardComponent } from '@domain/tournament/components/player-card/player-card.component';
import { PairCardComponent } from '@domain/tournament/components/pair-card/pair-card.component';

interface PairForm {
  id: number;
  player1: Player;
  player2: Player;
}

@Component({
  selector: 'app-player-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    PrimaryButtonComponent,
    SnackbarComponent,
    PlayerCardComponent,
    PairCardComponent,
  ],
  templateUrl: './player-form.component.html',
  styleUrl: './player-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerFormComponent implements OnInit {
  protected readonly facade = inject(TournamentFacade);
  private readonly router = inject(Router);

  numberOfPlayers = 8;
  numberOfRounds = 3;
  mode: PairingMode = 'free';
  scoringMode: ScoringMode = 'sets';
  players: Player[] = [];
  pairs: PairForm[] = [];
  errors: string[] = [];
  loading = false;
  showHistory = signal(false);
  snackbarMessage = signal('');
  snackbarType = signal<SnackbarType>('success');
  showSnackbar = signal(false);
  private snackbarTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    const config = this.facade.config();
    if (config) {
      this.numberOfPlayers = config.numberOfPlayers;
      this.numberOfRounds = config.numberOfRounds;
      this.mode = config.mode;
      this.scoringMode = config.scoringMode ?? 'sets';
      this.players = [...config.players];

      if (this.mode === 'fixed-pairs') {
        this.convertPlayersToPairs();
      }
    }

    if (this.players.length === 0) {
      this.updateNumberOfPlayers();
    }
  }

  convertPlayersToPairs(): void {
    this.pairs = [];
    const pairsMap = new Map<number, Player[]>();

    this.players.forEach(player => {
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
          position: 'either',
          pairId: newPairId,
        },
        player2: {
          id: baseId + 1,
          name: `Jugador ${baseId + 1}`,
          position: 'either',
          pairId: newPairId,
        },
      });
    }
  }

  convertPairsToPlayers(): void {
    this.players = [];
    this.pairs.forEach(pair => {
      pair.player1.pairId = pair.id;
      pair.player2.pairId = pair.id;
      this.players.push(pair.player1, pair.player2);
    });
  }

  updateNumberOfPlayers(): void {
    if (this.mode === 'fixed-pairs') {
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
              position: 'either',
              pairId: newPairId,
            },
            player2: {
              id: baseId + 1,
              name: `Jugador ${baseId + 1}`,
              position: 'either',
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
              ? Math.max(...this.players.map(p => p.id)) + 1
              : 1;
          this.players.push({
            id: newId,
            name: `Jugador ${newId}`,
            position: 'either',
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

  onModeChange(): void {
    if (this.mode === 'free') {
      this.players.forEach(p => (p.pairId = undefined));
      this.pairs = [];
    } else {
      this.convertPlayersToPairs();
    }
  }

  onPlayerUpdate(change: { id: number; name?: string; position?: Player['position'] }): void {
    const player = this.players.find(p => p.id === change.id);
    if (!player) return;
    if (change.name !== undefined) player.name = change.name;
    if (change.position !== undefined) player.position = change.position;
  }

  onPairUpdate(change: { pairId: number; playerId: number; name?: string; position?: Player['position'] }): void {
    const pair = this.pairs.find(p => p.id === change.pairId);
    if (!pair) return;
    const player =
      pair.player1.id === change.playerId ? pair.player1 : pair.player2;
    if (change.name !== undefined) player.name = change.name;
    if (change.position !== undefined) player.position = change.position;
  }

  validate(): boolean {
    this.errors = [];

    if (this.numberOfPlayers < 8) {
      this.errors.push('Debe haber al menos 8 jugadores');
    }

    if (this.numberOfPlayers % 4 !== 0) {
      this.errors.push('El número de jugadores debe ser múltiplo de 4');
    }

    if (this.numberOfRounds < 1) {
      this.errors.push('Debe haber al menos 1 ronda');
    }

    const emptyNames = this.players.filter(p => !p.name.trim());
    if (emptyNames.length > 0) {
      this.errors.push('Todos los jugadores deben tener nombre');
    }

    const uniqueNames = new Set(this.players.map(p => p.name.trim().toLowerCase()));
    if (uniqueNames.size !== this.players.length) {
      this.errors.push('Los nombres de los jugadores deben ser únicos');
    }

    if (this.mode === 'fixed-pairs') {
      this.convertPairsToPlayers();

      this.pairs.forEach((pair, index) => {
        if (!pair.player1.name.trim() || !pair.player2.name.trim()) {
          this.errors.push(
            `La pareja ${index + 1} debe tener ambos nombres completos`,
          );
        }
      });

      const allNames = this.pairs.flatMap(p => [
        p.player1.name.trim(),
        p.player2.name.trim(),
      ]);
      const unique = new Set(allNames.map(n => n.toLowerCase()));
      if (unique.size !== allNames.length) {
        this.errors.push(
          'Los nombres de todos los jugadores deben ser únicos',
        );
      }
    }

    return this.errors.length === 0;
  }

  generateTournament(): void {
    if (!this.validate()) return;

    this.loading = true;

    try {
      const config: TournamentConfig = {
        numberOfPlayers: this.numberOfPlayers,
        numberOfRounds: this.numberOfRounds,
        mode: this.mode,
        scoringMode: this.scoringMode,
        players: this.players,
      };

      this.facade.generateTournament(config);
      this.router.navigate(['/summary']);
    } catch (error: any) {
      this.errors.push(error.message || 'Error al generar el americano');
      this.loading = false;
    }
  }

  onLoadTournament(recordId: string): void {
    const record = this.facade.loadTournament(recordId);
    if (record) {
      this.numberOfPlayers = record.config.numberOfPlayers;
      this.numberOfRounds = record.config.numberOfRounds;
      this.mode = record.config.mode;
      this.scoringMode = record.config.scoringMode ?? 'sets';
      this.players = [...record.config.players];
      this.showHistory.set(false);

      if (this.mode === 'fixed-pairs') {
        this.convertPlayersToPairs();
      }
    }
  }

  onDeleteHistory(recordId: string): void {
    this.facade.deleteHistoryRecord(recordId);
    this.showSnack('Registro eliminado del historial', 'success');
  }

  toggleHistory(): void {
    this.showHistory.update(v => !v);
  }

  protected showSnack(message: string, type: SnackbarType): void {
    if (this.snackbarTimer) clearTimeout(this.snackbarTimer);
    this.snackbarMessage.set(message);
    this.snackbarType.set(type);
    this.showSnackbar.set(true);
    this.snackbarTimer = setTimeout(() => {
      this.showSnackbar.set(false);
    }, 5000);
  }

  protected dismissSnackbar(): void {
    if (this.snackbarTimer) clearTimeout(this.snackbarTimer);
    this.showSnackbar.set(false);
  }

  clear(): void {
    if (confirm('¿Estás seguro de que quieres limpiar todos los datos?')) {
      this.facade.clearData();
      this.numberOfPlayers = 8;
      this.numberOfRounds = 3;
      this.mode = 'free';
      this.players = [];
      this.pairs = [];
      this.errors = [];
      this.updateNumberOfPlayers();
    }
  }
}
