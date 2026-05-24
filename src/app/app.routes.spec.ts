import { routes } from "./app.routes";
import { tournamentRoutes } from "@domain/tournament/tournament.routes";

describe("app routes", () => {
  it("defines the root lazy-loaded tournament entry", async () => {
    expect(routes[0].path).toBe("");
    expect(routes[0].loadChildren).toBeTypeOf("function");

    const loadedRoutes = await routes[0].loadChildren?.();
    expect(loadedRoutes).toBe(tournamentRoutes);
  });

  it("defines the wildcard redirect", () => {
    expect(routes[1]).toMatchObject({
      path: "**",
      redirectTo: "",
    });
  });
});

describe("tournament routes", () => {
  it("defines all expected feature paths", () => {
    expect(tournamentRoutes.map((route) => route.path)).toEqual([
      "",
      "tournament/:id",
      "classic-tournament/:id",
      "summary",
      "history",
      "history/:id",
    ]);
  });

  it("redirects legacy summary path to the form", () => {
    const summaryRoute = tournamentRoutes.find((route) => route.path === "summary");

    expect(summaryRoute).toMatchObject({
      redirectTo: "",
      pathMatch: "full",
    });
  });

  it("keeps lazy component factories on navigable routes", () => {
    const lazyRoutes = tournamentRoutes.filter((route) => route.loadComponent);
    expect(lazyRoutes).toHaveLength(5);
    lazyRoutes.forEach((route) => {
      expect(route.loadComponent).toBeTypeOf("function");
    });
  });

  it("resolves each lazy component", async () => {
    const rootComponent = await tournamentRoutes[0].loadComponent?.() as { name: string };
    const summaryComponent = await tournamentRoutes[1].loadComponent?.() as { name: string };
    const classicComponent = await tournamentRoutes[2].loadComponent?.() as { name: string };
    const historyComponent = await tournamentRoutes[4].loadComponent?.() as { name: string };
    const historyDetailComponent = await tournamentRoutes[5].loadComponent?.() as { name: string };

    expect(rootComponent?.name).toBe("PlayerFormPageComponent");
    expect(summaryComponent?.name).toBe("SummaryPageComponent");
    expect(classicComponent?.name).toBe("ClassicTournamentPageComponent");
    expect(historyComponent?.name).toBe("HistoryPageComponent");
    expect(historyDetailComponent?.name).toBe("HistoryDetailPageComponent");
  });
});
