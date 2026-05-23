import { TestBed } from "@angular/core/testing";
import {
  TournamentService,
  getSetWinner,
  getMatchWinner,
  isSetComplete,
  isMatchComplete,
  isValidPointsInput,
} from "./tournament.service";
import {
  Player,
  TournamentConfig,
  Match,
} from "@shared/models/player.model";

function makePlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `Player ${i + 1}`,
    position: (i % 3 === 0
      ? "right"
      : i % 3 === 1
        ? "backhand"
        : "either") as Player["position"],
  }));
}

function makeConfig(overrides: Partial<TournamentConfig> & { players: Player[] }): TournamentConfig {
  return {
    name: overrides.name ?? "Test Tournament",
    numberOfPlayers: overrides.players.length,
    numberOfRounds: overrides.numberOfRounds ?? 1,
    mode: overrides.mode ?? "free",
    scoringMode: overrides.scoringMode ?? "sets",
    players: overrides.players,
  };
}

describe("TournamentService", () => {
  let service: TournamentService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(TournamentService);
  });

  afterEach(() => localStorage.clear());

  describe("generateTournament", () => {
    it("generates 2 matches per round for 8 players free mode", () => {
      const config = makeConfig({
        numberOfRounds: 3,
        players: makePlayers(8),
      });

      const tournamentId = service.generateTournament(config);
      expect(typeof tournamentId).toBe("string");
      const matches = service["matchesSubject"].value;
      expect(matches.length).toBe(6);
    });

    it("generates correct number of matches for 8 players fixed pairs", () => {
      const players = makePlayers(8);
      players.forEach((p) => (p.pairId = Math.ceil(p.id / 2)));
      const config = makeConfig({
        numberOfRounds: 3,
        mode: "fixed-pairs",
        players,
      });

      const tournamentId = service.generateTournament(config);
      expect(typeof tournamentId).toBe("string");
      const matches = service["matchesSubject"].value;
      expect(matches.length).toBe(6);
    });

    it("throws for less than 8 players", () => {
      const config = makeConfig({ players: makePlayers(4) });
      expect(() => service.generateTournament(config)).toThrow();
    });

    it("throws for non-multiple-of-4 player count", () => {
      const config = makeConfig({ players: makePlayers(10) });
      expect(() => service.generateTournament(config)).toThrow();
    });

    it("throws when numberOfRounds < 1", () => {
      const config = makeConfig({ numberOfRounds: 0, players: makePlayers(8) });
      expect(() => service.generateTournament(config)).toThrow();
    });

    it("emits matches via matches$", () => {
      const config = makeConfig({ players: makePlayers(8) });
      const spy = vi.fn();
      service.matches$.subscribe(spy);
      service.generateTournament(config);

      expect(spy).toHaveBeenCalled();
      const emitted = spy.mock.lastCall?.[0] as Match[];
      expect(emitted.length).toBeGreaterThan(0);
    });

    it("saves config to localStorage", () => {
      const config = makeConfig({ players: makePlayers(8) });
      service.generateTournament(config);
      const stored = localStorage.getItem("paddletools_config");
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed.numberOfPlayers).toBe(8);
    });
  });

  describe("scoring utilities", () => {
    describe("getSetWinner", () => {
      it("returns null when games are negative", () => {
        expect(getSetWinner({ pair1Games: -1, pair2Games: 6 })).toBeNull();
      });

      it("returns null when set is not finished", () => {
        expect(getSetWinner({ pair1Games: 5, pair2Games: 4 })).toBeNull();
        expect(getSetWinner({ pair1Games: 6, pair2Games: 5 })).toBeNull();
      });

      it("returns winner on regular 2-game margin", () => {
        expect(getSetWinner({ pair1Games: 6, pair2Games: 4 })).toBe("pair1");
        expect(getSetWinner({ pair1Games: 3, pair2Games: 6 })).toBe("pair2");
      });

      it("returns winner on tie-break style 7-6", () => {
        expect(getSetWinner({ pair1Games: 7, pair2Games: 6 })).toBe("pair1");
        expect(getSetWinner({ pair1Games: 6, pair2Games: 7 })).toBe("pair2");
      });
    });

    describe("getMatchWinner / isMatchComplete", () => {
      it("returns null when no side reaches 2 sets", () => {
        const sets = [
          { pair1Games: 6, pair2Games: 4 },
          { pair1Games: 4, pair2Games: 6 },
        ];
        expect(getMatchWinner(sets)).toBeNull();
        expect(isMatchComplete(sets)).toBe(false);
      });

      it("returns pair1 when pair1 wins 2 sets", () => {
        const sets = [
          { pair1Games: 6, pair2Games: 3 },
          { pair1Games: 6, pair2Games: 4 },
        ];
        expect(getMatchWinner(sets)).toBe("pair1");
        expect(isMatchComplete(sets)).toBe(true);
      });

      it("returns pair2 when pair2 wins 2 sets", () => {
        const sets = [
          { pair1Games: 1, pair2Games: 6 },
          { pair1Games: 4, pair2Games: 6 },
        ];
        expect(getMatchWinner(sets)).toBe("pair2");
        expect(isMatchComplete(sets)).toBe(true);
      });
    });

    describe("isSetComplete", () => {
      it("returns true only for completed sets", () => {
        expect(isSetComplete({ pair1Games: 6, pair2Games: 1 })).toBe(true);
        expect(isSetComplete({ pair1Games: 6, pair2Games: 5 })).toBe(false);
      });
    });

    describe("isValidPointsInput", () => {
      it("rejects negative points", () => {
        expect(isValidPointsInput(-1, 4)).toBe(false);
        expect(isValidPointsInput(4, -1)).toBe(false);
      });

      it("requires a minimum difference of 2 points", () => {
        expect(isValidPointsInput(10, 9)).toBe(false);
        expect(isValidPointsInput(10, 10)).toBe(false);
        expect(isValidPointsInput(10, 8)).toBe(true);
      });
    });
  });

  describe("updateScore", () => {
    it("updates match score and emits", () => {
      const config = makeConfig({ players: makePlayers(8) });
      service.generateTournament(config);

      const spy = vi.fn();
      service.matches$.subscribe(spy);

      service.updateScore(1, 6, 3);
      expect(spy).toHaveBeenCalled();

      const matches = service["matchesSubject"].value;
      const match = matches.find((m) => m.number === 1);
      expect(match?.scorePair1).toBe(6);
      expect(match?.scorePair2).toBe(3);
    });
  });

  describe("calculateStatistics", () => {
    it("returns empty array when no config", () => {
      expect(service.calculateStatistics()).toEqual([]);
    });

    it("calculates win counts correctly with points scoring", () => {
      const players = makePlayers(8);
      const config = makeConfig({ players });
      service.generateTournament(config);

      service.updateScore(1, 6, 3);
      service.updateScore(2, 4, 6);

      const stats = service.calculateStatistics();
      expect(stats.length).toBe(8);
      expect(stats.some((s) => s.matchesWon > 0)).toBe(true);
    });

    it("calculates stats with sets scoring when pair1 wins", () => {
      const players = makePlayers(8);
      const config = makeConfig({
        players,
        scoringMode: "sets",
      });
      service.generateTournament(config);

      service.updateSetScores(1, [
        { pair1Games: 6, pair2Games: 4 },
        { pair1Games: 6, pair2Games: 2 },
        { pair1Games: 0, pair2Games: 0 },
      ]);

      const stats = service.calculateStatistics();
      expect(stats.length).toBe(8);

      const match1Players = service["matchesSubject"].value[0].pair1;
      const winnerStat = stats.find((s) => s.player.id === match1Players[0].id);
      expect(winnerStat).toBeDefined();
      expect(winnerStat!.matchesPlayed).toBe(1);
      expect(winnerStat!.matchesWon).toBe(1);
      expect(winnerStat!.setsWon).toBe(2);
      expect(winnerStat!.pointsFor).toBe(12);
    });

    it("calculates stats with sets scoring when pair2 wins", () => {
      const players = makePlayers(8);
      const config = makeConfig({
        players,
        scoringMode: "sets",
      });
      service.generateTournament(config);

      service.updateSetScores(1, [
        { pair1Games: 4, pair2Games: 6 },
        { pair1Games: 2, pair2Games: 6 },
        { pair1Games: 0, pair2Games: 0 },
      ]);

      const stats = service.calculateStatistics();
      const match1Players = service["matchesSubject"].value[0].pair2;
      const winnerStat = stats.find((s) => s.player.id === match1Players[0].id);
      expect(winnerStat).toBeDefined();
      expect(winnerStat!.matchesPlayed).toBe(1);
      expect(winnerStat!.matchesWon).toBe(1);
    });
  });

  describe("generateSummary", () => {
    it("returns formatted string with match data", () => {
      const players = makePlayers(8);
      const config = makeConfig({ players });
      service.generateTournament(config);
      const matches = service["matchesSubject"].value;
      const summary = service.generateSummary(matches);

      expect(summary).toContain("RONDA 1");
      expect(summary).toContain("Partido 1");
    });

     it("includes points scores when set", () => {
       const players = makePlayers(8);
       const config = makeConfig({ players });
       service.generateTournament(config);
       const matches = service["matchesSubject"].value;
       matches[0].scorePair1 = 6;
       matches[0].scorePair2 = 3;

       const summary = service.generateSummary(matches);
       expect(summary).toContain("6:3");
     });

     it("includes sets scores when using sets mode", () => {
       const players = makePlayers(8);
       const config = makeConfig({ players, scoringMode: "sets" });
       service.generateTournament(config);

       service.updateSetScores(1, [
         { pair1Games: 6, pair2Games: 4 },
         { pair1Games: 6, pair2Games: 3 },
       ]);

       const matches = service["matchesSubject"].value;
       const summary = service.generateSummary(matches);
       expect(summary).toContain("6-4");
       expect(summary).toContain("6-3");
     });
   });

  describe("history", () => {
    it("saves history on generateTournament", () => {
      const config = makeConfig({ players: makePlayers(8) });
      service.generateTournament(config);

      const history = service.getHistory();
      expect(history.length).toBe(1);
      expect(history[0].config.numberOfPlayers).toBe(8);
    });

    it("loadTournament restores config and matches", () => {
      const config = makeConfig({ players: makePlayers(8) });
      service.generateTournament(config);

      const history = service.getHistory();
      const record = service.loadTournament(history[0].id);
      expect(record).not.toBeNull();
      expect(record!.config.numberOfPlayers).toBe(8);
    });

    it("deleteHistoryRecord removes entry", () => {
      const config = makeConfig({ players: makePlayers(8) });
      service.generateTournament(config);

      const history = service.getHistory();
      service.deleteHistoryRecord(history[0].id);
      expect(service.getHistory().length).toBe(0);
    });

    it("limits history to 20 entries", () => {
      for (let i = 0; i < 25; i++) {
        const config = makeConfig({
          name: `Tournament ${i}`,
          players: makePlayers(8),
        });
        service.generateTournament(config);
      }
      expect(service.getHistory().length).toBeLessThanOrEqual(20);
    });
  });

   describe("updateSetScores", () => {
    it("updates set scores and determines winner", () => {
      const config = makeConfig({ players: makePlayers(8) });
      service.generateTournament(config);

      const spy = vi.fn();
      service.matches$.subscribe(spy);

      service.updateSetScores(1, [
        { pair1Games: 6, pair2Games: 4 },
        { pair1Games: 6, pair2Games: 3 },
        { pair1Games: 0, pair2Games: 0 },
      ]);

      expect(spy).toHaveBeenCalled();
      const matches = service["matchesSubject"].value;
      const match = matches.find((m) => m.number === 1);
      expect(match?.sets[0].pair1Games).toBe(6);
      expect(match?.sets[0].pair2Games).toBe(4);
      expect(match?.winner).toBe("pair1");
      expect(match?.completed).toBe(true);
    });

    it("does not mark as complete without 2 winning sets", () => {
      const config = makeConfig({ players: makePlayers(8) });
      service.generateTournament(config);

      service.updateSetScores(1, [
        { pair1Games: 6, pair2Games: 4 },
        { pair1Games: 0, pair2Games: 0 },
        { pair1Games: 0, pair2Games: 0 },
      ]);

      const matches = service["matchesSubject"].value;
      const match = matches.find((m) => m.number === 1);
      expect(match?.completed).toBe(false);
    });

    it("persists score changes to history", () => {
      const config = makeConfig({ players: makePlayers(8) });
      service.generateTournament(config);

      const historyBefore = service.getHistory();
      expect(historyBefore[0].matches[0].scorePair1).toBeUndefined();

      service.updateScore(1, 6, 3);

      const historyAfter = service.getHistory();
      expect(historyAfter[0].matches[0].scorePair1).toBe(6);
      expect(historyAfter[0].matches[0].scorePair2).toBe(3);
    });
  });

  describe("calculatePairStatistics", () => {
    it("calculates pair statistics in fixed-pairs mode", () => {
      const players = makePlayers(8);
      players.forEach((p) => (p.pairId = Math.ceil(p.id / 2)));
      const config = makeConfig({
        mode: "fixed-pairs",
        players,
      });
      service.generateTournament(config);

      service.updateScore(1, 6, 3);

      const stats = service.calculateStatistics();
      expect(stats.length).toBeGreaterThan(0);
      expect(stats[0].matchesWon).toBeDefined();
    });

     it("returns pair-based stats with correct count", () => {
       const players = makePlayers(8);
       players.forEach((p) => (p.pairId = Math.ceil(p.id / 2)));
       const config = makeConfig({
         mode: "fixed-pairs",
         numberOfRounds: 1,
         players,
       });
       service.generateTournament(config);

       const stats = service.calculatePairStatistics();
       expect(stats.length).toBe(4);
       expect(stats[0].matchesWon).toBeGreaterThanOrEqual(0);
       expect(stats[0].player.name).toContain("&");
     });

      it("calculates pair stats when using points scoring (pair1 wins)", () => {
       const players = makePlayers(8);
       players.forEach((p) => (p.pairId = Math.ceil(p.id / 2)));
       const config = makeConfig({
         mode: "fixed-pairs",
         numberOfRounds: 1,
         scoringMode: "sets",
         players,
       });
       service.generateTournament(config);

       service.updateScore(1, 21, 15);

       const stats = service.calculatePairStatistics();
       const playedPairs = stats.filter((s) => s.matchesPlayed === 1);
       expect(playedPairs.length).toBe(2);

       const winner = playedPairs.find((s) => s.matchesWon === 1);
       expect(winner).toBeDefined();
       expect(winner!.pointsFor + winner!.pointsAgainst).toBe(36);

       const has21 = playedPairs.find((s) => s.pointsFor === 21);
       expect(has21).toBeDefined();
       expect(has21!.matchesWon).toBe(1);
     });

     it("calculates pair stats when using points scoring (pair2 wins)", () => {
       const players = makePlayers(8);
       players.forEach((p) => (p.pairId = Math.ceil(p.id / 2)));
       const config = makeConfig({
         mode: "fixed-pairs",
         numberOfRounds: 1,
         scoringMode: "sets",
         players,
       });
       service.generateTournament(config);

       service.updateScore(1, 12, 21);

       const stats = service.calculatePairStatistics();
       const playedPairs = stats.filter((s) => s.matchesPlayed === 1);
       expect(playedPairs.length).toBe(2);

       const has12 = playedPairs.find((s) => s.pointsFor === 12);
       expect(has12).toBeDefined();
       expect(has12!.matchesWon).toBe(0);

        const has21 = playedPairs.find((s) => s.pointsFor === 21);
        expect(has21).toBeDefined();
        expect(has21!.matchesWon).toBe(1);
      });

      it("calculates pair stats when using sets scoring - pair1 wins", () => {
        const players = makePlayers(8);
        players.forEach((p) => (p.pairId = Math.ceil(p.id / 2)));
        const config = makeConfig({
          mode: "fixed-pairs",
          numberOfRounds: 1,
          scoringMode: "sets",
          players,
        });
        service.generateTournament(config);

        service.updateSetScores(1, [
          { pair1Games: 6, pair2Games: 4 },
          { pair1Games: 6, pair2Games: 3 },
          { pair1Games: 0, pair2Games: 0 },
        ]);

        const stats = service.calculatePairStatistics();
        const playedPairs = stats.filter((s) => s.matchesPlayed === 1);
        expect(playedPairs.length).toBe(2);

        const winner = playedPairs.find((s) => s.matchesWon === 1);
        expect(winner).toBeDefined();
        expect(winner!.setsWon).toBe(2);
        expect(winner!.pointsFor).toBe(12);
      });

      it("calculates pair stats when using sets scoring - pair2 wins", () => {
        const players = makePlayers(8);
        players.forEach((p) => (p.pairId = Math.ceil(p.id / 2)));
        const config = makeConfig({
          mode: "fixed-pairs",
          numberOfRounds: 1,
          scoringMode: "sets",
          players,
        });
        service.generateTournament(config);

        service.updateSetScores(1, [
          { pair1Games: 2, pair2Games: 6 },
          { pair1Games: 3, pair2Games: 6 },
          { pair1Games: 0, pair2Games: 0 },
        ]);

        const stats = service.calculatePairStatistics();
        const playedPairs = stats.filter((s) => s.matchesPlayed === 1);
        const winner = playedPairs.find((s) => s.matchesWon === 1);
        expect(winner).toBeDefined();
        expect(winner!.setsWon).toBe(2);
        expect(winner!.setsLost).toBe(0);
      });
   });

  describe("loadTournament", () => {
    it("returns null for non-existent tournament ID", () => {
      const result = service.loadTournament("non-existent-id");
      expect(result).toBeNull();
    });
  });

   describe("clearCurrentTournamentId", () => {
    it("clears the current tournament ID", () => {
      const config = makeConfig({ players: makePlayers(8) });
      service.generateTournament(config);

      const idSpy = vi.fn();
      service.currentTournamentId$.subscribe(idSpy);

      expect(service["_currentTournamentId"].value).not.toBeNull();

      service.clearCurrentTournamentId();

      expect(service["_currentTournamentId"].value).toBeNull();
    });

     it("updateScore does nothing to history when currentTournamentId is null", () => {
      const config = makeConfig({ players: makePlayers(8) });
      service.generateTournament(config);

      service.clearCurrentTournamentId();

      service.updateScore(1, 6, 3);

      const historyAfter = service.getHistory();
      expect(historyAfter[0].matches[0].scorePair1).toBeUndefined();
    });
  });

  describe("migrateMatch (legacy data format)", () => {
    it("handles matches from old data format (missing scoringMode, sets, completed)", () => {
      const partialMatch = {
        number: 1,
        round: 1,
        pair1: [
          { id: 1, name: "P1", position: "right" as const },
          { id: 2, name: "P2", position: "backhand" as const },
        ],
        pair2: [
          { id: 3, name: "P3", position: "right" as const },
          { id: 4, name: "P4", position: "backhand" as const },
        ],
      };

       const migrated = service["migrateMatch"](partialMatch as unknown as Match);
      expect(migrated.scoringMode).toBe("points");
      expect(migrated.sets).toEqual([]);
      expect(migrated.completed).toBe(false);
      expect(migrated.winner).toBeUndefined();
    });

    it("loadTournament applies migrateMatch to all matches", () => {
      const config = makeConfig({ players: makePlayers(8) });
      service.generateTournament(config);

      const history = service.getHistory();
      const tournamentId = history[0].id;

      const legacyRecord = {
        ...history[0],
        matches: history[0].matches.map((m) => ({
          number: m.number,
          round: m.round,
          pair1: m.pair1,
          pair2: m.pair2,
        })),
      };
      localStorage.setItem("paddletools_history", JSON.stringify([legacyRecord]));

      const loaded = service.loadTournament(tournamentId);
      expect(loaded).not.toBeNull();
      expect(loaded!.matches[0].scoringMode).toBeDefined();
    });
  });

  describe("clearData", () => {
    it("clears localStorage and subjects", () => {
      const config = makeConfig({ players: makePlayers(8) });
      service.generateTournament(config);
      service.clearData();

      expect(localStorage.getItem("paddletools_config")).toBeNull();
      expect(localStorage.getItem("paddletools_matches")).toBeNull();
      expect(service["configSubject"].value).toBeNull();
      expect(service["matchesSubject"].value).toEqual([]);
    });

    it("clears current tournament ID when clearData is called", () => {
      const config = makeConfig({ players: makePlayers(8) });
      service.generateTournament(config);

      expect(service["_currentTournamentId"].value).not.toBeNull();

      service.clearData();

      expect(service["_currentTournamentId"].value).toBeNull();
    });
  });

  describe("localStorage error handling", () => {
    it("shows system-error notification when saveToLocalStorage fails", () => {
      const ns = service["notificationService"];
      const showSpy = vi.spyOn(ns, "showSystemError");

      const cyclicObj: { ref?: unknown } = {};
      cyclicObj.ref = cyclicObj;

      service["saveToLocalStorage"](cyclicObj as never, []);

      expect(showSpy).toHaveBeenCalledTimes(1);
      expect(showSpy).toHaveBeenCalledWith("Error interno: no se pudo guardar el torneo.");
    });

    it("shows system-error notification when saveHistory fails", () => {
      const ns = service["notificationService"];
      const showSpy = vi.spyOn(ns, "showSystemError");

      const cyclicObj: { ref?: unknown }[] = [{}];
      cyclicObj[0].ref = cyclicObj;

      service["saveHistory"](cyclicObj as never);

      expect(showSpy).toHaveBeenCalledTimes(1);
      expect(showSpy).toHaveBeenCalledWith("Error interno: no se pudo guardar el historial.");
    });

     it("handles localStorage.getItem errors gracefully", () => {
       const originalGetItem = localStorage.getItem;
       vi.spyOn(localStorage, "getItem").mockImplementation(() => {
         throw new Error("Storage corrupted");
       });

       const history = service["loadHistory"]();
       expect(history).toEqual([]);

       localStorage.getItem = originalGetItem;
     });

     it("handles JSON.parse errors in loadHistory gracefully", () => {
       localStorage.setItem("paddletools_history", "this is not valid JSON!! {{[");

       const history = service["loadHistory"]();
       expect(history).toEqual([]);
     });
   });

  describe("generateTournament label", () => {
    it("uses provided tournament name for history label", () => {
      const config = makeConfig({
        name: "Mi Torneo Especial",
        players: makePlayers(8),
      });
      service.generateTournament(config);

      const history = service.getHistory();
      expect(history[0].label).toBe("Mi Torneo Especial");
    });

    it("generates default label when tournament name is empty", () => {
      const config = makeConfig({
        name: "",
        players: makePlayers(8),
      });
      service.generateTournament(config);

      const history = service.getHistory();
      expect(history[0].label).not.toBe("");
      expect(history[0].label).toContain("8");
    });

    it("creates unique labels for tournaments created on same day", () => {
      const config1 = makeConfig({
        name: "",
        players: makePlayers(8),
      });
      const config2 = makeConfig({
        name: "",
        players: makePlayers(12),
      });

      service.generateTournament(config1);
      service.generateTournament(config2);

      const history = service.getHistory();
      expect(history[0].label).not.toBe(history[1].label);
    });
  });

  describe("loadFromLocalStorage errors", () => {
    it("handles corrupted localStorage data gracefully", () => {
      localStorage.setItem("paddletools_config", "not-json-at-all");
      localStorage.setItem("paddletools_matches", "also-broken");

      const ns = service["notificationService"];
      const spy = vi.spyOn(ns, "showSystemError");

      service["loadFromLocalStorage"]();

      expect(spy).toHaveBeenCalledWith("Error interno: no se pudieron cargar los datos locales.");
    });

    it("parses and migrates stored history on init", () => {
      localStorage.setItem("paddletools_config", JSON.stringify({ numberOfPlayers: 8, mode: "free", scoringMode: "sets", numberOfRounds: 3, players: [] }));

      const historyRecord = {
        id: "test-1",
        createdAt: new Date().toISOString(),
        label: "Test",
        config: { numberOfPlayers: 8, mode: "free", scoringMode: "sets", numberOfRounds: 3, players: [] },
        matches: [{
          number: 1, round: 1,
          pair1: [{ id: 1, name: "A", position: "right" }, { id: 2, name: "B", position: "backhand" }],
          pair2: [{ id: 3, name: "C", position: "right" }, { id: 4, name: "D", position: "backhand" }],
        }],
      };
      localStorage.setItem("paddletools_history", JSON.stringify([historyRecord]));

      service["loadFromLocalStorage"]();

      const history = service["historySubject"].value;
      expect(history.length).toBe(1);
      expect(history[0].matches[0].scoringMode).toBe("points");
      expect(history[0].matches[0].completed).toBe(false);
    });

    it("loads stored matches from localStorage", () => {
      localStorage.setItem("paddletools_config", JSON.stringify({
        numberOfPlayers: 8, mode: "free", scoringMode: "points", numberOfRounds: 3, players: makePlayers(8),
      }));
      localStorage.setItem("paddletools_matches", JSON.stringify([{
        number: 1, round: 1,
        pair1: [{ id: 1, name: "A", position: "right" }, { id: 2, name: "B", position: "backhand" }],
        pair2: [{ id: 3, name: "C", position: "right" }, { id: 4, name: "D", position: "backhand" }],
      }]));

      service["loadFromLocalStorage"]();

      const matches = service["matchesSubject"].value;
      expect(matches.length).toBe(1);
      expect(matches[0].scoringMode).toBe("points");
    });
  });

  describe("getSetWinner tiebreak", () => {
    it("returns null when scores are negative", () => {
      expect(getSetWinner({ pair1Games: -1, pair2Games: 5 })).toBeNull();
    });

    it("returns null when max is below 6", () => {
      expect(getSetWinner({ pair1Games: 4, pair2Games: 3 })).toBeNull();
    });

    it("returns winner when diff >= 2 and max >= 6", () => {
      expect(getSetWinner({ pair1Games: 6, pair2Games: 4 })).toBe("pair1");
      expect(getSetWinner({ pair1Games: 3, pair2Games: 6 })).toBe("pair2");
    });

    it("returns winner for tiebreak 7-6", () => {
      expect(getSetWinner({ pair1Games: 7, pair2Games: 6 })).toBe("pair1");
      expect(getSetWinner({ pair1Games: 6, pair2Games: 7 })).toBe("pair2");
    });

    it("returns null when diff is 1 but max is exactly 6", () => {
      expect(getSetWinner({ pair1Games: 6, pair2Games: 5 })).toBeNull();
    });

     it("returns null for unfinished high scores", () => {
       expect(getSetWinner({ pair1Games: 8, pair2Games: 8 })).toBeNull();
     });
   });

   describe("generateWithFixedPairs edge cases", () => {
     it("throws error for odd number of pairs", () => {
       const players: Player[] = [
         { id: 1, name: "P1", position: "right", pairId: 1 },
         { id: 2, name: "P2", position: "backhand", pairId: 1 },
         { id: 3, name: "P3", position: "right", pairId: 2 },
         { id: 4, name: "P4", position: "backhand", pairId: 2 },
         { id: 5, name: "P5", position: "right", pairId: 3 },
         { id: 6, name: "P6", position: "backhand", pairId: 3 },
       ];

       expect(() => {
         service["generateWithFixedPairs"](players, 1, "sets");
       }).toThrow("El número de parejas debe ser par");
     });

     it("triggers fallback pairing when all unique matchups are exhausted", () => {
       const players: Player[] = [
         { id: 1, name: "P1", position: "right", pairId: 1 },
         { id: 2, name: "P2", position: "backhand", pairId: 1 },
         { id: 3, name: "P3", position: "right", pairId: 2 },
         { id: 4, name: "P4", position: "backhand", pairId: 2 },
         { id: 5, name: "P5", position: "right", pairId: 3 },
         { id: 6, name: "P6", position: "backhand", pairId: 3 },
         { id: 7, name: "P7", position: "right", pairId: 4 },
         { id: 8, name: "P8", position: "backhand", pairId: 4 },
       ];

       const matches = service["generateWithFixedPairs"](players, 10, "sets");

       expect(matches.length).toBe(2 * 10);
       expect(matches[0].round).toBe(1);
       expect(matches[matches.length - 1].round).toBe(10);
     });

     it("creates pairs from free players (no pairId)", () => {
       const players: Player[] = [
         { id: 1, name: "P1", position: "right", pairId: 1 },
         { id: 2, name: "P2", position: "backhand", pairId: 1 },
         { id: 3, name: "P3", position: "right", pairId: 2 },
         { id: 4, name: "P4", position: "backhand", pairId: 2 },
         { id: 5, name: "P5", position: "right" },
         { id: 6, name: "P6", position: "backhand" },
         { id: 7, name: "P7", position: "right" },
         { id: 8, name: "P8", position: "backhand" },
       ];

       const matches = service["generateWithFixedPairs"](players, 1, "sets");
       expect(matches.length).toBe(2);
       expect(matches[0].round).toBe(1);
     });

     it("throws error when fewer than 2 pairs", () => {
       const players: Player[] = [
         { id: 1, name: "P1", position: "right", pairId: 1 },
         { id: 2, name: "P2", position: "backhand", pairId: 1 },
       ];

       expect(() => {
         service["generateWithFixedPairs"](players, 1, "sets");
       }).toThrow("No hay suficientes parejas");
     });

     it("handles incomplete fixed pairs (pairId without partner)", () => {
       const players: Player[] = [
         { id: 1, name: "P1", position: "right", pairId: 1 },
         { id: 2, name: "P2", position: "backhand", pairId: 1 },
         { id: 3, name: "P3", position: "right", pairId: 2 },
         { id: 4, name: "P4", position: "backhand", pairId: 2 },
         { id: 5, name: "P5", position: "right", pairId: 3 },
       ];

       const matches = service["generateWithFixedPairs"](players, 1, "sets");
       expect(matches.length).toBe(1);
     });
   });
 });
