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
      cursorY = this.drawGroupsSection(pdf, config, matches, cursorY);
      pdf.addPage();
      this.drawPageBackground(pdf);
      this.drawPlayoffHeader(pdf, config);
      this.drawPlayoffBracket(pdf, config, matches, 38);
    } else {
      pdf.addPage();
      this.drawPageBackground(pdf);
      this.drawPlayoffHeader(pdf, config);
      this.drawPlayoffBracket(pdf, config, matches, 38);
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

  private drawGroupsSection(
    pdf: jsPDF,
    config: ClassicTournamentConfig,
    matches: Match[],
    startY: number,
  ): number {
    const x = TournamentPdfService.MARGIN_X;
    const contentWidth = TournamentPdfService.PAGE_W - x * 2;
    const groupKeys = getClassicGroupKeys(matches);
    const isLargeExport = config.pairs.length > 20;

    if (groupKeys.length === 0) {
      return startY;
    }

    if (isLargeExport) {
      groupKeys.forEach((groupKey, index) => {
        pdf.addPage();
        this.drawPageBackground(pdf);
        this.drawGroupsPage(
          pdf,
          matches,
          [groupKey],
          index === 0 ? "FASE DE GRUPOS" : "FASE DE GRUPOS (cont.)",
          30,
        );
      });

      return 30;
    }

    let cursorY = this.drawGroupsPage(
      pdf,
      matches,
      groupKeys.slice(0, 2),
      "FASE DE GRUPOS",
      startY,
    );

    for (let index = 2; index < groupKeys.length; index += 2) {
      pdf.addPage();
      this.drawPageBackground(pdf);
      cursorY = this.drawGroupsPage(
        pdf,
        matches,
        groupKeys.slice(index, index + 2),
        "FASE DE GRUPOS (cont.)",
        30,
      );
    }

    return cursorY;
  }

  private drawGroupsPage(
    pdf: jsPDF,
    matches: Match[],
    groupKeys: string[],
    title: string,
    startY: number,
  ): number {
    const x = TournamentPdfService.MARGIN_X;
    const contentWidth = TournamentPdfService.PAGE_W - x * 2;
    const columns = Math.min(2, groupKeys.length);
    const gap = 7;
    const cardWidth = (contentWidth - gap * (columns - 1)) / columns;
    const cardY = startY + 8;

    this.drawSectionTitle(pdf, title, x, startY);

    const pageBottoms = groupKeys.map((groupKey, index) => {
      const cardX = x + index * (cardWidth + gap);
      return this.drawGroupCard(
        pdf,
        matches,
        groupKey,
        cardX,
        cardY,
        cardWidth,
      );
    });

    return Math.max(...pageBottoms, cardY);
  }

  private drawGroupCard(
    pdf: jsPDF,
    matches: Match[],
    groupKey: string,
    cardX: number,
    cardY: number,
    cardWidth: number,
  ): number {
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
        ? matchRows * compactMatchHeight +
          Math.max(0, matchRows - 1) * compactMatchGap
        : 0;
    const estimatedHeight = 18 + standingsHeight + 5 + matchesBlockHeight + 4;

    this.fillRoundedRect(
      pdf,
      cardX,
      cardY,
      cardWidth,
      estimatedHeight,
      "#15121d",
    );
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
      pdf.setTextColor(
        standingIndex < 2 ? 215 : 180,
        standingIndex < 2 ? 164 : 180,
        255,
      );
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
      this.drawCompactMatch(
        pdf,
        match,
        matchX,
        matchY,
        compactWidth,
        compactMatchHeight,
      );
    });

    return cardY + estimatedHeight;
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
    pdf.line(x, 35, x + contentWidth, 35);
  }

  private drawPlayoffBracket(
    pdf: jsPDF,
    config: ClassicTournamentConfig,
    matches: Match[],
    startY: number,
  ): void {
    const playoffMatches = matches.filter((match) => match.stage !== "group");
    const byRound = new Map<number, Match[]>();
    playoffMatches.forEach((match) => {
      if (!byRound.has(match.round)) {
        byRound.set(match.round, []);
      }
      byRound.get(match.round)?.push(match);
    });

    const rounds = Array.from(byRound.keys()).sort(
      (left, right) => left - right,
    );
    if (rounds.length === 0) {
      return;
    }

    const x = TournamentPdfService.MARGIN_X;
    const contentWidth = TournamentPdfService.PAGE_W - x * 2;
    const roundTitleY = startY + 5;
    const matchGridTop = startY + 18;
    const availableHeight =
      TournamentPdfService.PAGE_H -
      matchGridTop -
      TournamentPdfService.MARGIN_Y;
    const shouldPaginateByRound = rounds.some(
      (round) => (byRound.get(round) ?? []).length >= 8,
    );

    if (shouldPaginateByRound) {
      this.drawPaginatedPlayoffBracket(pdf, config, byRound, rounds, startY);
      return;
    }

    const columnGap = 8;
    const columnWidth =
      (contentWidth - columnGap * Math.max(0, rounds.length - 1)) /
      rounds.length;

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
        roundTitleY,
        { align: "center" },
      );

      const cardHeight = Math.min(
        20,
        Math.max(14, availableHeight / (roundMatches.length + 1)),
      );
      const totalHeight = roundMatches.length * (cardHeight + 8) - 8;
      let currentY =
        matchGridTop + Math.max(0, (availableHeight - totalHeight) / 2);

      roundMatches.forEach((match) => {
        this.drawPlayoffMatch(
          pdf,
          match,
          columnX,
          currentY,
          columnWidth,
          cardHeight,
        );
        currentY += cardHeight + 8;
      });
    });
  }

  private drawPaginatedPlayoffBracket(
    pdf: jsPDF,
    config: ClassicTournamentConfig,
    byRound: Map<number, Match[]>,
    rounds: number[],
    startY: number,
  ): void {
    const x = TournamentPdfService.MARGIN_X;
    const contentWidth = TournamentPdfService.PAGE_W - x * 2;
    const columnGap = 7;
    const pages = this.groupPlayoffRoundsIntoPages(byRound, rounds);

    pages.forEach((pageRounds, pageIndex) => {
      const pageStartY = pageIndex === 0 ? startY : 38;
      const roundTitleY = pageStartY + 2;
      const gridTop = pageStartY + 14;
      if (pageIndex > 0) {
        pdf.addPage();
        this.drawPageBackground(pdf);
        this.drawPlayoffHeader(pdf, config);
      }

      if (config.format !== "groups-and-playoffs") {
        this.drawSectionTitle(
          pdf,
          pageIndex === 0 ? "CUADRO DEL TORNEO" : "CUADRO DEL TORNEO (cont.)",
          x,
          pageStartY - 4,
        );
      }

      const totalColumns = pageRounds.reduce(
        (columns, round) =>
          columns +
          this.playoffRoundColumnSpan(byRound.get(round)?.length ?? 0),
        0,
      );
      const pageColumnWidth =
        (contentWidth - columnGap * Math.max(0, totalColumns - 1)) /
        totalColumns;
      let roundX = x;

      pageRounds.forEach((round) => {
        const roundMatches = (byRound.get(round) ?? []).sort(
          (left, right) => left.number - right.number,
        );
        const internalColumns = this.playoffRoundColumnSpan(
          roundMatches.length,
        );
        const roundWidth =
          pageColumnWidth * internalColumns +
          columnGap * Math.max(0, internalColumns - 1);
        const rows = Math.ceil(roundMatches.length / internalColumns);
        const cardGap = 5;
        const availableGridHeight =
          TournamentPdfService.PAGE_H - gridTop - TournamentPdfService.MARGIN_Y;
        const minCardHeight = rows >= 8 ? 12 : 13.5;
        const cardHeight = Math.min(
          19,
          Math.max(
            minCardHeight,
            (availableGridHeight - Math.max(0, rows - 1) * cardGap) / rows,
          ),
        );
        const totalHeight = rows * cardHeight + Math.max(0, rows - 1) * cardGap;
        const currentTop =
          gridTop + Math.max(0, (availableGridHeight - totalHeight) / 2);

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);
        pdf.setTextColor(200, 145, 255);
        pdf.text(
          this.roundTitle(round, rounds, config.thirdPlaceMatch),
          roundX + roundWidth / 2,
          roundTitleY,
          { align: "center" },
        );

        roundMatches.forEach((match, matchIndex) => {
          const column = matchIndex % internalColumns;
          const row = Math.floor(matchIndex / internalColumns);
          const matchX = roundX + column * (pageColumnWidth + columnGap);
          const matchY = currentTop + row * (cardHeight + cardGap);
          this.drawPlayoffMatch(
            pdf,
            match,
            matchX,
            matchY,
            pageColumnWidth,
            cardHeight,
          );
        });

        roundX += roundWidth + columnGap;
      });
    });
  }

  private groupPlayoffRoundsIntoPages(
    byRound: Map<number, Match[]>,
    rounds: number[],
  ): number[][] {
    const pages: number[][] = [];
    let currentPage: number[] = [];
    let usedColumns = 0;
    const maxColumns = 4;

    rounds.forEach((round) => {
      const requiredColumns = this.playoffRoundColumnSpan(
        byRound.get(round)?.length ?? 0,
      );
      if (
        currentPage.length > 0 &&
        usedColumns + requiredColumns > maxColumns
      ) {
        pages.push(currentPage);
        currentPage = [];
        usedColumns = 0;
      }

      currentPage.push(round);
      usedColumns += requiredColumns;
    });

    if (currentPage.length > 0) {
      pages.push(currentPage);
    }

    return pages;
  }

  private playoffRoundColumnSpan(matchCount: number): number {
    return matchCount >= 8 ? 2 : 1;
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
    pdf.setFontSize(height < 14 ? 5 : 5.5);
    pdf.setTextColor(
      match.completed ? 89 : 178,
      match.completed ? 227 : 170,
      match.completed ? 154 : 194,
    );
    pdf.text(`P${match.number}`, x + width - 3, y + Math.min(4.5, height * 0.3), {
      align: "right",
    });

    pdf.setDrawColor(73, 61, 94);
    pdf.setLineWidth(0.14);
    pdf.line(x + 3, y + height * 0.58, x + width - 3, y + height * 0.58);

    const pairFontSize = height < 14 ? 5.8 : 6.8;
    this.drawPairLine(
      pdf,
      match.pair1,
      match.winner === "pair1",
      x + 3,
      y + height * 0.43,
      width - 6,
      pairFontSize,
    );
    this.drawPairLine(
      pdf,
      match.pair2,
      match.winner === "pair2",
      x + 3,
      y + height - Math.max(3.2, height * 0.16),
      width - 6,
      pairFontSize,
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

  private drawSectionTitle(
    pdf: jsPDF,
    title: string,
    x: number,
    y: number,
  ): void {
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
