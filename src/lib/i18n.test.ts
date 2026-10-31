import { describe, expect, it } from "vitest";
import { translate } from "./i18n";

describe("translations", () => {
  it("uses the source message in English", () => {
    expect(translate("Settings", "en")).toBe("Settings");
  });

  it("translates supported Spanish messages", () => {
    expect(translate("Settings", "es")).toBe("Ajustes");
  });
});
