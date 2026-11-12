export const SPEEDS = [
  { label: "Slow-mo", ms: 750 },
  { label: "Calm", ms: 380 },
  { label: "Normal", ms: 170 },
  { label: "Fast", ms: 70 },
  { label: "Hyper!", ms: 18 },
];

export default function Controls({ playing, running, idx, total, speed, onPlay, onPause, onBack, onForward, onRestart, onScrub, onSpeed }) {
  const hasSteps = total > 0;
  return (
    <div className="controls">
      <div className="controls-buttons">
        <button className="btn btn-icon" onClick={onRestart} disabled={!hasSteps || idx === 0} title="Back to start" aria-label="Back to start">
          ⏮
        </button>
        <button className="btn btn-icon" onClick={onBack} disabled={!hasSteps || idx === 0} title="Step back (←)" aria-label="Step back">
          ◀
        </button>
        {playing ? (
          <button className="btn btn-primary btn-play" onClick={onPause} title="Pause (space)">
            ❚❚ PAUSE
          </button>
        ) : (
          <button className="btn btn-primary btn-play" onClick={onPlay} disabled={running} title="Play (space)">
            {running ? "LOADING…" : hasSteps && idx >= total - 1 ? "↻ REPLAY" : hasSteps && idx > 0 ? "▶ RESUME" : "▶ START!"}
          </button>
        )}
        <button className="btn btn-icon" onClick={onForward} disabled={running || (hasSteps && idx >= total - 1)} title="Step forward (→)" aria-label="Step forward">
          ▶
        </button>
      </div>

      <label className="scrub">
        <span className="scrub-count">
          {hasSteps ? `${idx + 1} / ${total}` : "— / —"}
        </span>
        <input
          type="range"
          min={0}
          max={Math.max(total - 1, 0)}
          value={idx}
          disabled={!hasSteps}
          onChange={(e) => onScrub(Number(e.target.value))}
          aria-label="Step"
        />
      </label>

      <label className="speed">
        <span>Speed: {SPEEDS[speed].label}</span>
        <input type="range" min={0} max={SPEEDS.length - 1} value={speed} onChange={(e) => onSpeed(Number(e.target.value))} aria-label="Speed" />
      </label>
    </div>
  );
}
