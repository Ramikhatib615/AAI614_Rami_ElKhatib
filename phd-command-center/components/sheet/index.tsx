import type { ReactNode } from "react";

/** A map-sheet plate: neatline border, square corners, corner ticks, no shadow. */
export function Plate({
  children,
  raised = false,
  ticks = true,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  raised?: boolean;
  /** Corner ticks suit a full plate; a small control reads better without them. */
  ticks?: boolean;
  className?: string;
  as?: "div" | "article" | "section" | "li";
}) {
  const classes = ["plate", ticks ? "plate-ticks" : "", raised ? "plate-raised" : "", className]
    .filter(Boolean)
    .join(" ");
  return <Tag className={classes}>{children}</Tag>;
}

/**
 * A section heading marked like a survey station: a number in the margin, sentence case, no
 * all-caps eyebrow and no middle dots.
 */
export function StationHeading({
  number,
  children,
  id,
}: {
  number: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <div className="flex items-baseline gap-3">
      <span aria-hidden className="station font-mono text-sm">
        {number}
      </span>
      <h2 id={id} className="font-display text-2xl sm:text-3xl">
        {children}
      </h2>
    </div>
  );
}

/** The control point mark, used as a list marker. */
export function ControlPoint() {
  return (
    <span aria-hidden className="mt-[0.35em] shrink-0 text-contour">
      ▲
    </span>
  );
}

export function MarkedList({ items }: { items: { id: string; text: string }[] }) {
  return (
    <ul className="mt-4 space-y-3">
      {items.map((item) => (
        <li key={item.id} className="measure flex gap-3">
          <ControlPoint />
          <span>{item.text}</span>
        </li>
      ))}
    </ul>
  );
}
