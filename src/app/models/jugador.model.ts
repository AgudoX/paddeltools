export interface Player {
  id: number;
  name: string;
  position: 'derecha' | 'reves' | 'indiferente';
  pairId?: number;
}

export interface Pair {
  id: number;
  player1: Player;
  player2: Player;
}

export interface Match {
  number: number;
  round: number;
  pair1: [Player, Player];
  pair2: [Player, Player];
  scorePair1?: number;
  scorePair2?: number;
}

export type PairingMode = 'libre' | 'parejas-fijas';

export interface TournamentConfig {
  numberOfPlayers: number;
  numberOfRounds: number;
  mode: PairingMode;
  players: Player[];
}

export interface PlayerStats {
  player: Player;
  matchesPlayed: number;
  matchesWon: number;
  pointsFor: number;
  pointsAgainst: number;
  difference: number;
}

