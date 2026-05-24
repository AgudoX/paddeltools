import { Injectable } from "@angular/core";
import { jsPDF } from "jspdf";
import {
  ClassicTournamentConfig,
  Match,
  Player,
} from "@shared/models/player.model";

@Injectable({ providedIn: "root" })
export class TournamentPdfService {
  private static readonly MARGIN = 14;
  private static readonly PAGE_W = 297;
  private static readonly PAGE_H = 210;
  private static readonly USABLE_W =
    TournamentPdfService.PAGE_W - TournamentPdfService.MARGIN * 2;
  private static readonly USABLE_H =
    TournamentPdfService.PAGE_H - TournamentPdfService.MARGIN * 2;

  exportClassicBracket(
    config: ClassicTournamentConfig,
    matches: Match[],
    tournamentName: string,
  ): void {
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const ml = TournamentPdfService.MARGIN;
    const usableW = TournamentPdfService.USABLE_W;
    const usableH = TournamentPdfService.USABLE_H;

    // Background
    this.fillRect(
      pdf,
      0,
      0,
      TournamentPdfService.PAGE_W,
      TournamentPdfService.PAGE_H,
      "#120f18",
    );

    // ── Header ──
    let y = ml + 6;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(177, 76, 255);
    pdf.text("TORNEO CLASICO", ml, y);

    y += 10.5;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(24);
    pdf.setTextColor(255, 255, 255);
    pdf.text(config.name || "Cuadro clasico", ml, y);

    y += 6.5;
    const seededText = config.seeded
      ? "Con cabezas de serie"
      : "Sin cabezas de serie";
    const thirdPlaceText = config.thirdPlaceMatch
      ? "Incluye 3er puesto"
      : "Sin 3er puesto";
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(180, 180, 180);
    pdf.text(
      `${config.pairs.length} parejas  ·  ${seededText}  ·  ${thirdPlaceText}`,
      ml,
      y,
    );

    y += 5;
    pdf.setDrawColor(177, 76, 255);
    pdf.setLineWidth(0.3);
    pdf.line(ml, y, ml + usableW, y);

    y += 6;

    // ── Pairs section ──
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(177, 76, 255);
    pdf.text("PAREJAS PARTICIPANTES", ml, y);

    y += 4.5;
    const pairsPerRow = Math.min(4, config.pairs.length);
    const pairColW = usableW / pairsPerRow;
    config.pairs.forEach((pair, i) => {
      const col = i % pairsPerRow;
      const row = Math.floor(i / pairsPerRow);
      const px = ml + col * pairColW;
      const py = y + row * 4.5;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);
      pdf.setTextColor(177, 76, 255);
      pdf.text(`#${pair.id}`, px + 1, py);

      const label =
        pair.player1.name === pair.player2.name
          ? pair.player1.name
          : `${pair.player1.name} & ${pair.player2.name}`;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.setTextColor(255, 255, 255);
      pdf.text(label, px + 7, py);
    });

    const pairRows = Math.ceil(config.pairs.length / pairsPerRow);
    y += pairRows * 4.5 + 4;

    // ── Bracket grid ──
    const byRound = new Map<number, Match[]>();
    const roundList: number[] = [];
    matches.forEach((m) => {
      if (!byRound.has(m.round)) {
        byRound.set(m.round, []);
        roundList.push(m.round);
      }
      byRound.get(m.round)?.push(m);
    });
    roundList.sort((a, b) => a - b);

    if (roundList.length === 0) {
      pdf.save(this.buildFilename(tournamentName));
      return;
    }

    const bracketTopY = y + 2;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(177, 76, 255);
    pdf.text("CUADRO DEL TORNEO", ml, bracketTopY);

    const gridY0 = bracketTopY + 5;
    const availH = ml + usableH - gridY0 - 4;
    const colCount = roundList.length;
    const colW = Math.min(Math.floor(usableW / colCount), 56);
    const gridStartX = ml + Math.floor((usableW - colW * colCount) / 2);

    roundList.forEach((round, ri) => {
      const matchesInRound = byRound.get(round) ?? [];

      // Sort matches by number
      matchesInRound.sort((a, b) => a.number - b.number);

      const matchCount = matchesInRound.length;
      const cardH = Math.min(10, Math.max(7, (availH - 2) / matchCount));
      const totalH = matchCount * cardH;
      const startY = gridY0 + Math.floor((availH - totalH) / 2);

      // Round title
      const cx = gridStartX + ri * colW + colW / 2;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);
      pdf.setTextColor(177, 76, 255);
      pdf.text(
        this.roundTitle(round, roundList, config.thirdPlaceMatch),
        cx,
        gridY0,
        { align: "center" },
      );

      matchesInRound.forEach((match, mi) => {
        const mx = gridStartX + ri * colW + 1;
        const my = startY + mi * cardH;
        const mw = colW - 2;
        const mh = cardH - 0.5;

        // Card background
        pdf.setFillColor(26, 21, 37);
        pdf.rect(mx, my, mw, mh, "F");

        // Card border
        pdf.setDrawColor(177, 76, 255);
        pdf.setLineWidth(0.12);
        pdf.rect(mx, my, mw, mh);

        // Match number label
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(4.5);
        pdf.setTextColor(180, 180, 180);
        pdf.text(`P${match.number}`, mx + 0.8, my + 2);

        // Completed badge
        if (match.completed) {
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(4);
          pdf.setTextColor(0, 230, 118);
          pdf.text("LISTO", mx + mw - 0.8, my + 2, { align: "right" });
        }

        // Separator line
        const sepY = my + mh / 2;
        pdf.setDrawColor(80, 70, 100);
        pdf.setLineWidth(0.08);
        pdf.line(mx + 1, sepY, mx + mw - 1, sepY);

        // Pair labels
        const p1Label = this.pairLabel(match.pair1);
        const p2Label = this.pairLabel(match.pair2);
        const isP1Winner = match.winner === "pair1";
        const isP2Winner = match.winner === "pair2";

        pdf.setFontSize(5.5);
        pdf.setFont("helvetica", isP1Winner ? "bold" : "normal");
        pdf.setTextColor(
          isP1Winner ? 177 : 230,
          isP1Winner ? 76 : 230,
          isP1Winner ? 255 : 230,
        );
        pdf.text(p1Label, mx + 1.5, sepY - 0.5);

        pdf.setFont("helvetica", isP2Winner ? "bold" : "normal");
        pdf.setTextColor(
          isP2Winner ? 177 : 230,
          isP2Winner ? 76 : 230,
          isP2Winner ? 255 : 230,
        );
        pdf.text(p2Label, mx + 1.5, sepY + 3);
      });
    });

    pdf.save(this.buildFilename(tournamentName));
  }

  private roundTitle(
    round: number,
    rounds: number[],
    thirdPlace: boolean,
  ): string {
    const last = Math.max(...rounds);
    const offset = thirdPlace ? 1 : 0;
    if (thirdPlace && round === last) return "3er puesto";
    if (round === last - offset) return "Final";
    if (round === last - 1 - offset) return "Semifinal";
    return `Ronda ${round}`;
  }

  private pairLabel(pair: [Player, Player]): string {
    if (pair[0].name === "BYE") return "BYE";
    if (pair[0].name === pair[1].name) return pair[0].name;
    return `${pair[0].name} & ${pair[1].name}`;
  }

  private buildFilename(tournamentName: string): string {
    const base = tournamentName.trim() || "cuadro-clasico-padeleria";
    return `${base
      .normalize("NFD")
      .replaceAll(/[\u0300-\u036f]/g, "")
      .replaceAll(/[^a-zA-Z0-9]+/g, "-")
      .replaceAll(/^-+|-+$/g, "")
      .toLowerCase()}.pdf`;
  }

  private fillRect(
    pdf: jsPDF,
    x: number,
    y: number,
    w: number,
    h: number,
    color: string,
  ): void {
    const rgb = this.hexToRgb(color);
    if (rgb) {
      pdf.setFillColor(rgb[0], rgb[1], rgb[2]);
      pdf.rect(x, y, w, h, "F");
    }
  }

  private hexToRgb(hex: string): [number, number, number] | null {
    const m = /^#?([\da-f]{6})$/i.exec(hex);
    if (!m) return null;
    return [
      parseInt(m[1].slice(0, 2), 16),
      parseInt(m[1].slice(2, 4), 16),
      parseInt(m[1].slice(4, 6), 16),
    ];
  }
}
