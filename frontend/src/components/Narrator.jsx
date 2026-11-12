import Mascot from "./Mascot.jsx";

// typeMs: how long the typewriter reveal takes. Kept shorter than one playback step
// so the line is always fully readable before the next one replaces it.
export default function Narrator({ text, mood, stepKey, typeMs = 250 }) {
  return (
    <div className="narrator">
      <div className="narrator-portrait">
        <Mascot mood={mood} />
      </div>
      <div className="dialog" aria-live="polite">
        <span className="dialog-name">KEI</span>
        <p key={stepKey} className={`dialog-text ${typeMs < 60 ? "no-type" : ""}`} style={{ animationDuration: `${typeMs}ms` }}>
          {text}
        </p>
        <span className="dialog-caret" aria-hidden="true">▼</span>
      </div>
    </div>
  );
}
