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
    expect(lazyRoutes).toHaveLength(4);
    lazyRoutes.forEach((route) => {
      expect(route.loadComponent).toBeTypeOf("function");
    });
  });

  it("resolves each lazy component", async () => {
    const rootComponent = await tournamentRoutes[0].loadComponent?.();
    const summaryComponent = await tournamentRoutes[1].loadComponent?.();
    const historyComponent = await tournamentRoutes[3].loadComponent?.();
    const historyDetailComponent = await tournamentRoutes[4].loadComponent?.();

    expect(rootComponent?.name).toBe("PlayerFormPageComponent");
    expect(summaryComponent?.name).toBe("SummaryPageComponent");
    expect(historyComponent?.name).toBe("HistoryPageComponent");
    expect(historyDetailComponent?.name).toBe("HistoryDetailPageComponent");
  });
});
