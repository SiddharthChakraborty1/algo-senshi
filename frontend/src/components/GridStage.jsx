import { useMemo, useRef } from "react";

export const cellKey = (r, c) => `${r},${c}`;

export default function GridStage({ grid, state, showWeights, editable, onPaint }) {
  const { rows, cols, start, end, walls, weights } = grid;
  const painting = useRef(false);
  const last = useRef(null);
  const startKey = cellKey(...start);
  const endKey = cellKey(...end);

  const pathIndex = useMemo(
    () => new Map((state?.path || []).map(([r, c], i) => [cellKey(r, c), i])),
    [state]
  );

  const cellAt = (e) => {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    return el?.closest?.("[data-cell]")?.dataset.cell ?? null;
  };

  const onDown = (e) => {
    if (!editable) return;
    const k = cellAt(e);
    if (!k) return;
    e.preventDefault();
    painting.current = true;
    last.current = k;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    onPaint(k, true);
  };
  const onMove = (e) => {
    if (!painting.current) return;
    const k = cellAt(e);
    if (k && k !== last.current) {
      last.current = k;
      onPaint(k, false);
    }
  };
  const onUp = () => {
    painting.current = false;
    last.current = null;
  };

  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const k = cellKey(r, c);
      const cls = ["cell"];
      let style;
      let glyph = null;
      if (k === startKey) {
        cls.push("is-start");
        glyph = "★";
      } else if (k === endKey) {
        cls.push("is-end");
        glyph = "◆";
      } else if (walls.has(k)) cls.push("is-wall");
      else if (showWeights && weights.has(k)) cls.push("is-weight");
      if (state) {
        if (pathIndex.has(k)) {
          cls.push("is-path");
          style = { animationDelay: `${pathIndex.get(k) * 28}ms` };
        } else if (state.current === k) cls.push("is-current");
        else if (state.visited.has(k)) cls.push("is-visited");
        else if (state.frontier.has(k)) cls.push("is-frontier");
      }
      cells.push(
        <div key={k} data-cell={k} className={cls.join(" ")} style={style}>
          {glyph}
        </div>
      );
    }
  }

  return (
    <div
      className={`grid ${editable ? "is-editable" : ""}`}
      // Keep the whole grid (and the controls under it) on screen: width is capped by
      // the height left for the stage, scaled by the grid's aspect ratio.
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, maxWidth: `min(900px, calc((100vh - 360px) * ${cols / rows}))`, minWidth: "min(100%, 280px)" }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      {cells}
    </div>
  );
}
