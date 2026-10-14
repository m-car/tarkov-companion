import type { ReactNode } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";

/** A titled section you can fold away; remembers whether it was open. */
export function Collapsible({
  id,
  title,
  meta,
  defaultOpen = true,
  collapsedHint,
  children,
}: {
  /** Storage key for the open state. */
  id: string;
  title: ReactNode;
  /** Shown next to the title, e.g. a count. */
  meta?: ReactNode;
  defaultOpen?: boolean;
  /** Shown under the title while the section is folded. */
  collapsedHint?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useLocalStorage(`tc.open.${id}`, defaultOpen);
  return (
    <>
      <details className="collapsible" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
        <summary>
          <span className="section-title">{title}</span>
          {meta && <span className="muted"> {meta}</span>}
        </summary>
        {children}
      </details>
      {!open && collapsedHint && <p className="collapsed-hint muted small">{collapsedHint}</p>}
    </>
  );
}
