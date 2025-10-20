import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  Player,
  Match,
  TournamentConfig,
  PairingMode,
  PlayerStats
} from '../models/jugador.model';

@Injectable({
  providedIn: 'root'
})
export class AmericanoService {
  private readonly STORAGE_KEY = 'paddletools_config';
  private readonly MATCHES_KEY = 'paddletools_matches';
  
  private configSubject = new BehaviorSubject<TournamentConfig | null>(null);
  private matchesSubject = new BehaviorSubject<Match[]>([]);
  
  config$: Observable<TournamentConfig | null> = this.configSubject.asObservable();
  matches$: Observable<Match[]> = this.matchesSubject.asObservable();

  constructor() {
    this.loadFromLocalStorage();
  }

  generateTournament(config: TournamentConfig): Match[] {
    const { players, numberOfRounds, mode } = config;
    
    // Validate
    if (players.length < 8 || players.length % 4 !== 0) {
      throw new Error('El número de jugadores debe ser múltiplo de 4 y mínimo 8');
    }

    if (numberOfRounds < 1) {
      throw new Error('Debe haber al menos 1 ronda');
    }

    let matches: Match[] = [];

    if (mode === 'parejas-fijas') {
      matches = this.generateWithFixedPairs(players, numberOfRounds);
    } else {
      matches = this.generateFreeMode(players, numberOfRounds);
    }

    // Save configuration and matches
    this.configSubject.next(config);
    this.matchesSubject.next(matches);
    this.saveToLocalStorage(config, matches);

    return matches;
  }

  private generateFreeMode(players: Player[], numberOfRounds: number): Match[] {
    const matches: Match[] = [];
    const previousPartnerships = new Map<string, Set<number>>();
    const previousOpponents = new Map<string, Set<number>>();
    
    // Initialize tracking of previous partnerships and opponents
    players.forEach(p => {
      previousPartnerships.set(p.id.toString(), new Set<number>());
      previousOpponents.set(p.id.toString(), new Set<number>());
    });

    const matchCount = new Map<number, number>();
    players.forEach(p => matchCount.set(p.id, 0));

    const matchesPerRound = players.length / 4;
    let globalMatchNumber = 1;

    // Generate rounds
    for (let round = 0; round < numberOfRounds; round++) {
      const availablePlayers = [...players];
      const roundMatches: Match[] = [];

      // Generate matches for this round (all players play simultaneously)
      for (let matchInRound = 0; matchInRound < matchesPerRound; matchInRound++) {
        // Select 4 players trying to balance positions, play count, and avoid repeated matchups
        const matchPlayers = this.selectBestFourPlayers(
          availablePlayers,
          matchCount,
          previousOpponents
        );
        
        // Remove selected players from available pool for this round
        matchPlayers.forEach(mp => {
          const index = availablePlayers.findIndex(p => p.id === mp.id);
          if (index > -1) {
            availablePlayers.splice(index, 1);
          }
        });
        
        // Try to form pairs that haven't played together before and haven't faced each other
        let bestCombination = this.findBestPairCombination(
          matchPlayers,
          previousPartnerships,
          previousOpponents
        );

        const [p1, p2, p3, p4] = bestCombination;

        // Register partnerships
        previousPartnerships.get(p1.id.toString())?.add(p2.id);
        previousPartnerships.get(p2.id.toString())?.add(p1.id);
        previousPartnerships.get(p3.id.toString())?.add(p4.id);
        previousPartnerships.get(p4.id.toString())?.add(p3.id);

        // Register opponents (each player vs the two players in the opposite pair)
        // Pair 1 (p1, p2) vs Pair 2 (p3, p4)
        previousOpponents.get(p1.id.toString())?.add(p3.id);
        previousOpponents.get(p1.id.toString())?.add(p4.id);
        previousOpponents.get(p2.id.toString())?.add(p3.id);
        previousOpponents.get(p2.id.toString())?.add(p4.id);
        
        previousOpponents.get(p3.id.toString())?.add(p1.id);
        previousOpponents.get(p3.id.toString())?.add(p2.id);
        previousOpponents.get(p4.id.toString())?.add(p1.id);
        previousOpponents.get(p4.id.toString())?.add(p2.id);

        // Increment count
        matchPlayers.forEach(p => {
          matchCount.set(p.id, (matchCount.get(p.id) || 0) + 1);
        });

        roundMatches.push({
          number: globalMatchNumber++,
          round: round + 1,
          pair1: [p1, p2],
          pair2: [p3, p4]
        });
      }

      matches.push(...roundMatches);
    }

    return matches;
  }

  private selectBestFourPlayers(
    availablePlayers: Player[],
    matchCount: Map<number, number>,
    previousOpponents: Map<string, Set<number>>
  ): Player[] {
    // Sort players by matches played
    const sortedByMatches = [...availablePlayers].sort((a, b) => {
      const countA = matchCount.get(a.id) || 0;
      const countB = matchCount.get(b.id) || 0;
      return countA - countB;
    });

    // If we have 4 or fewer players, return them all
    if (sortedByMatches.length <= 4) {
      return sortedByMatches;
    }

    // Try to get a balanced mix of positions
    // Priority: players with least matches + balanced positions + avoid repeated opponents
    const candidates = sortedByMatches.slice(0, Math.min(8, sortedByMatches.length));
    
    // Try different combinations of 4 players from candidates
    let bestGroup: Player[] = candidates.slice(0, 4);
    let bestScore = this.evaluateGroupScore(bestGroup, matchCount, previousOpponents);

    // Only evaluate combinations if we have enough candidates
    if (candidates.length >= 4) {
      for (let i = 0; i < candidates.length - 3; i++) {
        for (let j = i + 1; j < candidates.length - 2; j++) {
          for (let k = j + 1; k < candidates.length - 1; k++) {
            for (let l = k + 1; l < candidates.length; l++) {
              const group = [candidates[i], candidates[j], candidates[k], candidates[l]];
              const score = this.evaluateGroupScore(group, matchCount, previousOpponents);
              
              if (score < bestScore) {
                bestScore = score;
                bestGroup = group;
              }
            }
          }
        }
      }
    }

    return bestGroup;
  }

  private evaluateGroupScore(
    players: Player[],
    matchCount: Map<number, number>,
    previousOpponents: Map<string, Set<number>>
  ): number {
    let score = 0;
    
    // 1. Position balance (0-100 points)
    score += this.evaluatePositionBalance(players);
    
    // 2. Match count variance (0-50 points)
    const matchCounts = players.map(p => matchCount.get(p.id) || 0);
    const variance = Math.max(...matchCounts) - Math.min(...matchCounts);
    score += variance * 5;
    
    // 3. Previous opponents penalty (0-400 points)
    // Check how many times these 4 players have faced each other before
    let opponentRepetitions = 0;
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        const p1 = players[i];
        const p2 = players[j];
        if (previousOpponents.get(p1.id.toString())?.has(p2.id)) {
          opponentRepetitions++;
        }
      }
    }
    // Each repeated opponent matchup adds 100 points penalty
    score += opponentRepetitions * 100;
    
    return score;
  }

  private evaluatePositionBalance(players: Player[]): number {
    let score = 0;
    const positions = players.map(p => p.position);
    
    // Count positions
    const derechaCount = positions.filter(p => p === 'derecha').length;
    const revesCount = positions.filter(p => p === 'reves').length;
    const indiferenteCount = positions.filter(p => p === 'indiferente').length;
    
    // Ideal: 2 derecha + 2 revés, or mix with indiferente
    // Worst: 3 or 4 of the same position
    if (derechaCount === 4 || revesCount === 4) {
      score += 100; // Very bad: all same position
    } else if (derechaCount === 3 || revesCount === 3) {
      score += 50; // Bad: 3 of same position
    } else if (derechaCount === 2 && revesCount === 2) {
      score += 0; // Perfect: balanced
    } else if (indiferenteCount >= 2) {
      score += 5; // Good: flexible players help balance
    } else {
      score += 20; // Suboptimal but workable
    }
    
    return score;
  }

  private findBestPairCombination(
    players: Player[],
    previousPartnerships: Map<string, Set<number>>,
    previousOpponents: Map<string, Set<number>>
  ): Player[] {
    // Generate all possible ways to pair 4 players into 2 pairs
    const combinations = [
      [players[0], players[1], players[2], players[3]], // P1-P2 vs P3-P4
      [players[0], players[2], players[1], players[3]], // P1-P3 vs P2-P4
      [players[0], players[3], players[1], players[2]]  // P1-P4 vs P2-P3
    ];

    let bestCombination = combinations[0];
    let lowestScore = Number.MAX_SAFE_INTEGER;

    for (const combo of combinations) {
      let score = 0;
      
      // Priority 1: Check if pair 1 has played together (highest priority)
      if (previousPartnerships.get(combo[0].id.toString())?.has(combo[1].id)) {
        score += 10000; // Very heavy penalty for repeated partnerships
      }
      
      // Priority 1: Check if pair 2 has played together (highest priority)
      if (previousPartnerships.get(combo[2].id.toString())?.has(combo[3].id)) {
        score += 10000; // Very heavy penalty for repeated partnerships
      }

      // Priority 2: Check if these pairs have faced each other as opponents before
      // Pair 1: combo[0] + combo[1] vs Pair 2: combo[2] + combo[3]
      let opponentRepetitions = 0;
      
      // Check if players in pair 1 have faced players in pair 2
      if (previousOpponents.get(combo[0].id.toString())?.has(combo[2].id)) opponentRepetitions++;
      if (previousOpponents.get(combo[0].id.toString())?.has(combo[3].id)) opponentRepetitions++;
      if (previousOpponents.get(combo[1].id.toString())?.has(combo[2].id)) opponentRepetitions++;
      if (previousOpponents.get(combo[1].id.toString())?.has(combo[3].id)) opponentRepetitions++;
      
      // Each repeated opponent adds significant penalty (but less than repeated partnership)
      score += opponentRepetitions * 1000;

      // Priority 3: Check position compatibility for pair 1 (lower priority)
      const pair1Score = this.evaluatePairPositions(combo[0], combo[1]);
      score += pair1Score;
      
      // Priority 3: Check position compatibility for pair 2 (lower priority)
      const pair2Score = this.evaluatePairPositions(combo[2], combo[3]);
      score += pair2Score;

      if (score < lowestScore) {
        lowestScore = score;
        bestCombination = combo;
      }
    }

    return bestCombination;
  }

  private evaluatePairPositions(player1: Player, player2: Player): number {
    const pos1 = player1.position;
    const pos2 = player2.position;
    
    // Best case: one derecha and one reves (complementary)
    if ((pos1 === 'derecha' && pos2 === 'reves') || 
        (pos1 === 'reves' && pos2 === 'derecha')) {
      return 0; // Perfect match
    }
    
    // Both indiferente (very flexible)
    if (pos1 === 'indiferente' && pos2 === 'indiferente') {
      return 3; // Very flexible, slightly better than one indiferente
    }
    
    // One is indiferente (flexible)
    if (pos1 === 'indiferente' || pos2 === 'indiferente') {
      return 5; // Flexible, good
    }
    
    // Worst case: both same position (derecha-derecha or reves-reves)
    if (pos1 === pos2) {
      return 100; // High penalty for same position
    }
    
    return 10; // Default penalty (shouldn't reach here)
  }

  private generateWithFixedPairs(players: Player[], numberOfRounds: number): Match[] {
    const matches: Match[] = [];
    
    // Group players by pairs
    const fixedPairs = new Map<number, Player[]>();
    const freePlayers: Player[] = [];

    players.forEach(p => {
      if (p.pairId !== undefined && p.pairId !== null) {
        if (!fixedPairs.has(p.pairId)) {
          fixedPairs.set(p.pairId, []);
        }
        fixedPairs.get(p.pairId)?.push(p);
      } else {
        freePlayers.push(p);
      }
    });

    // Convert pairs to array
    const pairs: [Player, Player][] = [];
    fixedPairs.forEach((pairPlayers) => {
      if (pairPlayers.length === 2) {
        pairs.push([pairPlayers[0], pairPlayers[1]]);
      }
    });

    // Form pairs with free players
    for (let i = 0; i < freePlayers.length; i += 2) {
      if (i + 1 < freePlayers.length) {
        pairs.push([freePlayers[i], freePlayers[i + 1]]);
      }
    }

    if (pairs.length < 2) {
      throw new Error('No hay suficientes parejas para generar partidos');
    }

    const matchesPerRound = pairs.length / 2;
    
    if (pairs.length % 2 !== 0) {
      throw new Error('El número de parejas debe ser par para generar rondas completas');
    }

    // Generate matches rotating pairs
    const previousMatchups = new Map<string, Set<string>>();
    pairs.forEach((_, idx) => {
      previousMatchups.set(idx.toString(), new Set<string>());
    });

    let globalMatchNumber = 1;

    for (let round = 0; round < numberOfRounds; round++) {
      const availablePairs = [...Array(pairs.length).keys()];
      
      // Generate matches for this round
      for (let matchInRound = 0; matchInRound < matchesPerRound; matchInRound++) {
        let pair1Idx = -1;
        let pair2Idx = -1;
        let fewestMatchups = Number.MAX_SAFE_INTEGER;

        // Find the best pair combination that hasn't played or has played the least
        for (let i = 0; i < availablePairs.length; i++) {
          for (let j = i + 1; j < availablePairs.length; j++) {
            const p1 = availablePairs[i];
            const p2 = availablePairs[j];
            
            if (!previousMatchups.get(p1.toString())?.has(p2.toString())) {
              const matchups1 = previousMatchups.get(p1.toString())?.size || 0;
              const matchups2 = previousMatchups.get(p2.toString())?.size || 0;
              const total = matchups1 + matchups2;
              
              if (total < fewestMatchups) {
                fewestMatchups = total;
                pair1Idx = p1;
                pair2Idx = p2;
              }
            }
          }
        }

        // If no new combination found, take the first available
        if (pair1Idx === -1 && availablePairs.length >= 2) {
          pair1Idx = availablePairs[0];
          pair2Idx = availablePairs[1];
        }

        if (pair1Idx === -1 || pair2Idx === -1) {
          break; // No more pairs available for this round
        }

        // Register matchup
        previousMatchups.get(pair1Idx.toString())?.add(pair2Idx.toString());
        previousMatchups.get(pair2Idx.toString())?.add(pair1Idx.toString());

        // Remove used pairs from available pool for this round
        availablePairs.splice(availablePairs.indexOf(pair1Idx), 1);
        availablePairs.splice(availablePairs.indexOf(pair2Idx), 1);

        matches.push({
          number: globalMatchNumber++,
          round: round + 1,
          pair1: pairs[pair1Idx],
          pair2: pairs[pair2Idx]
        });
      }
    }

    return matches;
  }

  generateSummary(matches: Match[]): string {
    let summary = '🏓 AMERICANO DE PÁDEL 🏓\n\n';
    
    // Group matches by round
    const matchesByRound = new Map<number, Match[]>();
    matches.forEach(match => {
      if (!matchesByRound.has(match.round)) {
        matchesByRound.set(match.round, []);
      }
      matchesByRound.get(match.round)?.push(match);
    });
    
    // Sort rounds
    const rounds = Array.from(matchesByRound.keys()).sort((a, b) => a - b);
    
    // Generate summary by rounds
    rounds.forEach(roundNumber => {
      const roundMatches = matchesByRound.get(roundNumber) || [];
      summary += `━━━ RONDA ${roundNumber} ━━━\n`;
      summary += `(${roundMatches.length} partido(s) simultáneo(s))\n\n`;
      
      roundMatches.forEach(match => {
        const [p1, p2] = match.pair1;
        const [p3, p4] = match.pair2;
        
        let line = `Partido ${match.number}: [${p1.name}, ${p2.name}] vs [${p3.name}, ${p4.name}]`;
        
        if (match.scorePair1 !== undefined && match.scorePair2 !== undefined) {
          line += ` - ${match.scorePair1}:${match.scorePair2}`;
        }
        
        summary += line + '\n';
      });
      
      summary += '\n';
    });

    return summary;
  }

  updateScore(matchNumber: number, scorePair1: number, scorePair2: number): void {
    const matches = this.matchesSubject.value;
    const match = matches.find(m => m.number === matchNumber);
    
    if (match) {
      match.scorePair1 = scorePair1;
      match.scorePair2 = scorePair2;
      this.matchesSubject.next([...matches]);
      
      const config = this.configSubject.value;
      if (config) {
        this.saveToLocalStorage(config, matches);
      }
    }
  }

  calculateStatistics(): PlayerStats[] {
    const matches = this.matchesSubject.value;
    const config = this.configSubject.value;
    
    if (!config) return [];

    const statistics = new Map<number, PlayerStats>();

    // Initialize statistics
    config.players.forEach(player => {
      statistics.set(player.id, {
        player,
        matchesPlayed: 0,
        matchesWon: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        difference: 0
      });
    });

    // Calculate statistics for each match
    matches.forEach(match => {
      if (match.scorePair1 !== undefined && match.scorePair2 !== undefined) {
        const [p1, p2] = match.pair1;
        const [p3, p4] = match.pair2;

        // Update pair 1
        const stats1_1 = statistics.get(p1.id)!;
        const stats1_2 = statistics.get(p2.id)!;
        stats1_1.matchesPlayed++;
        stats1_2.matchesPlayed++;
        stats1_1.pointsFor += match.scorePair1;
        stats1_2.pointsFor += match.scorePair1;
        stats1_1.pointsAgainst += match.scorePair2;
        stats1_2.pointsAgainst += match.scorePair2;

        // Update pair 2
        const stats2_1 = statistics.get(p3.id)!;
        const stats2_2 = statistics.get(p4.id)!;
        stats2_1.matchesPlayed++;
        stats2_2.matchesPlayed++;
        stats2_1.pointsFor += match.scorePair2;
        stats2_2.pointsFor += match.scorePair2;
        stats2_1.pointsAgainst += match.scorePair1;
        stats2_2.pointsAgainst += match.scorePair1;

        // Determine winners
        if (match.scorePair1 > match.scorePair2) {
          stats1_1.matchesWon++;
          stats1_2.matchesWon++;
        } else if (match.scorePair2 > match.scorePair1) {
          stats2_1.matchesWon++;
          stats2_2.matchesWon++;
        }
      }
    });

    // Calculate differences
    statistics.forEach(stats => {
      stats.difference = stats.pointsFor - stats.pointsAgainst;
    });

    // Sort by matches won and difference
    return Array.from(statistics.values()).sort((a, b) => {
      if (b.matchesWon !== a.matchesWon) {
        return b.matchesWon - a.matchesWon;
      }
      return b.difference - a.difference;
    });
  }

  private saveToLocalStorage(config: TournamentConfig, matches: Match[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
      localStorage.setItem(this.MATCHES_KEY, JSON.stringify(matches));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }

  private loadFromLocalStorage(): void {
    try {
      const configStr = localStorage.getItem(this.STORAGE_KEY);
      const matchesStr = localStorage.getItem(this.MATCHES_KEY);
      
      if (configStr) {
        const config = JSON.parse(configStr);
        this.configSubject.next(config);
      }
      
      if (matchesStr) {
        const matches = JSON.parse(matchesStr);
        this.matchesSubject.next(matches);
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
  }

  clearData(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.MATCHES_KEY);
    this.configSubject.next(null);
    this.matchesSubject.next([]);
  }
}

