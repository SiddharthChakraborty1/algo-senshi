function Sparkle({ at }) {
  return (
    <span className="sparkle" style={{ bottom: `${at}%` }} aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

// A bracket drawn over a run of bars, e.g. the current sliding window.
function Frame({ range, n, variant }) {
  if (!range) return null;
  const [l, r] = range;
  return (
    <div
      className={`window-frame ${variant}`}
      style={{ left: `calc(${(l / n) * 100}% - 3px)`, width: `calc(${((r - l + 1) / n) * 100}% + 6px)` }}
      aria-hidden="true"
    >
      {variant === "is-current" && <span className="window-frame-label">WINDOW</span>}
      {variant === "is-best" && <span className="window-frame-label">BEST</span>}
    </div>
  );
}

const STAT_LABELS = { sum: "Sum", best: "Best", target: "Target", shortest: "Shortest", current: "Current run" };

/**
 * Bars grow up from a zero line for positive values and down from it for
 * negative ones. With no negatives the zero line sits at the bottom, so the
 * chart looks like a classic bar chart.
 */
function geometry(array) {
  const hi = Math.max(0, ...array);
  const lo = Math.min(0, ...array);
  const span = hi - lo || 1;
  const zero = (-lo / span) * 100; // % from the bottom of the track
  return { zero, span, hasNegative: lo < 0 };
}

export default function BarStage({ array, step, category, stepIndex }) {
  const s = step || {};
  const sorted = new Set(s.sorted || []);
  const checked = new Set(s.checked || []);
  const showLabels = array.length <= 32;
  const n = array.length;
  const { zero, span, hasNegative } = geometry(array);

  return (
    <div className="bar-stage">
      {s.stats && (
        <dl className="stats">
          {Object.entries(s.stats).map(([k, v]) => (
            <div key={k} className={`stat stat-${k}`}>
              <dt>{STAT_LABELS[k] ?? k}</dt>
              <dd key={`${k}-${v}`}>{v}</dd>
            </div>
          ))}
        </dl>
      )}
      <div className={`bars ${n > 32 ? "bars-dense" : ""} ${hasNegative ? "has-negative" : ""}`}>
        <div className="bars-track">
          {hasNegative && (
            <div className="zero-line" style={{ bottom: `${zero}%` }} aria-hidden="true">
              <span>0</span>
            </div>
          )}
          {category === "patterns" && (
            <>
              {/* Show the best frame only when it differs from the live window. */}
              {s.best && !(s.window && s.window[0] === s.best[0] && s.window[1] === s.best[1]) && <Frame range={s.best} n={n} variant="is-best" />}
              <Frame range={s.window} n={n} variant="is-current" />
            </>
          )}
          {array.map((v, i) => {
            const cls = ["bar"];
            const tags = [];
            if (v < 0) cls.push("is-negative");
            if (category === "sorting") {
              if (sorted.has(i)) cls.push("is-sorted");
              if (s.range && (i < s.range[0] || i > s.range[1])) cls.push("is-dim");
              if (s.compare?.includes(i)) cls.push("is-compare");
              if (s.set?.includes(i)) cls.push("is-set");
              if (s.pivot === i) cls.push("is-pivot");
              if (s.swap?.includes(i)) cls.push("is-swap");
            } else if (category === "patterns") {
              if (s.window && i >= s.window[0] && i <= s.window[1]) cls.push("is-window");
              else if (s.best && i >= s.best[0] && i <= s.best[1]) cls.push("is-best");
              if (s.compare?.includes(i)) cls.push("is-compare");
              if (s.found?.includes(i)) cls.push("is-found");
              if (s.left === i) tags.push("L");
              if (s.right === i) tags.push("R");
            } else {
              if (checked.has(i)) cls.push("is-dim");
              if (s.low != null && (i < s.low || i > s.high)) cls.push("is-dim");
              if (s.current === i) cls.push("is-compare");
              if (s.found === i) cls.push("is-found");
              if (s.low === i) tags.push("LO");
              if (s.current === i) tags.push(s.low != null ? "MID" : "?");
              if (s.high === i) tags.push("HI");
            }
            if (s.done && !s.missing && category === "sorting") cls.push("is-victory");

            const h = (Math.abs(v) / span) * 100;
            const bottom = v < 0 ? zero - h : zero;
            const tip = v < 0 ? bottom : bottom + h; // where the label and sparkles sit
            return (
              <div key={i} className={cls.join(" ")} style={{ "--i": i }}>
                <div className="bar-fill" style={{ bottom: `${bottom}%`, height: `${h}%` }} />
                {showLabels && (
                  <span className="bar-label" style={v < 0 ? { top: `${100 - tip}%` } : { bottom: `${tip}%` }}>
                    {v}
                  </span>
                )}
                {s.swap?.includes(i) && <Sparkle key={`sp-${stepIndex}`} at={v < 0 ? zero : tip} />}
                {tags.length > 0 && <span className="bar-tag">{tags.join("/")}</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
