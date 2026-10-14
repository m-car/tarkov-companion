import { describe, expect, it } from "vitest";
import { containerCategory } from "./containers";

describe("containerCategory", () => {
  it.each([
    ["Medcase", "medical"],
    ["Medbag SMU06", "medical"],
    ["Medical supply crate", "medical"],
    ["Technical supply crate", "tech"],
    ["Toolbox", "tech"],
    ["PC block", "tech"],
    ["Weapon box", "weapons"],
    ["Wooden ammo box", "weapons"],
    ["Grenade box", "weapons"],
    ["Safe", "valuables"],
    ["Jacket", "valuables"],
    ["Cash register", "valuables"],
    ["Ground cache", "valuables"],
    ["Shturman's stash", "valuables"],
    ["Ration supply crate", "supplies"],
    ["Fridge", "supplies"],
    ["Duffle bag", "supplies"],
    ["Drawer", "other"],
    ["Dead Scav", "other"],
    ["Plastic suitcase", "other"],
  ])("%s -> %s", (name, category) => {
    expect(containerCategory(name)).toBe(category);
  });
});
