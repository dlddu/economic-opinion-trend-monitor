// CMP-mapstrip: footer that maps the screen to its journey/value/AC coverage.
export interface Chip {
  value?: string;
  text: string;
  kind?: "v";
}

export function MapStrip({ chips }: { chips: Chip[] }) {
  return (
    <div className="mapstrip">
      <span className="lab">visualizes</span>
      {chips.map((c, i) => (
        <span key={i} className={`chip${c.kind === "v" ? " v" : ""}`}>
          {c.value ? <b>{c.value}</b> : null}
          {/* Journey/step chips separate the badge from the label with a middot;
              value chips run the label straight on. Mirrors the mockups. */}
          {c.value ? (c.kind === "v" ? " " : " · ") : null}
          {c.text}
        </span>
      ))}
    </div>
  );
}
