import { TestBed } from "@angular/core/testing";
import { TournamentPersistenceService } from "./tournament-persistence.service";
import { NotificationService } from "@shared/services/notification.service";
import { ClassicTournamentConfig, TournamentConfig } from "@shared/models/player.model";

describe("TournamentPersistenceService", () => {
  let service: TournamentPersistenceService;
  let notificationSpy: { showSystemError: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    localStorage.clear();
    notificationSpy = { showSystemError: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        TournamentPersistenceService,
        { provide: NotificationService, useValue: notificationSpy },
      ],
    });
    service = TestBed.inject(TournamentPersistenceService);
  });

  it("loadSession returns null config when localStorage is empty", () => {
    const session = service.loadSession();
    expect(session.config).toBeNull();
    expect(session.matches).toEqual([]);
    expect(session.history).toEqual([]);
  });

  it("loadSession returns saved config and matches", () => {
    const config: TournamentConfig = {
      type: "americano",
      name: "Test",
      numberOfPlayers: 8,
      numberOfRounds: 3,
      mode: "free",
      scoringMode: "sets",
      players: [
        { id: 1, name: "A", position: "right" },
        { id: 2, name: "B", position: "backhand" },
      ],
    };
    localStorage.setItem("paddletools_config", JSON.stringify(config));
    localStorage.setItem(
      "paddletools_matches",
      JSON.stringify([{ number: 1, scoringMode: "points" }]),
    );
    const session = service.loadSession();
    expect(session.config?.name).toBe("Test");
    expect(session.matches.length).toBe(1);
  });

  it("loadSession builds pairs from players when classic config has no pairs", () => {
    const classicConfig: ClassicTournamentConfig = {
      type: "classic",
      name: "Classic",
      numberOfPlayers: 4,
      format: "single-elimination",
      seeded: false,
      thirdPlaceMatch: false,
      players: [
        { id: 1, name: "Alice", position: "right", pairId: 1 },
        { id: 2, name: "Bob", position: "backhand", pairId: 1 },
        { id: 3, name: "Charlie", position: "either", pairId: 2 },
        { id: 4, name: "Diana", position: "right", pairId: 2 },
      ],
      pairs: [],
    };
    delete (classicConfig as { pairs?: unknown }).pairs;
    localStorage.setItem("paddletools_config", JSON.stringify(classicConfig));
    const session = service.loadSession();
    const loaded = session.config as ClassicTournamentConfig;
    expect(loaded.pairs.length).toBe(2);
    expect(loaded.pairs[0].player1.name).toBe("Alice");
    expect(loaded.pairs[0].player2.name).toBe("Bob");
    expect(loaded.pairs[1].player1.name).toBe("Charlie");
    expect(loaded.pairs[1].player2.name).toBe("Diana");
  });

  it("buildPairsFromPlayers handles players without pairId and duplicate player IDs", () => {
    const classicConfig: ClassicTournamentConfig = {
      type: "classic",
      name: "Classic",
      numberOfPlayers: 6,
      format: "single-elimination",
      seeded: false,
      thirdPlaceMatch: false,
      players: [
        { id: 1, name: "Alice", position: "right", pairId: 1 },
        { id: 1, name: "Alice", position: "right", pairId: 1 },
        { id: 2, name: "Bob", position: "backhand", pairId: 1 },
        { id: 3, name: "Charlie", position: "either" },
        { id: 4, name: "Diana", position: "right", pairId: 2 },
        { id: 5, name: "Eve", position: "backhand", pairId: 2 },
      ],
    };
    delete (classicConfig as { pairs?: unknown }).pairs;
    localStorage.setItem("paddletools_config", JSON.stringify(classicConfig));
    const session = service.loadSession();
    const loaded = session.config as ClassicTournamentConfig;
    expect(loaded.pairs.length).toBe(2);
  });

  it("saveSession stores config and matches", () => {
    const config: TournamentConfig = {
      type: "americano",
      name: "Save Test",
      numberOfPlayers: 8,
      numberOfRounds: 3,
      mode: "free",
      scoringMode: "points",
      players: [{ id: 1, name: "A", position: "right" }],
    };
    service.saveSession(config, []);
    expect(localStorage.getItem("paddletools_config")).toContain("Save Test");
  });

  it("saveSession catches localStorage errors", () => {
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = vi.fn(() => {
      throw new Error("QuotaExceededError");
    });
    service.saveSession(
      { type: "americano", name: "X", numberOfPlayers: 8, numberOfRounds: 3, mode: "free", scoringMode: "sets", players: [] },
      [],
    );
    expect(notificationSpy.showSystemError).toHaveBeenCalled();
    Storage.prototype.setItem = originalSetItem;
  });

  it("clearSession removes items", () => {
    localStorage.setItem("paddletools_config", "{}");
    localStorage.setItem("paddletools_matches", "[]");
    service.clearSession();
    expect(localStorage.getItem("paddletools_config")).toBeNull();
    expect(localStorage.getItem("paddletools_matches")).toBeNull();
  });

  it("loadHistory returns empty array on parse error", () => {
    localStorage.setItem("paddletools_history", "invalid json");
    expect(service.loadHistory()).toEqual([]);
  });

  it("saveHistory stores records", () => {
    const record = {
      id: "rec-1",
      createdAt: new Date().toISOString(),
      label: "Test",
      config: {
        type: "americano" as const,
        name: "",
        numberOfPlayers: 8,
        numberOfRounds: 3,
        mode: "free" as const,
        scoringMode: "sets" as const,
        players: [],
      },
      matches: [],
    };
    service.saveHistory([record]);
    expect(localStorage.getItem("paddletools_history")).toContain("rec-1");
  });

  it("saveHistory catches localStorage errors", () => {
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = vi.fn(() => {
      throw new Error("QuotaExceededError");
    });
    service.saveHistory([]);
    expect(notificationSpy.showSystemError).toHaveBeenCalled();
    Storage.prototype.setItem = originalSetItem;
  });

  it("loadSession returns empty on JSON parse error", () => {
    localStorage.setItem("paddletools_config", "invalid");
    const session = service.loadSession();
    expect(session.config).toBeNull();
    expect(session.matches).toEqual([]);
  });
});
