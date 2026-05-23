import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TournamentFacade } from '@domain/tournament/data-access/tournament.facade';
import { TournamentRecord, Match, PlayerStats } from '@shared/models/player.model';
import { PrimaryButtonComponent } from '@shared/components/primary-button/primary-button.component';
import { isSetComplete as _isSetComplete, isMatchComplete as _isMatchComplete, getMatchWinner as _getMatchWinner, getSetWinner as _getSetWinner } from '@domain/tournament/data-access/tournament.service';

@Component({
  selector: 'app-history-detail-page',
  standalone: true,
  imports: [CommonModule, MatIconModule, PrimaryButtonComponent],
  template: `
    <div class="detail-container">
      <div class="detail-card">
        @if (record) {
          <div class="header">
            <div class="header-left">
              <h1 class="main-title"><mat-icon>history</mat-icon> {{ record.label }}</h1>
              <span class="header-subtitle">
                {{ record.config.mode === 'fixed-pairs' ? 'Parejas fijas' : 'Libre' }}
                · {{ record.config.scoringMode === 'sets' ? 'Por sets' : 'Puntos directos' }}
                · {{ record.matches.length }} partidos
              </span>
            </div>
            <app-primary-button variant="outline-dark" icon="arrow_back" (clicked)="backToHistory()">
              Volver
            </app-primary-button>
          </div>

          <section class="section">
            <h2 class="section-title"><mat-icon>military_tech</mat-icon> Clasificación</h2>

            <div class="podium">
              @if (statistics.length > 1) {
                <div class="podium-slot second" style="animation-delay: 0.15s">
                  <div class="podium-card">
                    <div class="podium-pos-badge silver">2</div>
                    <div class="podium-medal">🥈</div>
                    <div class="podium-name">{{ statistics[1].player.name }}</div>
                    <div class="podium-record">{{ statistics[1].matchesWon }}G / {{ statistics[1].matchesPlayed }}PJ</div>
                    <div class="podium-diff">
                      <span class="diff-label">Sets</span>
                      <span [class.positive]="(statistics[1].setsWon - statistics[1].setsLost) >= 0">+{{ statistics[1].setsWon - statistics[1].setsLost }}</span>
                    </div>
                    <div class="podium-diff">
                      <span class="diff-label">Pts</span>
                      @let ptDiff2 = statistics[1].pointsFor - statistics[1].pointsAgainst;
                      <span [class.positive]="ptDiff2 >= 0" [class.negative]="ptDiff2 < 0">{{ ptDiff2 > 0 ? '+' : '' }}{{ ptDiff2 }}</span>
                    </div>
                  </div>
                  <div class="podium-bar silver"></div>
                </div>
              }

              @if (statistics.length > 0) {
                <div class="podium-slot first" style="animation-delay: 0s">
                  <div class="podium-crown">👑</div>
                  <div class="podium-card">
                    <div class="podium-pos-badge gold">1</div>
                    <div class="podium-medal">🥇</div>
                    <div class="podium-name">{{ statistics[0].player.name }}</div>
                    <div class="podium-record">{{ statistics[0].matchesWon }}G / {{ statistics[0].matchesPlayed }}PJ</div>
                    <div class="podium-diff">
                      <span class="diff-label">Sets</span>
                      <span [class.positive]="(statistics[0].setsWon - statistics[0].setsLost) >= 0">+{{ statistics[0].setsWon - statistics[0].setsLost }}</span>
                    </div>
                    <div class="podium-diff">
                      <span class="diff-label">Pts</span>
                      @let ptDiff1 = statistics[0].pointsFor - statistics[0].pointsAgainst;
                      <span [class.positive]="ptDiff1 >= 0" [class.negative]="ptDiff1 < 0">{{ ptDiff1 > 0 ? '+' : '' }}{{ ptDiff1 }}</span>
                    </div>
                  </div>
                  <div class="podium-bar gold"></div>
                </div>
              }

              @if (statistics.length > 2) {
                <div class="podium-slot third" style="animation-delay: 0.3s">
                  <div class="podium-card">
                    <div class="podium-pos-badge bronze">3</div>
                    <div class="podium-medal">🥉</div>
                    <div class="podium-name">{{ statistics[2].player.name }}</div>
                    <div class="podium-record">{{ statistics[2].matchesWon }}G / {{ statistics[2].matchesPlayed }}PJ</div>
                    <div class="podium-diff">
                      <span class="diff-label">Sets</span>
                      <span [class.positive]="(statistics[2].setsWon - statistics[2].setsLost) >= 0">+{{ statistics[2].setsWon - statistics[2].setsLost }}</span>
                    </div>
                    <div class="podium-diff">
                      <span class="diff-label">Pts</span>
                      @let ptDiff3 = statistics[2].pointsFor - statistics[2].pointsAgainst;
                      <span [class.positive]="ptDiff3 >= 0" [class.negative]="ptDiff3 < 0">{{ ptDiff3 > 0 ? '+' : '' }}{{ ptDiff3 }}</span>
                    </div>
                  </div>
                  <div class="podium-bar bronze"></div>
                </div>
              }
            </div>

            @if (statistics.length > 3) {
              <div class="ranking-table-wrap">
                <table class="ranking-table">
                  <thead>
                    <tr>
                      <th class="col-pos">#</th>
                      <th class="col-name">Jugador</th>
                      <th class="col-num" title="Jugados">PJ</th>
                      <th class="col-num" title="Ganados">G</th>
                      <th class="col-num" title="Sets a favor">SF</th>
                      <th class="col-num" title="Sets en contra">SC</th>
                      <th class="col-num" title="Puntos a favor">PF</th>
                      <th class="col-num" title="Puntos en contra">PC</th>
                      <th class="col-num" title="Diferencia">Dif</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (stats of statistics.slice(3); track stats; let i = $index) {
                      <tr [style.animation-delay]="(i * 0.04) + 's'">
                        <td class="col-pos">
                          <span class="pos-badge">{{ i + 4 }}</span>
                        </td>
                        <td class="col-name">{{ stats.player.name }}</td>
                        <td class="col-num">{{ stats.matchesPlayed }}</td>
                        <td class="col-num wins">{{ stats.matchesWon }}</td>
                        <td class="col-num">{{ stats.setsWon }}</td>
                        <td class="col-num">{{ stats.setsLost }}</td>
                        <td class="col-num">{{ stats.pointsFor }}</td>
                        <td class="col-num">{{ stats.pointsAgainst }}</td>
                        <td class="col-num diff" [class.positive]="stats.difference > 0" [class.negative]="stats.difference < 0">
                          {{ stats.difference > 0 ? '+' : '' }}{{ stats.difference }}
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </section>

          <section class="section">
            <h2 class="section-title"><mat-icon>emoji_events</mat-icon> Partidos por Rondas</h2>
            <div class="rounds-container">
              @for (roundNumber of rounds; track roundNumber) {
                <div class="round-section">
                  <h3 class="round-title">
                    Ronda {{ roundNumber }}
                    <span class="round-info">({{ matchesByRound.get(roundNumber)?.length }} partido(s))</span>
                  </h3>
                  <div class="matches-grid">
                    @for (match of matchesByRound.get(roundNumber); track trackMatch(match)) {
                      <div class="match-card">
                        <div class="match-header">
                          <span class="match-number">Partido {{ match.number }}</span>
                        </div>
                        <div class="match-body">
                          <div class="pair"
                            [class.winner]="matchWinner(match) === 'pair1'"
                            [class.loser]="matchWinner(match) === 'pair2'">
                            <div class="pair-players">
                              <span class="player-name">{{ match.pair1[0].name }}</span>
                              <span class="player-position">({{ match.pair1[0].position }})</span>
                              <span class="separator">&</span>
                              <span class="player-name">{{ match.pair1[1].name }}</span>
                              <span class="player-position">({{ match.pair1[1].position }})</span>
                            </div>
                            @if (match.scoringMode === 'sets') {
                              <div class="sets-display">
                                @for (set of match.sets; track trackSet($index)) {
                                  <span class="set-score-badge"
                                    [class.set-won]="set.pair1Games > set.pair2Games && isSetComplete(set)"
                                    [class.set-lost]="set.pair2Games > set.pair1Games && isSetComplete(set)">
                                    {{ set.pair1Games }}
                                  </span>
                                }
                                @if (match.sets.length === 0) {
                                  <span class="sets-empty">-</span>
                                }
                              </div>
                            } @else {
                              <div class="score">
                                @if (match.scorePair1 !== undefined) {
                                  <span class="points">{{ match.scorePair1 }}</span>
                                }
                              </div>
                            }
                          </div>
                          <div class="vs">VS</div>
                          <div class="pair"
                            [class.winner]="matchWinner(match) === 'pair2'"
                            [class.loser]="matchWinner(match) === 'pair1'">
                            <div class="pair-players">
                              <span class="player-name">{{ match.pair2[0].name }}</span>
                              <span class="player-position">({{ match.pair2[0].position }})</span>
                              <span class="separator">&</span>
                              <span class="player-name">{{ match.pair2[1].name }}</span>
                              <span class="player-position">({{ match.pair2[1].position }})</span>
                            </div>
                            @if (match.scoringMode === 'sets') {
                              <div class="sets-display">
                                @for (set of match.sets; track trackSet($index)) {
                                  <span class="set-score-badge"
                                    [class.set-won]="set.pair2Games > set.pair1Games && isSetComplete(set)"
                                    [class.set-lost]="set.pair1Games > set.pair2Games && isSetComplete(set)">
                                    {{ set.pair2Games }}
                                  </span>
                                }
                                @if (match.sets.length === 0) {
                                  <span class="sets-empty">-</span>
                                }
                              </div>
                            } @else {
                              <div class="score">
                                @if (match.scorePair2 !== undefined) {
                                  <span class="points">{{ match.scorePair2 }}</span>
                                }
                              </div>
                            }
                          </div>
                        </div>
                        @if (hasWinner(match)) {
                          <div class="winner-banner">
                            <mat-icon>emoji_events</mat-icon>
                            Ganadores: {{ getWinners(match) }}
                            @if (getMatchScoreDisplay(match); as score) {
                              <span class="winner-score">({{ score }})</span>
                            }
                          </div>
                        }
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </section>
        } @else {
          <div class="empty-state">
            <mat-icon class="empty-icon">search_off</mat-icon>
            <p>Torneo no encontrado.</p>
            <app-primary-button variant="outline-dark" icon="arrow_back" (clicked)="backToHistory()">
              Volver al historial
            </app-primary-button>
          </div>
        }
      </div>
    </div>
  `,
  styleUrl: './history-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HistoryDetailPageComponent implements OnInit {
  private readonly facade = inject(TournamentFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  record: TournamentRecord | null = null;
  statistics: PlayerStats[] = [];
  matchesByRound: Map<number, Match[]> = new Map();
  rounds: number[] = [];
  protected readonly isSetComplete = _isSetComplete;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.record = this.facade.loadTournament(id);
      if (this.record) {
        this.statistics = this.facade.calculateStatistics();
        this.groupMatchesByRound();
      }
    }
  }

  groupMatchesByRound(): void {
    if (!this.record) return;
    this.matchesByRound.clear();
    this.rounds = [];
    this.record.matches.forEach(match => {
      if (!this.matchesByRound.has(match.round)) {
        this.matchesByRound.set(match.round, []);
        this.rounds.push(match.round);
      }
      this.matchesByRound.get(match.round)?.push(match);
    });
    this.rounds.sort((a, b) => a - b);
  }

  matchWinner(match: Match): 'pair1' | 'pair2' | null {
    if (match.scoringMode === 'sets') {
      return _getMatchWinner(match.sets);
    }
    if (!this.hasWinner(match)) return null;
    return (match.scorePair1 ?? 0) > (match.scorePair2 ?? 0) ? 'pair1' : 'pair2';
  }

  hasWinner(match: Match): boolean {
    if (match.scoringMode === 'sets' && match.sets.length > 0) {
      return _isMatchComplete(match.sets);
    }
    return match.scorePair1 !== undefined &&
           match.scorePair2 !== undefined &&
           match.scorePair1 !== match.scorePair2;
  }

  getWinners(match: Match): string {
    if (match.scoringMode === 'sets') {
      const winner = _getMatchWinner(match.sets);
      if (!winner) return '';
      const pair = winner === 'pair1' ? match.pair1 : match.pair2;
      return `${pair[0].name} & ${pair[1].name}`;
    }
    if (!this.hasWinner(match)) return '';
    if ((match.scorePair1 ?? 0) > (match.scorePair2 ?? 0)) {
      return `${match.pair1[0].name} & ${match.pair1[1].name}`;
    }
    return `${match.pair2[0].name} & ${match.pair2[1].name}`;
  }

  getMatchScoreDisplay(match: Match): string {
    if (match.scoringMode === 'sets') {
      const completed = _isMatchComplete(match.sets);
      if (!completed) return '';
      const winner = _getMatchWinner(match.sets);
      if (!winner) return '';
      let p1Sets = 0, p2Sets = 0;
      for (const s of match.sets) {
        const w = _getSetWinner(s);
        if (w === 'pair1') p1Sets++;
        else if (w === 'pair2') p2Sets++;
      }
      return `${p1Sets}-${p2Sets}`;
    }
    return `${match.scorePair1}-${match.scorePair2}`;
  }

  trackMatch(m: Match): number {
    return m.number;
  }

  trackSet(_idx: number): number {
    return _idx;
  }

  backToHistory(): void {
    this.router.navigate(['/history']);
  }
}
