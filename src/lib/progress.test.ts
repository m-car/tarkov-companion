import { describe, expect, it } from "vitest";
import { completeQuest, RECENT_LIMIT, uncompleteQuest, undoCompletion, type QuestLog } from "./progress";

const empty: QuestLog = { completedTasks: [], recentlyCompleted: [] };

describe("quest log", () => {
  it("records completions newest first with auto-completed prerequisites", () => {
    let log = completeQuest(empty, "a", [], 1);
    log = completeQuest(log, "c", ["a", "b"], 2);
    expect(log.completedTasks).toEqual(["a", "c", "b"]);
    expect(log.recentlyCompleted).toEqual([
      { taskId: "c", alsoCompleted: ["b"], at: 2 },
      { taskId: "a", alsoCompleted: [], at: 1 },
    ]);
  });

  it("undo reverts the quest and only the prerequisites it added", () => {
    let log = completeQuest(empty, "a", [], 1);
    log = completeQuest(log, "c", ["a", "b"], 2);
    log = undoCompletion(log, "c");
    expect(log.completedTasks).toEqual(["a"]);
    expect(log.recentlyCompleted.map((r) => r.taskId)).toEqual(["a"]);
  });

  it("un-marking from the Done list drops it from recent", () => {
    const log = uncompleteQuest(completeQuest(empty, "a", ["p"], 1), "a");
    expect(log.completedTasks).toEqual(["p"]);
    expect(log.recentlyCompleted).toEqual([]);
  });

  it("keeps a bounded history", () => {
    let log = empty;
    for (let i = 0; i < RECENT_LIMIT + 5; i++) log = completeQuest(log, `q${i}`, [], i);
    expect(log.recentlyCompleted).toHaveLength(RECENT_LIMIT);
    expect(log.recentlyCompleted[0].taskId).toBe(`q${RECENT_LIMIT + 4}`);
  });
});
