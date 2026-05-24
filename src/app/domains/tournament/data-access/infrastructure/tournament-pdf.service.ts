import { Injectable } from "@angular/core";
import { jsPDF } from "jspdf";
import {
  ClassicTournamentConfig,
  Match,
  Player,
} from "@shared/models/player.model";
import {
  calculateClassicGroupStandings,
  getClassicGroupKeys,
} from "../utils/classic-tournament-generation.utils";

@Injectable({ providedIn: "root" })
export class TournamentPdfService {
  private static readonly PAGE_W = 297;
  private static readonly PAGE_H = 210;
  private static readonly MARGIN_X = 18;
  private static readonly MARGIN_Y = 14;

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

    this.drawPageBackground(pdf);
    this.drawHeader(pdf, config);

    let cursorY = 44;
    cursorY = this.drawPairsSection(pdf, config, cursorY) + 8;

    if (config.format === "groups-and-playoffs") {
      cursorY = this.drawGroupsSection(pdf, matches, cursorY);
      pdf.addPage();
      this.drawPageBackground(pdf);
      this.drawPlayoffHeader(pdf, config);
      this.drawPlayoffBracket(pdf, config, matches, 38);
    } else {
      this.drawPlayoffBracket(pdf, config, matches, cursorY + 4);
    }

    pdf.save(this.buildFilename(tournamentName));
  }

  private drawHeader(pdf: jsPDF, config: ClassicTournamentConfig): void {
    const x = TournamentPdfService.MARGIN_X;
    const contentWidth = TournamentPdfService.PAGE_W - x * 2;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(200, 145, 255);
    pdf.text("TORNEO CLASICO", x, 20);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(25);
    pdf.setTextColor(255, 255, 255);
    pdf.text(config.name || "Cuadro clásico", x, 31);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(196, 188, 212);
    pdf.text(
      [
        `${config.pairs.length} parejas`,
        config.format === "groups-and-playoffs"
          ? "Grupos + playoffs"
          : "Eliminación directa",
        config.seeded ? "Cuadro sembrado" : "Cuadro abierto",
        config.thirdPlaceMatch ? "Incluye 3er puesto" : "Sin 3er puesto",
      ].join("  ·  "),
      x,
      38,
    );

    pdf.setDrawColor(118, 66, 190);
    pdf.setLineWidth(0.45);
    pdf.line(x, 41, x + contentWidth, 41);
  }

  private drawPairsSection(
    pdf: jsPDF,
    config: ClassicTournamentConfig,
    startY: number,
  ): number {
    const x = TournamentPdfService.MARGIN_X;
    const contentWidth = TournamentPdfService.PAGE_W - x * 2;
    this.drawSectionTitle(pdf, "PAREJAS PARTICIPANTES", x, startY);

    const columnCount = config.pairs.length <= 6 ? 3 : 4;
    const gap = 4;
    const cardWidth = (contentWidth - gap * (columnCount - 1)) / columnCount;
    const cardHeight = 9;
    const gridY = startY + 4.5;

    config.pairs.forEach((pair, index) => {
      const column = index % columnCount;
      const row = Math.floor(index / columnCount);
      const cardX = x + column * (cardWidth + gap);
      const cardY = gridY + row * (cardHeight + 3);

      this.fillRoundedRect(pdf, cardX, cardY, cardWidth, cardHeight, "#1a1525");
      pdf.setDrawColor(122, 86, 171);
      pdf.setLineWidth(0.2);
      pdf.roundedRect(cardX, cardY, cardWidth, cardHeight, 2.5, 2.5);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(6);
      pdf.setTextColor(200, 145, 255);
      pdf.text(`#${pair.id}`, cardX + 3, cardY + 5.3);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.1);
      pdf.setTextColor(255, 255, 255);
      pdf.text(
        this.fitText(
          pdf,
          `${pair.player1.name} & ${pair.player2.name}`,
          cardWidth - 11,
        ),
        cardX + 10,
        cardY + 5.3,
      );
    });

    const rows = Math.ceil(config.pairs.length / columnCount);
    return gridY + rows * (cardHeight + 3);
  }

  private drawGroupsSection(pdf: jsPDF, matches: Match[], startY: number): number {
    const x = TournamentPdfService.MARGIN_X;
    const contentWidth = TournamentPdfService.PAGE_W - x * 2;
    const groupKeys = getClassicGroupKeys(matches);

    this.drawSectionTitle(pdf, "FASE DE GRUPOS", x, startY);

    const columns = Math.min(2, groupKeys.length);
    const gap = 7;
    const cardWidth = (contentWidth - gap * (columns - 1)) / columns;
    const cardY = startY + 8;

    groupKeys.forEach((groupKey, index) => {
      const standings = calculateClassicGroupStandings(matches, groupKey);
      const groupMatches = matches.filter(
        (match) => match.stage === "group" && match.groupKey === groupKey,
      );
      const matchColumns = groupMatches.length >= 2 ? 2 : 1;
      const compactMatchHeight = 11;
      const compactMatchGap = 3;
      const matchRows = Math.ceil(groupMatches.length / matchColumns);
      const standingsHeight = standings.length * 6.4;
      const matchesBlockHeight =
        matchRows > 0
          ? matchRows * compactMatchHeight + Math.max(0, matchRows - 1) * compactMatchGap
          : 0;
      const estimatedHeight = 18 + standingsHeight + 5 + matchesBlockHeight + 4;

      const cardX = x + index * (cardWidth + gap);
      this.fillRoundedRect(pdf, cardX, cardY, cardWidth, estimatedHeight, "#15121d");
      pdf.setDrawColor(122, 86, 171);
      pdf.setLineWidth(0.25);
      pdf.roundedRect(cardX, cardY, cardWidth, estimatedHeight, 4, 4);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(200, 145, 255);
      pdf.text(groupKey, cardX + 4, cardY + 7);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.setTextColor(178, 170, 194);
      pdf.text("Top 2 avanzan", cardX + cardWidth - 4, cardY + 7, {
        align: "right",
      });

      let innerY = cardY + 12;
      standings.forEach((entry, standingIndex) => {
        this.fillRoundedRect(
          pdf,
          cardX + 3,
          innerY - 3.8,
          cardWidth - 6,
          5.8,
          standingIndex < 2 ? "#2a203d" : "#1d1828",
        );

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(6.2);
        pdf.setTextColor(standingIndex < 2 ? 215 : 180, standingIndex < 2 ? 164 : 180, 255);
        pdf.text(`${standingIndex + 1}`, cardX + 6, innerY);

        pdf.setTextColor(255, 255, 255);
        pdf.text(
          this.fitText(pdf, this.pairLabel(entry.pair), cardWidth - 30),
          cardX + 11,
          innerY,
        );

        pdf.setTextColor(178, 170, 194);
        pdf.text(`${entry.wins}-${entry.losses}`, cardX + cardWidth - 6, innerY, {
          align: "right",
        });
        innerY += 6.4;
      });

      innerY += 2.5;
      const compactGap = 3;
      const availableWidth = cardWidth - 6;
      const compactWidth =
        matchColumns === 2 ? (availableWidth - compactGap) / 2 : availableWidth;

      groupMatches.forEach((match, matchIndex) => {
        const column = matchIndex % matchColumns;
        const row = Math.floor(matchIndex / matchColumns);
        const matchX = cardX + 3 + column * (compactWidth + compactGap);
        const matchY = innerY + row * (compactMatchHeight + compactGap);
        this.drawCompactMatch(pdf, match, matchX, matchY, compactWidth, compactMatchHeight);
      });
    });

    const maxGroupMatches = Math.max(
      ...groupKeys.map((groupKey) =>
        matches.filter((match) => match.stage === "group" && match.groupKey === groupKey).length,
      ),
      0,
    );
    const maxStandings = Math.max(
      ...groupKeys.map((groupKey) => calculateClassicGroupStandings(matches, groupKey).length),
      0,
    );
    const groupMatchColumns = maxGroupMatches >= 2 ? 2 : 1;
    const groupMatchRows = Math.ceil(maxGroupMatches / groupMatchColumns);
    const maxHeight =
      18 +
      maxStandings * 6.4 +
      5 +
      groupMatchRows * 11 +
      Math.max(0, groupMatchRows - 1) * 3 +
      4;

    return cardY + maxHeight;
  }

  private drawPlayoffHeader(pdf: jsPDF, config: ClassicTournamentConfig): void {
    const x = TournamentPdfService.MARGIN_X;
    const contentWidth = TournamentPdfService.PAGE_W - x * 2;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(22);
    pdf.setTextColor(255, 255, 255);
    pdf.text(config.name || "Playoffs", x, 22);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(200, 145, 255);
    pdf.text("PLAYOFFS", x, 30);

    pdf.setDrawColor(118, 66, 190);
    pdf.setLineWidth(0.45);
    pdf.line(x, 33, x + contentWidth, 33);
  }

  private drawPlayoffBracket(
    pdf: jsPDF,
    config: ClassicTournamentConfig,
    matches: Match[],
    startY: number,
  ): void {
    const playoffMatches = matches.filter(
      (match) => match.stage !== "group",
    );
    const byRound = new Map<number, Match[]>();
    playoffMatches.forEach((match) => {
      if (!byRound.has(match.round)) {
        byRound.set(match.round, []);
      }
      byRound.get(match.round)?.push(match);
    });

    const rounds = Array.from(byRound.keys()).sort((left, right) => left - right);
    if (rounds.length === 0) {
      return;
    }

    const x = TournamentPdfService.MARGIN_X;
    const contentWidth = TournamentPdfService.PAGE_W - x * 2;
    const availableHeight =
      TournamentPdfService.PAGE_H - startY - TournamentPdfService.MARGIN_Y;
    const columnGap = 8;
    const columnWidth =
      (contentWidth - columnGap * Math.max(0, rounds.length - 1)) / rounds.length;

    if (config.format !== "groups-and-playoffs") {
      this.drawSectionTitle(pdf, "CUADRO DEL TORNEO", x, startY - 4);
    }

    rounds.forEach((round, roundIndex) => {
      const roundMatches = (byRound.get(round) ?? []).sort(
        (left, right) => left.number - right.number,
      );
      const columnX = x + roundIndex * (columnWidth + columnGap);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.setTextColor(200, 145, 255);
      pdf.text(
        this.roundTitle(round, rounds, config.thirdPlaceMatch),
        columnX + columnWidth / 2,
        startY,
        { align: "center" },
      );

      const cardHeight = Math.min(20, Math.max(14, availableHeight / (roundMatches.length + 1)));
      const totalHeight = roundMatches.length * (cardHeight + 8) - 8;
      let currentY = startY + 10 + Math.max(0, (availableHeight - totalHeight) / 2);

      roundMatches.forEach((match) => {
        this.drawPlayoffMatch(pdf, match, columnX, currentY, columnWidth, cardHeight);
        currentY += cardHeight + 8;
      });
    });
  }

  private drawPlayoffMatch(
    pdf: jsPDF,
    match: Match,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    this.fillRoundedRect(pdf, x, y, width, height, "#17121f");
    pdf.setDrawColor(122, 86, 171);
    pdf.setLineWidth(match.completed ? 0.34 : 0.18);
    pdf.roundedRect(x, y, width, height, 4, 4);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(5.5);
    pdf.setTextColor(178, 170, 194);
    pdf.text(`P${match.number}`, x + 3, y + 4.5);

    if (match.completed) {
      pdf.setTextColor(89, 227, 154);
      pdf.text("LISTO", x + width - 3, y + 4.5, { align: "right" });
    }

    pdf.setDrawColor(73, 61, 94);
    pdf.setLineWidth(0.14);
    pdf.line(x + 3, y + height / 2, x + width - 3, y + height / 2);

    this.drawPairLine(pdf, match.pair1, match.winner === "pair1", x + 3, y + 8, width - 6);
    this.drawPairLine(
      pdf,
      match.pair2,
      match.winner === "pair2",
      x + 3,
      y + height - 4.5,
      width - 6,
    );
  }

  private drawCompactMatch(
    pdf: jsPDF,
    match: Match,
    x: number,
    y: number,
    width: number,
    height = 11,
  ): void {
    this.fillRoundedRect(pdf, x, y, width, height, "#120f18");
    pdf.setDrawColor(88, 70, 118);
    pdf.setLineWidth(0.16);
    pdf.roundedRect(x, y, width, height, 2.5, 2.5);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(5);
    pdf.setTextColor(178, 170, 194);
    pdf.text(`P${match.number}`, x + 2.5, y + 3.8);

    this.drawPairLine(
      pdf,
      match.pair1,
      match.winner === "pair1",
      x + 2.5,
      y + 6.7,
      width - 5,
      5.8,
    );
    this.drawPairLine(
      pdf,
      match.pair2,
      match.winner === "pair2",
      x + 2.5,
      y + 9.7,
      width - 5,
      5.8,
    );
  }

  private drawPairLine(
    pdf: jsPDF,
    pair: [Player, Player],
    isWinner: boolean,
    x: number,
    y: number,
    width: number,
    fontSize = 6.8,
  ): void {
    pdf.setFont("helvetica", isWinner ? "bold" : "normal");
    pdf.setFontSize(fontSize);
    if (isWinner) {
      pdf.setTextColor(220, 193, 255);
    } else {
      pdf.setTextColor(238, 238, 238);
    }
    pdf.text(this.fitText(pdf, this.pairLabel(pair), width), x, y);
  }

  private drawSectionTitle(pdf: jsPDF, title: string, x: number, y: number): void {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(200, 145, 255);
    pdf.text(title, x, y);
  }

  private drawPageBackground(pdf: jsPDF): void {
    this.fillRoundedRect(
      pdf,
      0,
      0,
      TournamentPdfService.PAGE_W,
      TournamentPdfService.PAGE_H,
      "#120f18",
      0,
    );
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
    if (round === last - 2 - offset) return "Cuartos";
    return `Ronda ${round}`;
  }

  private pairLabel(pair: [Player, Player]): string {
    if (pair[0].name === "BYE") return "BYE";
    if (pair[0].name === pair[1].name) return pair[0].name;
    return `${pair[0].name} & ${pair[1].name}`;
  }

  private fitText(pdf: jsPDF, text: string, maxWidth: number): string {
    if (pdf.getTextWidth(text) <= maxWidth) {
      return text;
    }

    let compact = text;
    while (compact.length > 3 && pdf.getTextWidth(`${compact}…`) > maxWidth) {
      compact = compact.slice(0, -1);
    }
    return `${compact}…`;
  }

  private fillRoundedRect(
    pdf: jsPDF,
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
    radius = 0,
  ): void {
    pdf.setFillColor(color);
    if (radius > 0) {
      pdf.roundedRect(x, y, width, height, radius, radius, "F");
      return;
    }
    pdf.rect(x, y, width, height, "F");
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
}
