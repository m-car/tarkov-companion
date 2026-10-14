import { describe, expect, it } from "vitest";
import {
  EMPTY_SESSION,
  endRaid,
  pickedQuests,
  selectMap,
  startRaid,
  toggleHuntItem,
  toggleQuest,
} from "./raidSession";

describe("raid session", () => {
  const available = ["a", "b", "c"];

  it("picks every available quest until you change it", () => {
    const s = selectMap(EMPTY_SESSION, "shoreline");
    expect(pickedQuests(s, available)).toEqual(["a", "b", "c"]);
    const s2 = toggleQuest(s, "b", available);
    expect(pickedQuests(s2, available)).toEqual(["a", "c"]);
    expect(pickedQuests(toggleQuest(s2, "b", available), available)).toEqual(["a", "b", "c"]);
  });

  it("drops picks that are no longer available (e.g. completed)", () => {
    const s = { ...EMPTY_SESSION, questIds: ["a", "gone"] };
    expect(pickedQuests(s, available)).toEqual(["a"]);
  });

  it("resets quest picks when switching maps but keeps the hunt list", () => {
    let s = toggleHuntItem(selectMap(EMPTY_SESSION, "shoreline"), "ledx");
    s = toggleQuest(s, "a", available);
    s = selectMap(s, "woods");
    expect(s.questIds).toBeNull();
    expect(s.huntItems).toEqual(["ledx"]);
  });

  it("start and end", () => {
    let s = selectMap(EMPTY_SESSION, "shoreline");
    s = startRaid(s, pickedQuests(s, available), 100);
    expect(s).toMatchObject({ active: true, startedAt: 100, questIds: ["a", "b", "c"] });
    s = endRaid(s);
    expect(s).toMatchObject({ active: false, startedAt: null, questIds: null, mapId: "shoreline" });
  });
});
