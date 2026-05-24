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
      setFillColor: vi.fn(),
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
    ...overrides,
  };
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
        setFillColor: vi.fn(),
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

  it("uses a default filename when tournament name is empty", () => {
    const config = makeConfig({ name: "" });
    const matches = [makeMatch()];

    service.exportClassicBracket(config, matches, "");

    expect(saveMock).toHaveBeenCalledWith(
      expect.stringMatching(/cuadro-clasico-padeleria\.pdf/),
    );
  });
});
