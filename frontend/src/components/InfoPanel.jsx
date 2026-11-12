import { useEffect, useRef } from "react";

export default function InfoPanel({ algo, line }) {
  const listRef = useRef(null);

  // Keep the active line visible when the code window scrolls.
  useEffect(() => {
    const el = listRef.current?.querySelector(".is-active");
    el?.scrollIntoView({ block: "nearest" });
  }, [line]);

  if (!algo) return null;
  return (
    <aside className="info panel">
      <div className="info-meta">
        <h2 className="panel-title">
          <span className="panel-title-jp">{algo.jp}</span>
          {algo.name}
        </h2>
        <p className="info-blurb">{algo.blurb}</p>

        <table className="complexity">
          <tbody>
            <tr>
              <th>Best</th>
              <td>{algo.time.best}</td>
            </tr>
            <tr>
              <th>Average</th>
              <td>{algo.time.average}</td>
            </tr>
            <tr>
              <th>Worst</th>
              <td>{algo.time.worst}</td>
            </tr>
            <tr>
              <th>Space</th>
              <td>{algo.space}</td>
            </tr>
            {algo.stable !== undefined && (
              <tr>
                <th>Stable</th>
                <td>{algo.stable ? "Yes" : "No"}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="code-window">
        <div className="code-titlebar">
          <span className="code-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className="code-title">Technique Scroll · {algo.id}.pseudo</span>
        </div>
        <ol className="pseudo" ref={listRef}>
          {algo.pseudocode.map((l, i) => (
            <li key={i} className={i === line ? "is-active" : ""}>
              <code>{l}</code>
            </li>
          ))}
        </ol>
      </div>
    </aside>
  );
}
