import { useEffect, useState } from "react";
import { ErrorBoundary } from "./ErrorBoundary";
import { HideoutTab } from "./features/hideout/HideoutTab";
import { LootTab } from "./features/loot/LootTab";
import { QuestsTab } from "./features/quests/QuestsTab";
import { RaidTab } from "./features/raid/RaidTab";
import { SettingsPanel } from "./features/settings/SettingsPanel";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { AppStateProvider, useAppState } from "./state/AppState";

type Tab = "loot" | "raid" | "quests" | "hideout";

const TABS: { id: Tab; label: string }[] = [
  { id: "loot", label: "Loot" },
  { id: "raid", label: "Raid" },
  { id: "quests", label: "Quests" },
  { id: "hideout", label: "Hideout" },
];

export function App() {
  return (
    <AppStateProvider>
      <Shell />
    </AppStateProvider>
  );
}

function Shell() {
  const [storedTab, setTab] = useLocalStorage<Tab>("tc.tab", "loot");
  const tab = TABS.some((t) => t.id === storedTab) ? storedTab : "loot";
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { gameMode, setGameMode } = useAppState();

  // Keyboard shortcuts for alt-tab use: / focuses search, 1-4 switch tabs.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (el.closest("input, textarea, select")) return;
      const index = Number(e.key) - 1;
      if (TABS[index]) {
        setTab(TABS[index].id);
      } else if (e.key === "/") {
        e.preventDefault();
        const focusSearch = () =>
          document.querySelector<HTMLInputElement>("input[data-search]")?.focus();
        // Focus right away when the search box is on screen so no keystrokes are lost.
        if (document.querySelector("input[data-search]")) {
          focusSearch();
        } else {
          setTab("loot");
          requestAnimationFrame(focusSearch);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setTab]);

  return (
    <div className="app">
      <header className="topbar">
        <h1>Tarkov Companion</h1>
        <div className="topbar-actions">
          <div className="segmented" role="group" aria-label="Game mode">
            {(["regular", "pve"] as const).map((m) => (
              <button
                key={m}
                className={gameMode === m ? "active" : ""}
                aria-pressed={gameMode === m}
                onClick={() => setGameMode(m)}
              >
                {m === "regular" ? "PvP" : "PvE"}
              </button>
            ))}
          </div>
          <button
            className={`icon-btn ${settingsOpen ? "active" : ""}`}
            onClick={() => setSettingsOpen((o) => !o)}
            aria-label="Settings"
            aria-expanded={settingsOpen}
            title="Settings"
          >
            ⚙
          </button>
        </div>
      </header>

      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}

      <nav className="tabs">
        {TABS.map((t, i) => (
          <button
            key={t.id}
            className={tab === t.id ? "active" : ""}
            onClick={() => setTab(t.id)}
            title={`Shortcut: ${i + 1}`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main>
        <ErrorBoundary key={tab}>
          {tab === "loot" && <LootTab />}
          {tab === "raid" && <RaidTab />}
          {tab === "quests" && <QuestsTab />}
          {tab === "hideout" && <HideoutTab />}
        </ErrorBoundary>
      </main>

      <footer className="footer">
        Data from{" "}
        <a href="https://tarkov.dev" target="_blank" rel="noreferrer">
          tarkov.dev
        </a>
        . Not affiliated with Battlestate Games.
      </footer>
    </div>
  );
}
