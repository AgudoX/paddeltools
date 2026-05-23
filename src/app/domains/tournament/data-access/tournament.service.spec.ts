import { TestBed } from "@angular/core/testing";
import { TournamentService } from "./tournament.service";
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

    it("calculates win counts correctly", () => {
      const players = makePlayers(8);
      const config = makeConfig({ players });
      service.generateTournament(config);

      service.updateScore(1, 6, 3);
      service.updateScore(2, 4, 6);

      const stats = service.calculateStatistics();
      expect(stats.length).toBe(8);
      expect(stats.some((s) => s.matchesWon > 0)).toBe(true);
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

    it("includes scores when set", () => {
      const players = makePlayers(8);
      const config = makeConfig({ players });
      service.generateTournament(config);
      const matches = service["matchesSubject"].value;
      matches[0].scorePair1 = 6;
      matches[0].scorePair2 = 3;

      const summary = service.generateSummary(matches);
      expect(summary).toContain("6:3");
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
  });
});
