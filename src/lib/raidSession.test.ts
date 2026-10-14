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

  it("starts with nothing picked; you add the quests you want", () => {
    const s = selectMap(EMPTY_SESSION, "shoreline");
    expect(pickedQuests(s, available)).toEqual([]);
    const s2 = toggleQuest(toggleQuest(s, "c", available), "a", available);
    expect(pickedQuests(s2, available)).toEqual(["a", "c"]);
    expect(pickedQuests(toggleQuest(s2, "c", available), available)).toEqual(["a"]);
  });

  it("treats older saved 'all' sessions as none picked", () => {
    const old = { ...EMPTY_SESSION, questIds: null as unknown as string[] };
    expect(pickedQuests(old, available)).toEqual([]);
  });

  it("drops picks that are no longer available (e.g. completed)", () => {
    const s = { ...EMPTY_SESSION, questIds: ["a", "gone"] };
    expect(pickedQuests(s, available)).toEqual(["a"]);
  });

  it("resets quest picks when switching maps but keeps the hunt list", () => {
    let s = toggleHuntItem(selectMap(EMPTY_SESSION, "shoreline"), "ledx");
    s = toggleQuest(s, "a", available);
    s = selectMap(s, "woods");
    expect(s.questIds).toEqual([]);
    expect(s.huntItems).toEqual(["ledx"]);
  });

  it("start and end", () => {
    let s = toggleQuest(selectMap(EMPTY_SESSION, "shoreline"), "b", available);
    s = startRaid(s, pickedQuests(s, available), 100);
    expect(s).toMatchObject({ active: true, startedAt: 100, questIds: ["b"] });
    s = endRaid(s);
    expect(s).toMatchObject({ active: false, startedAt: null, questIds: [], mapId: "shoreline" });
  });
});
