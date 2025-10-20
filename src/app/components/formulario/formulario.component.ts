import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AmericanoService } from '../../services/americano.service';
import { Player, PairingMode, TournamentConfig } from '../../models/jugador.model';

interface PairForm {
  id: number;
  player1: Player;
  player2: Player;
}

@Component({
  selector: 'app-formulario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './formulario.component.html',
  styleUrl: './formulario.component.scss'
})
export class FormularioComponent implements OnInit {
  numberOfPlayers: number = 8;
  numberOfRounds: number = 3;
  mode: PairingMode = 'libre';
  players: Player[] = [];
  pairs: PairForm[] = [];
  errors: string[] = [];
  loading: boolean = false;

  constructor(
    private americanoService: AmericanoService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Load previous configuration if exists
    this.americanoService.config$.subscribe(config => {
      if (config) {
        this.numberOfPlayers = config.numberOfPlayers;
        this.numberOfRounds = config.numberOfRounds;
        this.mode = config.mode;
        this.players = [...config.players];
        
        // If mode is fixed pairs, convert players to pairs
        if (this.mode === 'parejas-fijas') {
          this.convertPlayersToPairs();
        }
      }
    });

    // If no players, initialize
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
    
    pairsMap.forEach((players, pairId) => {
      if (players.length === 2) {
        this.pairs.push({
          id: pairId,
          player1: players[0],
          player2: players[1]
        });
      }
    });
    
    // Ensure we have the correct number of pairs
    const expectedPairs = this.numberOfPlayers / 2;
    while (this.pairs.length < expectedPairs) {
      const newPairId = this.pairs.length + 1;
      const baseId = (this.pairs.length * 2) + 1;
      this.pairs.push({
        id: newPairId,
        player1: {
          id: baseId,
          name: `Jugador ${baseId}`,
          position: 'indiferente',
          pairId: newPairId
        },
        player2: {
          id: baseId + 1,
          name: `Jugador ${baseId + 1}`,
          position: 'indiferente',
          pairId: newPairId
        }
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
    if (this.mode === 'parejas-fijas') {
      // Update pairs
      const expectedPairs = this.numberOfPlayers / 2;
      const diff = expectedPairs - this.pairs.length;
      
      if (diff > 0) {
        // Add pairs
        for (let i = 0; i < diff; i++) {
          const newPairId = this.pairs.length + 1;
          const baseId = (this.pairs.length * 2) + 1;
          this.pairs.push({
            id: newPairId,
            player1: {
              id: baseId,
              name: `Jugador ${baseId}`,
              position: 'indiferente',
              pairId: newPairId
            },
            player2: {
              id: baseId + 1,
              name: `Jugador ${baseId + 1}`,
              position: 'indiferente',
              pairId: newPairId
            }
          });
        }
      } else if (diff < 0) {
        // Remove pairs
        this.pairs = this.pairs.slice(0, expectedPairs);
      }
      
      // Update players array from pairs
      this.convertPairsToPlayers();
    } else {
      // Free mode - update individual players
      const diff = this.numberOfPlayers - this.players.length;

      if (diff > 0) {
        // Add players
        for (let i = 0; i < diff; i++) {
          const newId = this.players.length > 0 
            ? Math.max(...this.players.map(p => p.id)) + 1 
            : 1;
          this.players.push({
            id: newId,
            name: `Jugador ${newId}`,
            position: 'indiferente',
            pairId: undefined
          });
        }
      } else if (diff < 0) {
        // Remove players
        this.players = this.players.slice(0, this.numberOfPlayers);
      }
    }
  }

  onNumberOfPlayersChange(): void {
    // Validate it's a multiple of 4
    if (this.numberOfPlayers % 4 !== 0) {
      this.numberOfPlayers = Math.max(8, Math.round(this.numberOfPlayers / 4) * 4);
    }
    
    if (this.numberOfPlayers < 8) {
      this.numberOfPlayers = 8;
    }

    this.updateNumberOfPlayers();
  }

  onModeChange(): void {
    if (this.mode === 'libre') {
      // Clear pair IDs
      this.players.forEach(p => p.pairId = undefined);
      this.pairs = [];
    } else {
      // Convert to pairs mode
      this.convertPlayersToPairs();
    }
  }


  validate(): boolean {
    this.errors = [];

    // Validate number of players
    if (this.numberOfPlayers < 8) {
      this.errors.push('Debe haber al menos 8 jugadores');
    }

    if (this.numberOfPlayers % 4 !== 0) {
      this.errors.push('El número de jugadores debe ser múltiplo de 4');
    }

    // Validate number of rounds
    if (this.numberOfRounds < 1) {
      this.errors.push('Debe haber al menos 1 ronda');
    }

    // Validate player names
    const emptyNames = this.players.filter(p => !p.name.trim());
    if (emptyNames.length > 0) {
      this.errors.push('Todos los jugadores deben tener nombre');
    }

    // Validate unique names
    const uniqueNames = new Set(this.players.map(p => p.name.trim().toLowerCase()));
    if (uniqueNames.size !== this.players.length) {
      this.errors.push('Los nombres de los jugadores deben ser únicos');
    }

    // Validate fixed pairs
    if (this.mode === 'parejas-fijas') {
      // Make sure we have the correct players array from pairs
      this.convertPairsToPlayers();
      
      // Validate each pair has names
      this.pairs.forEach((pair, index) => {
        if (!pair.player1.name.trim() || !pair.player2.name.trim()) {
          this.errors.push(`La pareja ${index + 1} debe tener ambos nombres completos`);
        }
      });
      
      // Validate unique names across all pairs
      const allNames = this.pairs.flatMap(p => [p.player1.name.trim(), p.player2.name.trim()]);
      const uniqueNames = new Set(allNames.map(n => n.toLowerCase()));
      if (uniqueNames.size !== allNames.length) {
        this.errors.push('Los nombres de todos los jugadores deben ser únicos');
      }
    }

    return this.errors.length === 0;
  }

  generateTournament(): void {
    if (!this.validate()) {
      return;
    }

    this.loading = true;

    try {
      const config: TournamentConfig = {
        numberOfPlayers: this.numberOfPlayers,
        numberOfRounds: this.numberOfRounds,
        mode: this.mode,
        players: this.players
      };

      this.americanoService.generateTournament(config);
      this.router.navigate(['/resumen']);
    } catch (error: any) {
      this.errors.push(error.message || 'Error al generar el americano');
      this.loading = false;
    }
  }

  clear(): void {
    if (confirm('¿Estás seguro de que quieres limpiar todos los datos?')) {
      this.americanoService.clearData();
      this.numberOfPlayers = 8;
      this.numberOfRounds = 3;
      this.mode = 'libre';
      this.players = [];
      this.pairs = [];
      this.errors = [];
      this.updateNumberOfPlayers();
    }
  }
}
