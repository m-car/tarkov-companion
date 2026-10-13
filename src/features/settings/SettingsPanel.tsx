import { Segmented } from "../../components/Segmented";
import type { Faction } from "../../lib/quests";
import { useAppState } from "../../state/AppState";

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { playerLevel, setPlayerLevel, settings, updateSettings, gameMode } = useAppState();

  return (
    <section className="panel settings">
      <div className="settings-row">
        <label htmlFor="lvl">Your level ({gameMode === "pve" ? "PvE" : "PvP"})</label>
        <div className="stepper">
          <button onClick={() => setPlayerLevel(Math.max(1, playerLevel - 1))} aria-label="Lower level">
            −
          </button>
          <input
            id="lvl"
            type="number"
            min={1}
            max={79}
            value={playerLevel}
            onChange={(e) => setPlayerLevel(Math.max(1, Math.min(79, Number(e.target.value) || 1)))}
          />
          <button onClick={() => setPlayerLevel(Math.min(79, playerLevel + 1))} aria-label="Raise level">
            +
          </button>
        </div>
      </div>
      <div className="settings-row">
        <span>Faction</span>
        <Segmented<Faction>
          label="Faction"
          value={settings.faction}
          onChange={(faction) => updateSettings({ faction })}
          options={[
            { value: "Any", label: "Not set" },
            { value: "USEC", label: "USEC" },
            { value: "BEAR", label: "BEAR" },
          ]}
        />
      </div>
      <div className="settings-row">
        <label htmlFor="threshold">Keep loot worth at least (₽ per slot)</label>
        <input
          id="threshold"
          type="number"
          min={0}
          step={5000}
          value={settings.perSlotThreshold}
          onChange={(e) => updateSettings({ perSlotThreshold: Math.max(0, Number(e.target.value) || 0) })}
        />
      </div>
      <p className="hint small">
        Shortcuts: <kbd>/</kbd> search loot · <kbd>1</kbd>–<kbd>4</kbd> switch tabs · <kbd>Esc</kbd>{" "}
        clear search. Progress is saved in this browser, separately for PvP and PvE.
      </p>
      <button className="btn" onClick={onClose}>
        Done
      </button>
    </section>
  );
}
