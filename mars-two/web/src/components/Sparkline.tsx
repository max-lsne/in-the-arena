interface Props {
  values: number[];
  /** Values outside this band are the only thing that carries colour. */
  band: { low: number; high: number };
  /** Whether leaving the band upward is the good direction. */
  higherIsBetter: boolean;
  label: string;
}

/** Time inside the row.
 *
 * "Down 4% this month" and "down every month since March" are different
 * problems, and a single figure hides which one you have. Points outside the
 * expected band are drawn outside the drawn band as well as coloured, so the
 * display survives without colour vision.
 */
export function Sparkline({ values, band, higherIsBetter, label }: Props) {
  if (values.length < 2) return <span className="spark spark--empty" aria-hidden="true" />;

  const min = Math.min(...values, band.low);
  const max = Math.max(...values, band.high);
  const span = max - min || 1;
  const width = 64;
  const height = 18;

  const x = (i: number) => (i / (values.length - 1)) * width;
  const y = (v: number) => height - ((v - min) / span) * height;

  const path = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const last = values[values.length - 1]!;
  const outside = last < band.low ? "low" : last > band.high ? "high" : null;
  const breach = outside ? ((outside === "high") === higherIsBetter ? "above" : "below") : null;

  return (
    <svg
      className="spark"
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={label}
    >
      <rect
        className="spark__band"
        x="0"
        y={y(band.high)}
        width={width}
        height={Math.max(y(band.low) - y(band.high), 1)}
      />
      <path className="spark__line" d={path} />
      <circle
        className="spark__point"
        data-breach={breach ?? undefined}
        cx={x(values.length - 1)}
        cy={y(last)}
        r="2.2"
      />
    </svg>
  );
}
