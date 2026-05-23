import { appConfig } from "./app.config";
import { routes } from "./app.routes";

describe("appConfig", () => {
  it("provides router and animations", () => {
    expect(appConfig.providers).toHaveLength(2);
  });

  it("is wired to the exported app routes", () => {
    expect(routes).toHaveLength(2);
    expect(routes[0].path).toBe("");
    expect(routes[1].path).toBe("**");
  });
});
