import type { Loaded } from "../hooks/useLoader";

/** Shows a loading or error message for any not-ready loaders; renders nothing when all are ready. */
export function LoadState({
  states,
  what,
  onRetry,
}: {
  states: Loaded<unknown>[];
  what: string;
  onRetry: () => void;
}) {
  const failed = states.find((s) => s.status === "error");
  if (failed && failed.status === "error") {
    return (
      <div>
        <p className="error">
          Couldn't load {what}: {failed.error}
        </p>
        <button className="btn" onClick={onRetry}>
          Try again
        </button>
      </div>
    );
  }
  if (states.some((s) => s.status === "loading")) {
    return <p className="hint">Loading {what}…</p>;
  }
  return null;
}
