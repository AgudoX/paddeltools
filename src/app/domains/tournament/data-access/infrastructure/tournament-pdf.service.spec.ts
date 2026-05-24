import { TestBed } from "@angular/core/testing";
import { jsPDF } from "jspdf";
import { TournamentPdfService } from "./tournament-pdf.service";
import {
  ClassicTournamentConfig,
  Match,
  Player,
} from "@shared/models/player.model";

const saveMock = vi.hoisted(() => vi.fn());
const addImageMock = vi.hoisted(() => vi.fn());
const addPageMock = vi.hoisted(() => vi.fn());
const roundedRectMock = vi.hoisted(() => vi.fn());
const jsPdfCtorMock = vi.hoisted(() =>
  vi.fn(function JsPdfMock() {
    return {
      internal: {
        pageSize: {
          getWidth: () => 297,
          getHeight: () => 210,
        },
      },
      addImage: vi.fn(),
      addPage: vi.fn(),
      save: vi.fn(),
      setFont: vi.fn(),
      setFontSize: vi.fn(),
      setTextColor: vi.fn(),
      text: vi.fn(),
      setDrawColor: vi.fn(),
      setLineWidth: vi.fn(),
      line: vi.fn(),
      rect: vi.fn(),
      roundedRect: roundedRectMock,
      setFillColor: vi.fn(),
      getTextWidth: vi.fn((text: string) => text.length * 1.8),
    };
  }),
);

vi.mock("jspdf", () => ({
  jsPDF: jsPdfCtorMock,
}));

function makePlayer(id: number, name: string): Player {
  return { id, name, position: "right" };
}

function makeConfig(overrides?: Partial<ClassicTournamentConfig>): ClassicTournamentConfig {
  return {
    type: "classic",
    name: "Padeleria Classic",
    numberOfPlayers: 8,
    format: "single-elimination",
    seeded: true,
    thirdPlaceMatch: true,
    pairs: [
      { id: 1, player1: makePlayer(1, "Ana"), player2: makePlayer(2, "María") },
      { id: 2, player1: makePlayer(3, "Carla"), player2: makePlayer(4, "Luisa") },
      { id: 3, player1: makePlayer(5, "Pedro"), player2: makePlayer(6, "Sofía") },
      { id: 4, player1: makePlayer(7, "Lucía"), player2: makePlayer(8, "Martín") },
    ],
    players: [
      makePlayer(1, "Ana"),
      makePlayer(2, "María"),
      makePlayer(3, "Carla"),
      makePlayer(4, "Luisa"),
      makePlayer(5, "Pedro"),
      makePlayer(6, "Sofía"),
      makePlayer(7, "Lucía"),
      makePlayer(8, "Martín"),
    ],
    ...overrides,
  };
}

function makeLargeConfig(pairCount: number): ClassicTournamentConfig {
  const pairs = Array.from({ length: pairCount }, (_, index) => {
    const pairId = index + 1;
    return {
      id: pairId,
      player1: makePlayer(pairId * 2 - 1, `Jugador ${pairId * 2 - 1}`),
      player2: makePlayer(pairId * 2, `Jugador ${pairId * 2}`),
    };
  });

  return makeConfig({
    format: "groups-and-playoffs",
    numberOfPlayers: pairCount * 2,
    pairs,
    players: pairs.flatMap((pair) => [pair.player1, pair.player2]),
  });
}

function makeMatch(overrides?: Partial<Match>): Match {
  return {
    number: 1,
    round: 1,
    pair1: [makePlayer(1, "Ana"), makePlayer(2, "María")],
    pair2: [makePlayer(3, "Carla"), makePlayer(4, "Luisa")],
    scoringMode: "sets",
    sets: [],
    ...overrides,
  };
}

describe("TournamentPdfService", () => {
  let service: TournamentPdfService;

  beforeEach(() => {
    saveMock.mockReset();
    addImageMock.mockReset();
    addPageMock.mockReset();
    roundedRectMock.mockReset();
    jsPdfCtorMock.mockClear();

    jsPdfCtorMock.mockImplementation(function JsPdfMock() {
      return {
        internal: {
          pageSize: {
            getWidth: () => 297,
            getHeight: () => 210,
          },
        },
        addImage: addImageMock,
        addPage: addPageMock,
        save: saveMock,
        setFont: vi.fn(),
        setFontSize: vi.fn(),
        setTextColor: vi.fn(),
        text: vi.fn(),
        setDrawColor: vi.fn(),
        setLineWidth: vi.fn(),
        line: vi.fn(),
        rect: vi.fn(),
        roundedRect: roundedRectMock,
        setFillColor: vi.fn(),
        getTextWidth: vi.fn((text: string) => text.length * 1.8),
      };
    });

    TestBed.configureTestingModule({});
    service = TestBed.inject(TournamentPdfService);
  });

  it("generates and downloads a classic bracket PDF", () => {
    const config = makeConfig();
    const matches = [makeMatch()];

    service.exportClassicBracket(config, matches, "Padeleria Classic");

    expect(jsPDF).toHaveBeenCalledWith(
      expect.objectContaining({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
        compress: true,
      }),
    );
    expect(saveMock).toHaveBeenCalledWith("padeleria-classic.pdf");
  });

  it("moves single-elimination bracket to its own PDF page", () => {
    const config = makeConfig({ format: "single-elimination" });
    const matches = [makeMatch()];

    service.exportClassicBracket(config, matches, "Direct Bracket");

    expect(addPageMock).toHaveBeenCalledTimes(1);
    expect(saveMock).toHaveBeenCalledWith("direct-bracket.pdf");
  });

  it("renders round titles: Final, Semifinal, and Ronda", () => {
    const config = makeConfig({ thirdPlaceMatch: false });
    const matches = [
      makeMatch({ number: 1, round: 1 }),
      makeMatch({ number: 2, round: 1 }),
      makeMatch({ number: 3, round: 1 }),
      makeMatch({ number: 4, round: 1 }),
      makeMatch({ number: 5, round: 2 }),
      makeMatch({ number: 6, round: 2 }),
      makeMatch({ number: 7, round: 3 }),
    ];

    service.exportClassicBracket(config, matches, "Cuadro");

    expect(jsPDF).toHaveBeenCalled();
    expect(saveMock).toHaveBeenCalled();
  });

  it("adds a second page for groups-and-playoffs exports", () => {
    const config = makeConfig({ format: "groups-and-playoffs" });
    const matches = [
      makeMatch({ stage: "group", groupKey: "Grupo A" }),
      makeMatch({
        number: 2,
        stage: "group",
        groupKey: "Grupo B",
        pair1: [makePlayer(5, "Pablo"), makePlayer(6, "Irene")],
        pair2: [makePlayer(7, "Lola"), makePlayer(8, "Nico")],
      }),
      makeMatch({
        number: 3,
        stage: "playoff",
        round: 1,
        pair1: [makePlayer(9, "1º Grupo A"), makePlayer(10, "1º Grupo A")],
        pair2: [makePlayer(11, "2º Grupo B"), makePlayer(12, "2º Grupo B")],
      }),
    ];

    service.exportClassicBracket(config, matches, "Classic Groups");

    expect(addPageMock).toHaveBeenCalled();
    expect(saveMock).toHaveBeenCalledWith("classic-groups.pdf");
  });

  it("moves group C to a new page before playoffs", () => {
    const config = makeConfig({ format: "groups-and-playoffs" });
    const matches = [
      makeMatch({ stage: "group", groupKey: "Grupo A" }),
      makeMatch({
        number: 2,
        stage: "group",
        groupKey: "Grupo B",
        pair1: [makePlayer(5, "Pablo"), makePlayer(6, "Irene")],
        pair2: [makePlayer(7, "Lola"), makePlayer(8, "Nico")],
      }),
      makeMatch({
        number: 3,
        stage: "group",
        groupKey: "Grupo C",
        pair1: [makePlayer(9, "Mario"), makePlayer(10, "Sara")],
        pair2: [makePlayer(11, "Rafa"), makePlayer(12, "Clara")],
      }),
      makeMatch({
        number: 4,
        stage: "playoff",
        round: 1,
        pair1: [makePlayer(13, "1º Grupo A"), makePlayer(14, "1º Grupo A")],
        pair2: [makePlayer(15, "2º Grupo B"), makePlayer(16, "2º Grupo B")],
      }),
    ];

    service.exportClassicBracket(config, matches, "Classic Group Pages");

    expect(addPageMock).toHaveBeenCalledTimes(2);
    expect(saveMock).toHaveBeenCalledWith("classic-group-pages.pdf");
  });

  it("renders each group on its own page for large group exports", () => {
    const config = makeLargeConfig(24);
    const matches = [
      makeMatch({ stage: "group", groupKey: "Grupo A" }),
      makeMatch({
        number: 2,
        stage: "group",
        groupKey: "Grupo B",
        pair1: [makePlayer(5, "Pablo"), makePlayer(6, "Irene")],
        pair2: [makePlayer(7, "Lola"), makePlayer(8, "Nico")],
      }),
      makeMatch({
        number: 3,
        stage: "group",
        groupKey: "Grupo C",
        pair1: [makePlayer(9, "Mario"), makePlayer(10, "Sara")],
        pair2: [makePlayer(11, "Rafa"), makePlayer(12, "Clara")],
      }),
      makeMatch({
        number: 4,
        stage: "playoff",
        round: 1,
        pair1: [makePlayer(13, "1º Grupo A"), makePlayer(14, "1º Grupo A")],
        pair2: [makePlayer(15, "2º Grupo B"), makePlayer(16, "2º Grupo B")],
      }),
    ];

    service.exportClassicBracket(config, matches, "Large Groups");

    expect(addPageMock).toHaveBeenCalledTimes(4);
    expect(saveMock).toHaveBeenCalledWith("large-groups.pdf");
  });

  it("keeps large group match boxes inside the PDF page width", () => {
    const config = makeLargeConfig(24);
    const matches = [
      ...Array.from({ length: 21 }, (_, index) =>
        makeMatch({
          number: index + 1,
          stage: "group",
          groupKey: "Grupo A",
          pair1: [
            makePlayer(index * 4 + 1, `Jugador ${index * 4 + 1}`),
            makePlayer(index * 4 + 2, `Jugador ${index * 4 + 2}`),
          ],
          pair2: [
            makePlayer(index * 4 + 3, `Jugador ${index * 4 + 3}`),
            makePlayer(index * 4 + 4, `Jugador ${index * 4 + 4}`),
          ],
        }),
      ),
      makeMatch({
        number: 99,
        stage: "playoff",
        round: 1,
        pair1: [makePlayer(201, "1º Grupo A"), makePlayer(202, "1º Grupo A")],
        pair2: [makePlayer(203, "2º Grupo B"), makePlayer(204, "2º Grupo B")],
      }),
    ];

    service.exportClassicBracket(config, matches, "Wide Groups");

    const overflowingRects = roundedRectMock.mock.calls.filter(
      ([x, , width]) =>
        typeof x === "number" &&
        typeof width === "number" &&
        x + width > 279.01,
    );
    expect(overflowingRects).toEqual([]);
  });

  it("keeps large single-elimination bracket boxes inside the PDF page", () => {
    const config = makeConfig({
      format: "single-elimination",
      pairs: Array.from({ length: 32 }, (_, index) => ({
        id: index + 1,
        player1: makePlayer(index * 2 + 1, `Jugador ${index * 2 + 1}`),
        player2: makePlayer(index * 2 + 2, `Jugador ${index * 2 + 2}`),
      })),
    });
    const matches = [
      ...Array.from({ length: 16 }, (_, index) =>
        makeMatch({
          number: index + 1,
          round: 1,
          stage: "playoff",
          pair1: [
            makePlayer(index * 4 + 1, `Jugador ${index * 4 + 1}`),
            makePlayer(index * 4 + 2, `Jugador ${index * 4 + 2}`),
          ],
          pair2: [
            makePlayer(index * 4 + 3, `Jugador ${index * 4 + 3}`),
            makePlayer(index * 4 + 4, `Jugador ${index * 4 + 4}`),
          ],
        }),
      ),
      makeMatch({ number: 17, round: 2, stage: "playoff" }),
      makeMatch({ number: 18, round: 3, stage: "playoff" }),
      makeMatch({ number: 19, round: 4, stage: "playoff" }),
      makeMatch({ number: 20, round: 5, stage: "playoff" }),
    ];

    service.exportClassicBracket(config, matches, "Large Direct");

    const overflowingRects = roundedRectMock.mock.calls.filter(
      ([x, y, width, height]) =>
        typeof x === "number" &&
        typeof y === "number" &&
        typeof width === "number" &&
        typeof height === "number" &&
        (x + width > 279.01 || y + height > 196.01),
    );
    expect(overflowingRects).toEqual([]);
  });

  it("packs small direct-elimination rounds beside each other after a large round", () => {
    const config = makeConfig({
      format: "single-elimination",
      pairs: Array.from({ length: 32 }, (_, index) => ({
        id: index + 1,
        player1: makePlayer(index * 2 + 1, `Jugador ${index * 2 + 1}`),
        player2: makePlayer(index * 2 + 2, `Jugador ${index * 2 + 2}`),
      })),
    });
    const matches = [
      ...Array.from({ length: 16 }, (_, index) =>
        makeMatch({ number: index + 1, round: 1, stage: "playoff" }),
      ),
      ...Array.from({ length: 8 }, (_, index) =>
        makeMatch({ number: index + 17, round: 2, stage: "playoff" }),
      ),
      ...Array.from({ length: 4 }, (_, index) =>
        makeMatch({ number: index + 25, round: 3, stage: "playoff" }),
      ),
      makeMatch({ number: 29, round: 4, stage: "playoff" }),
      makeMatch({ number: 30, round: 5, stage: "playoff" }),
    ];

    service.exportClassicBracket(config, matches, "Packed Direct");

    expect(addPageMock).toHaveBeenCalledTimes(2);
    expect(saveMock).toHaveBeenCalledWith("packed-direct.pdf");
  });

  it("uses a default filename when tournament name is empty", () => {
    const config = makeConfig({ name: "" });
    const matches = [makeMatch()];

    service.exportClassicBracket(config, matches, "");

    expect(saveMock).toHaveBeenCalledWith(
      expect.stringMatching(/cuadro-clasico-padeleria\.pdf/),
    );
  });
});
