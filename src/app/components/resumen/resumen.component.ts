import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AmericanoService } from '../../services/americano.service';
import { Match, PlayerStats } from '../../models/jugador.model';

@Component({
  selector: 'app-resumen',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './resumen.component.html',
  styleUrl: './resumen.component.scss'
})
export class ResumenComponent implements OnInit {
  @ViewChild('statisticsSection') statisticsSection?: ElementRef;
  
  matches: Match[] = [];
  statistics: PlayerStats[] = [];
  showStatistics: boolean = false;
  copiedMessage: boolean = false;
  editingMatch: number | null = null;
  matchesByRound: Map<number, Match[]> = new Map();
  rounds: number[] = [];
  originalScores: Map<number, { scorePair1?: number; scorePair2?: number }> = new Map();

  constructor(
    private americanoService: AmericanoService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.americanoService.matches$.subscribe(matches => {
      this.matches = matches;
      if (matches.length === 0) {
        this.router.navigate(['/']);
      } else {
        this.groupMatchesByRound();
      }
    });

    this.updateStatistics();
  }

  groupMatchesByRound(): void {
    this.matchesByRound.clear();
    this.rounds = [];
    
    this.matches.forEach(match => {
      if (!this.matchesByRound.has(match.round)) {
        this.matchesByRound.set(match.round, []);
        this.rounds.push(match.round);
      }
      this.matchesByRound.get(match.round)?.push(match);
    });
    
    this.rounds.sort((a, b) => a - b);
  }

  copySummary(): void {
    const summary = this.americanoService.generateSummary(this.matches);
    
    navigator.clipboard.writeText(summary).then(() => {
      this.copiedMessage = true;
      setTimeout(() => {
        this.copiedMessage = false;
      }, 2000);
    }).catch(err => {
      console.error('Error copying to clipboard:', err);
      alert('No se pudo copiar al portapapeles');
    });
  }

  shareWhatsApp(): void {
    const summary = this.americanoService.generateSummary(this.matches);
    const url = `https://wa.me/?text=${encodeURIComponent(summary)}`;
    window.open(url, '_blank');
  }

  backToForm(): void {
    this.router.navigate(['/']);
  }

  toggleStatistics(): void {
    this.showStatistics = !this.showStatistics;
    if (this.showStatistics) {
      this.updateStatistics();
      // Scroll to statistics section after it's rendered
      setTimeout(() => {
        this.statisticsSection?.nativeElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 100);
    }
  }

  editScore(matchNumber: number): void {
    const match = this.matches.find(m => m.number === matchNumber);
    if (match) {
      // Save original scores before editing
      this.originalScores.set(matchNumber, {
        scorePair1: match.scorePair1,
        scorePair2: match.scorePair2
      });
    }
    this.editingMatch = matchNumber;
  }

  saveScore(match: Match): void {
    if (match.scorePair1 !== undefined && match.scorePair2 !== undefined) {
      this.americanoService.updateScore(
        match.number,
        match.scorePair1,
        match.scorePair2
      );
      // Clean up saved scores after successful save
      if (this.editingMatch !== null) {
        this.originalScores.delete(this.editingMatch);
      }
      this.editingMatch = null;
      this.updateStatistics();
    }
  }

  cancelEdit(): void {
    if (this.editingMatch !== null) {
      const match = this.matches.find(m => m.number === this.editingMatch);
      const originalScore = this.originalScores.get(this.editingMatch!);
      
      if (match && originalScore) {
        // Restore original scores
        match.scorePair1 = originalScore.scorePair1;
        match.scorePair2 = originalScore.scorePair2;
      }
      
      this.originalScores.delete(this.editingMatch);
    }
    
    this.editingMatch = null;
  }

  updateStatistics(): void {
    this.statistics = this.americanoService.calculateStatistics();
  }

  hasWinner(match: Match): boolean {
    return match.scorePair1 !== undefined && 
           match.scorePair2 !== undefined &&
           match.scorePair1 !== match.scorePair2;
  }

  getWinners(match: Match): string {
    if (!this.hasWinner(match)) return '';
    
    if (match.scorePair1! > match.scorePair2!) {
      return `${match.pair1[0].name} & ${match.pair1[1].name}`;
    } else {
      return `${match.pair2[0].name} & ${match.pair2[1].name}`;
    }
  }
}