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
          {c.value ? " " : null}
          {c.text}
        </span>
      ))}
    </div>
  );
}
