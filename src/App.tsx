import type { GameMode } from "./api/client";
import { PriceSearch } from "./features/prices/PriceSearch";
import { useLocalStorage } from "./hooks/useLocalStorage";

type Tab = "prices" | "quests" | "hideout" | "ammo";

const TABS: { id: Tab; label: string; ready: boolean }[] = [
  { id: "prices", label: "Prices", ready: true },
  { id: "quests", label: "Quests", ready: false },
  { id: "hideout", label: "Hideout", ready: false },
  { id: "ammo", label: "Ammo", ready: false },
];

export function App() {
  const [tab, setTab] = useLocalStorage<Tab>("tc.tab", "prices");
  const [gameMode, setGameMode] = useLocalStorage<GameMode>("tc.gameMode", "regular");

  return (
    <div className="app">
      <header className="topbar">
        <h1>Tarkov Companion</h1>
        <div className="mode-toggle" role="group" aria-label="Game mode">
          {(["regular", "pve"] as const).map((m) => (
            <button
              key={m}
              className={gameMode === m ? "active" : ""}
              onClick={() => setGameMode(m)}
            >
              {m === "regular" ? "PvP" : "PvE"}
            </button>
          ))}
        </div>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? "active" : ""}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {!t.ready && <span className="soon">soon</span>}
          </button>
        ))}
      </nav>

      <main>
        {tab === "prices" ? (
          <PriceSearch gameMode={gameMode} />
        ) : (
          <section className="panel">
            <p className="hint">This tab is coming next.</p>
          </section>
        )}
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
