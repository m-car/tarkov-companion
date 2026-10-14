export type ContainerCategory = "medical" | "tech" | "weapons" | "valuables" | "supplies" | "other";

export const CONTAINER_CATEGORIES: { id: ContainerCategory; name: string; color: string }[] = [
  { id: "medical", name: "Medical", color: "#ef5350" },
  { id: "tech", name: "Tech", color: "#42a5f5" },
  { id: "weapons", name: "Weapons & ammo", color: "#a1887f" },
  { id: "valuables", name: "Valuables", color: "#ffee58" },
  { id: "supplies", name: "Food & supplies", color: "#9ccc65" },
  { id: "other", name: "Other", color: "#9e9e9e" },
];

// First match wins, so specific words ("medical supply crate") come before generic ones.
const RULES: [ContainerCategory, RegExp][] = [
  ["medical", /\bmed|first aid|medicine/i],
  ["tech", /technical|toolbox|tool box|pc block|computer|server|tech\b/i],
  ["weapons", /weapon|ammo|grenade|armory|rifle|gun/i],
  ["valuables", /safe|jacket|cash register|register|stash|vault|cache/i],
  ["supplies", /ration|fridge|food|duffle|sport bag|supply/i],
];

/** Groups a container type by its English name, e.g. "Medcase" -> medical. */
export function containerCategory(name: string): ContainerCategory {
  for (const [category, pattern] of RULES) if (pattern.test(name)) return category;
  return "other";
}

export function categoryColor(category: ContainerCategory): string {
  return CONTAINER_CATEGORIES.find((c) => c.id === category)?.color ?? "#9e9e9e";
}
