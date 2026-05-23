export interface Player {
  id: number;
  name: string;
  position: 'right' | 'backhand' | 'either';
  pairId?: number;
}

export interface Pair {
  id: number;
  player1: Player;
  player2: Player;
}

export type ScoringMode = 'sets' | 'points';

export interface SetScore {
  pair1Games: number;
  pair2Games: number;
}

export interface Match {
  number: number;
  round: number;
  pair1: [Player, Player];
  pair2: [Player, Player];
  scoringMode: ScoringMode;
  sets: SetScore[];
  scorePair1?: number;
  scorePair2?: number;
  completed?: boolean;
  winner?: 'pair1' | 'pair2';
}

export type PairingMode = 'free' | 'fixed-pairs';

export interface TournamentConfig {
  numberOfPlayers: number;
  numberOfRounds: number;
  mode: PairingMode;
  scoringMode: ScoringMode;
  players: Player[];
}

export interface PlayerStats {
  player: Player;
  matchesPlayed: number;
  matchesWon: number;
  setsWon: number;
  setsLost: number;
  pointsFor: number;
  pointsAgainst: number;
  difference: number;
}

export interface TournamentRecord {
  id: string;
  createdAt: string;
  label: string;
  config: TournamentConfig;
  matches: Match[];
}
