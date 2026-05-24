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

export type CompetitionType = 'americano' | 'classic';
export type ScoringMode = 'sets' | 'points';
export type ClassicTournamentFormat = 'single-elimination' | 'groups-and-playoffs';

export interface SetScore {
  pair1Games: number;
  pair2Games: number;
}

export interface MatchSlotSource {
  kind: 'winner' | 'loser';
  matchNumber: number;
}

export interface Match {
  number: number;
  round: number;
  pair1: [Player, Player];
  pair2: [Player, Player];
  pair1Source?: MatchSlotSource;
  pair2Source?: MatchSlotSource;
  scoringMode: ScoringMode;
  sets: SetScore[];
  scorePair1?: number;
  scorePair2?: number;
  completed?: boolean;
  winner?: 'pair1' | 'pair2';
}

export type PairingMode = 'free' | 'fixed-pairs';

export interface AmericanoTournamentConfig {
  type?: 'americano';
  name: string;
  numberOfPlayers: number;
  numberOfRounds: number;
  mode: PairingMode;
  scoringMode: ScoringMode;
  players: Player[];
}

export interface ClassicTournamentConfig {
  type: 'classic';
  name: string;
  numberOfPlayers: number;
  format: ClassicTournamentFormat;
  seeded: boolean;
  thirdPlaceMatch: boolean;
  pairs: Pair[];
  players: Player[];
}

export type TournamentConfig =
  | AmericanoTournamentConfig
  | ClassicTournamentConfig;

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
