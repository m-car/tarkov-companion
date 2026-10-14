import { describe, expect, it } from "vitest";
import { DEFAULT_FILTERS, setCategory, setType, typeVisible } from "./useMapFilters";

describe("map filters", () => {
  const medcase = { typeId: "medcase", category: "medical" as const };
  const medbag = { typeId: "medbag", category: "medical" as const };

  it("starts with containers off", () => {
    expect(typeVisible(DEFAULT_FILTERS, medcase)).toBe(false);
  });

  it("category toggles cover all its types; per-type exceptions win until the category is toggled again", () => {
    let f = setCategory(DEFAULT_FILTERS, "medical", true, ["medcase", "medbag"]);
    expect([typeVisible(f, medcase), typeVisible(f, medbag)]).toEqual([true, true]);
    f = setType(f, "medbag", false);
    expect([typeVisible(f, medcase), typeVisible(f, medbag)]).toEqual([true, false]);
    f = setCategory(f, "medical", true, ["medcase", "medbag"]);
    expect(typeVisible(f, medbag)).toBe(true);
    f = setCategory(f, "medical", false, ["medcase", "medbag"]);
    expect([typeVisible(f, medcase), typeVisible(f, medbag)]).toEqual([false, false]);
  });

  it("a single type can be on while its category is off", () => {
    const f = setType(DEFAULT_FILTERS, "medcase", true);
    expect([typeVisible(f, medcase), typeVisible(f, medbag)]).toEqual([true, false]);
  });
});
