type Point = { value: number; label: string };

function pathFor(points: readonly Point[], width: number, height: number): string {
  if (points.length < 2) return "";
  const values = points.map((point) => point.value);
  const lowest = Math.min(...values);
  const highest = Math.max(...values);
  const range = highest - lowest || 1;
  return points.map((point, index) => {
    const x = (index / (points.length - 1)) * width;
    const y = height - ((point.value - lowest) / range) * height;
    return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
}

export function LiveSparkline({ points, direction = "neutral", label }: { points: readonly Point[]; direction?: "up" | "down" | "neutral"; label: string }) {
  const line = pathFor(points, 104, 30);
  const tone = direction === "up" ? "spark-up" : direction === "down" ? "spark-down" : "spark-neutral";
  if (points.length < 2) {
    return <span className={`spark-placeholder ${tone}`} role="img" aria-label={`${label}: insufficient timestamped observations`}><i /></span>;
  }
  return <svg className={`sparkline ${tone}`} viewBox="0 0 104 30" role="img" aria-label={label}>
    <path d={line} fill="none" pathLength="1" />
  </svg>;
}

export function ProbabilityChart({ points, headline, mode = "Probability" }: { points: readonly Point[]; headline: string; mode?: string }) {
  const line = pathFor(points, 720, 220);
  const hasSeries = points.length > 1;
  const latest = points.at(-1);
  return <section className="chart-panel" aria-label={`${mode} chart`}>
    <div className="chart-header"><div><p className="eyebrow">{mode.toUpperCase()}</p><h2>{headline}</h2></div><span className="chart-reading">{latest ? `${latest.value.toFixed(1)}%` : "—"}</span></div>
    <div className="chart-stage">
      <svg viewBox="0 0 720 220" preserveAspectRatio="none" role="img" aria-label={hasSeries ? `${mode} observations over time` : "No live observations are available"}>
        <defs><linearGradient id="terminal-fill" x1="0" x2="0" y1="0" y2="1"><stop stopColor="currentColor" stopOpacity=".24" /><stop offset="1" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs>
        <path className="chart-grid" d="M0 44H720M0 88H720M0 132H720M0 176H720M144 0V220M288 0V220M432 0V220M576 0V220" />
        {hasSeries ? <><path className="chart-fill" d={`${line} L720 220 L0 220 Z`} /><path className="chart-line" d={line} pathLength="1" /></> : <circle className="chart-point" cx="360" cy="110" r="5" />}
      </svg>
      {hasSeries ? null : <div className="empty-chart"><strong>NO LIVE TIME SERIES</strong><span>Awaiting an authorised provider observation.</span></div>}
    </div>
    <div className="chart-axis"><span>PRE</span><span>KO</span><span>HT</span><span>FT</span></div>
    <p className="chart-note">{hasSeries ? "Every point is timestamped source data." : "The terminal never invents live movement when a provider is unavailable."}</p>
  </section>;
}
