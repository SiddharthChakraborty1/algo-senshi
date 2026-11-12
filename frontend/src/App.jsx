import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchAlgorithms, runAlgorithm } from "./api.js";
import BarStage from "./components/BarStage.jsx";
import Controls, { SPEEDS } from "./components/Controls.jsx";
import GridStage, { cellKey } from "./components/GridStage.jsx";
import InfoPanel from "./components/InfoPanel.jsx";
import Narrator from "./components/Narrator.jsx";
import TitleCard from "./components/TitleCard.jsx";

const ARCS = [
  { key: "sorting", label: "Sorting Arc", jp: "整列編" },
  { key: "searching", label: "Search Arc", jp: "探索編" },
  { key: "patterns", label: "Patterns Arc", jp: "技法編" },
  { key: "graph", label: "Pathfinding Arc", jp: "経路編" },
];

// Positive values 5..99, or (signed) a mix of negatives and positives in -60..90
// with at least two negatives and one positive so the zero line always matters.
function randomArray(n, signed = false) {
  if (!signed) return Array.from({ length: n }, () => randInt(5, 99));
  const a = Array.from({ length: n }, () => (Math.random() < 0.42 ? -randInt(3, 60) : randInt(3, 90)));
  const negatives = a.filter((v) => v < 0).length;
  for (let i = 0; negatives + i < Math.min(2, n - 1); i++) a[i * 2] = -randInt(3, 60);
  if (!a.some((v) => v > 0)) a[n - 1] = randInt(3, 90);
  return a;
}
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));

// A target that is guaranteed to have an answer, so the first run is a success.
function defaultPatternTarget(id, array) {
  if (id === "two_pointers") {
    const s = [...array].sort((a, b) => a - b);
    const i = randInt(0, s.length - 2);
    return s[i] + s[randInt(i + 1, s.length - 1)];
  }
  const len = Math.min(array.length, randInt(3, 5));
  const start = randInt(0, array.length - len);
  return array.slice(start, start + len).reduce((a, b) => a + b, 0);
}

function readPref(name, fallback) {
  try {
    const v = localStorage.getItem(`algo-senshi:${name}`);
    return v === null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
}
function writePref(name, value) {
  try {
    localStorage.setItem(`algo-senshi:${name}`, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

function emptyGrid() {
  const narrow = typeof window !== "undefined" && window.innerWidth < 720;
  const rows = narrow ? 15 : 17;
  const cols = narrow ? 15 : 31;
  const r = Math.floor(rows / 2);
  return { rows, cols, start: [r, Math.floor(cols / 6)], end: [r, cols - 1 - Math.floor(cols / 6)], walls: new Set(), weights: new Set() };
}

function scatterGrid(g, weighted) {
  const walls = new Set();
  const weights = new Set();
  const protectedKeys = new Set([cellKey(...g.start), cellKey(...g.end)]);
  for (let r = 0; r < g.rows; r++) {
    for (let c = 0; c < g.cols; c++) {
      const k = cellKey(r, c);
      if (protectedKeys.has(k)) continue;
      const roll = Math.random();
      if (roll < 0.27) walls.add(k);
      else if (weighted && roll < 0.42) weights.add(k);
    }
  }
  return { ...g, walls, weights };
}

export default function App() {
  const [algos, setAlgos] = useState([]);
  const [loadState, setLoadState] = useState("loading"); // loading | slow | ready | error
  const [loadError, setLoadError] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  const [size, setSize] = useState(16);
  const [array, setArray] = useState(() => randomArray(16));
  const [target, setTarget] = useState(null);
  const [k, setK] = useState(3);
  const [negativesPref, setNegativesPref] = useState(() => readPref("negatives", false));
  const [customText, setCustomText] = useState("");
  const [inputError, setInputError] = useState("");
  const [grid, setGrid] = useState(emptyGrid);
  const [tool, setTool] = useState("wall");

  const [steps, setSteps] = useState(null);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState("");
  const [speed, setSpeed] = useState(() => readPref("speed", 2));
  const [vhs, setVhs] = useState(() => readPref("vhs", true));
  const [titleAlgo, setTitleAlgo] = useState(null);

  const inputVersion = useRef(0);
  const paintMode = useRef("draw");

  const algo = algos.find((a) => a.id === selectedId) || null;
  const category = algo?.category;
  // "signed" episodes always use negatives, "positive" ones never do, the rest follow the toggle.
  const valuesRule = algo?.values ?? "any";
  const signed = valuesRule === "signed" || (valuesRule === "any" && negativesPref);


  // ---- load the episode list (Render free tier may need ~30s to wake up)
  const load = useCallback(() => {
    setLoadState("loading");
    const slow = setTimeout(() => setLoadState((s) => (s === "loading" ? "slow" : s)), 1500);
    fetchAlgorithms()
      .then((list) => {
        setAlgos(list);
        setSelectedId((id) => id ?? list[0]?.id ?? null);
        setLoadState("ready");
      })
      .catch((e) => {
        setLoadError(e.message);
        setLoadState("error");
      })
      .finally(() => clearTimeout(slow));
  }, []);
  useEffect(load, [load]);

  useEffect(() => writePref("speed", speed), [speed]);
  useEffect(() => writePref("vhs", vhs), [vhs]);

  // ---- any change to the input throws away the old run
  useEffect(() => {
    inputVersion.current += 1;
    setSteps(null);
    setIdx(0);
    setPlaying(false);
    setRunError("");
  }, [array, target, k, grid, selectedId]);

  // ---- a new array (or a new episode) picks a fresh target that has an answer
  const algoId = algo?.id;
  const algoParam = algo?.param;
  useEffect(() => {
    if (category === "searching") setTarget(pick(array));
    else if (algoParam === "target") setTarget(defaultPatternTarget(algoId, array));
  }, [category, array, algoId, algoParam]);

  // ---- window size can't exceed the array
  useEffect(() => {
    if (k > array.length) setK(array.length);
  }, [array, k]);

  // ---- keep the array's signs in line with the episode / the negatives toggle
  useEffect(() => {
    if (!category || category === "graph") return;
    const hasNegative = array.some((v) => v < 0);
    const wrong = signed ? !hasNegative : valuesRule === "positive" ? array.some((v) => v < 1) : hasNegative;
    if (wrong) setArray(randomArray(array.length, signed));
  }, [signed, valuesRule, category, array]);

  useEffect(() => writePref("negatives", negativesPref), [negativesPref]);

  // ---- the Heavy tool only exists for weighted episodes
  useEffect(() => {
    if (category === "graph" && !algo?.weighted && tool === "weight") setTool("wall");
  }, [category, algo, tool]);

  // ---- title card on episode change
  useEffect(() => {
    if (!algo) return;
    setTitleAlgo(algo);
    const t = setTimeout(() => setTitleAlgo(null), 1900);
    return () => clearTimeout(t);
  }, [algo]);

  const payload = useCallback(() => {
    if (category === "sorting") return { array };
    if (category === "searching") return { array, target };
    if (category === "patterns") return algo.param === "k" ? { array, k } : { array, target };
    return {
      grid: {
        rows: grid.rows,
        cols: grid.cols,
        start: grid.start,
        end: grid.end,
        walls: [...grid.walls].map((k) => k.split(",").map(Number)),
        weights: [...grid.weights].map((k) => k.split(",").map(Number)),
      },
    };
  }, [category, algo, array, target, k, grid]);

  const ensureSteps = useCallback(async () => {
    if (steps) return steps;
    if (!algo) return null;
    const version = inputVersion.current;
    setRunning(true);
    setRunError("");
    try {
      const res = await runAlgorithm(algo.id, payload());
      if (version !== inputVersion.current) return null; // input changed mid-request
      setSteps(res.steps);
      setIdx(0);
      return res.steps;
    } catch (e) {
      setRunError(e.message);
      return null;
    } finally {
      setRunning(false);
    }
  }, [steps, algo, payload]);

  const play = useCallback(async () => {
    const s = await ensureSteps();
    if (!s) return;
    setIdx((i) => (i >= s.length - 1 ? 0 : i));
    setPlaying(true);
  }, [ensureSteps]);

  const forward = useCallback(async () => {
    setPlaying(false);
    if (!steps) {
      await ensureSteps();
      return;
    }
    setIdx((i) => Math.min(i + 1, steps.length - 1));
  }, [steps, ensureSteps]);

  const back = useCallback(() => {
    setPlaying(false);
    setIdx((i) => Math.max(i - 1, 0));
  }, []);

  // ---- playback clock
  useEffect(() => {
    if (!playing || !steps) return;
    if (idx >= steps.length - 1) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setIdx((i) => i + 1), SPEEDS[speed].ms);
    return () => clearTimeout(t);
  }, [playing, idx, steps, speed]);

  // ---- keyboard: space = play/pause, arrows = step
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.("input, textarea, select")) return;
      if (e.code === "Space") {
        e.preventDefault();
        playing ? setPlaying(false) : play();
      } else if (e.key === "ArrowRight") forward();
      else if (e.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing, play, forward, back]);

  const step = steps?.[idx] ?? null;

  // ---- grid state at the current step (steps are incremental)
  const graphState = useMemo(() => {
    if (category !== "graph" || !steps) return null;
    const visited = new Set();
    const frontier = new Set();
    let path = null;
    let current = null;
    for (let i = 0; i <= idx; i++) {
      const s = steps[i];
      s.frontier?.forEach(([r, c]) => frontier.add(cellKey(r, c)));
      if (s.visit) {
        const k = cellKey(...s.visit);
        visited.add(k);
        frontier.delete(k);
        current = k;
      }
      if (s.path) path = s.path;
    }
    return { visited, frontier, path, current: path ? null : current };
  }, [category, steps, idx]);

  const needsSorted = algo?.id === "binary" || algo?.id === "two_pointers";
  const shownArray = step?.array ?? (needsSorted ? [...array].sort((a, b) => a - b) : array);

  // ---- input handlers
  const shuffle = (n = size) => {
    setInputError("");
    setArray(randomArray(n, signed));
  };
  const applyCustom = (e) => {
    e.preventDefault();
    const nums = customText
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);
    if (nums.some((n) => !Number.isInteger(n) || n < -999 || n > 999)) return setInputError("Use whole numbers from -999 to 999.");
    if (nums.length < 2 || nums.length > 40) return setInputError("Enter between 2 and 40 numbers.");
    const hasNonPositive = nums.some((n) => n < 1);
    if (hasNonPositive && valuesRule === "positive") return setInputError(`${algo.name} only works with positive numbers.`);
    if (valuesRule === "signed" && !nums.some((n) => n < 0)) return setInputError(`Add a negative number or two, otherwise ${algo.name} is just "add everything".`);
    setInputError("");
    if (valuesRule === "any" && nums.some((n) => n < 0)) setNegativesPref(true);
    setSize(nums.length);
    setArray(nums);
  };

  const paint = useCallback(
    (k, first) => {
      const [r, c] = k.split(",").map(Number);
      setGrid((g) => {
        const isStart = cellKey(...g.start) === k;
        const isEnd = cellKey(...g.end) === k;
        if (tool === "start" || tool === "end") {
          if (isStart || isEnd) return g;
          const walls = new Set(g.walls);
          const weights = new Set(g.weights);
          walls.delete(k);
          weights.delete(k);
          return { ...g, [tool]: [r, c], walls, weights };
        }
        if (isStart || isEnd) return g;
        const name = tool === "wall" ? "walls" : "weights";
        const other = tool === "wall" ? "weights" : "walls";
        if (first) paintMode.current = g[name].has(k) ? "erase" : "draw";
        const mine = new Set(g[name]);
        const theirs = new Set(g[other]);
        if (paintMode.current === "draw") {
          mine.add(k);
          theirs.delete(k);
        } else mine.delete(k);
        return { ...g, [name]: mine, [other]: theirs };
      });
    },
    [tool]
  );

  // ---- narration + mood
  let say;
  if (runError) say = `Nani?! The server says: ${runError}`;
  else if (step) say = step.say;
  else if (running) say = "Charging up…";
  else if (category === "graph") say = "Draw walls on the grid (click and drag), then press START!";
  else if (category === "searching") say = `I'll hunt for ${target ?? "…"}. Press START when you're ready!`;
  else if (algo?.id === "window_fixed") say = `I'll slide a window of ${k} across the array. Press START!`;
  else if (algo?.id === "window_variable") say = `Shortest stretch summing to at least ${target ?? "…"}? Press START!`;
  else if (algo?.id === "kadane") say = "Which stretch has the biggest total? The negatives below the zero line make it tricky. Press START!";
  else if (algo?.id === "two_pointers") say = `Which two values add up to ${target ?? "…"}? Press START!`;
  else say = algo ? `Episode ${algo.episode}: ${algo.name}! Press START and watch closely!` : "";

  const mood = runError
    ? "sad"
    : step?.done
      ? step.missing
        ? "sad"
        : "happy"
      : step?.swap || step?.found != null
        ? "shock"
        : step
          ? "talk"
          : "idle";

  const arcs = ARCS.map((arc) => ({ ...arc, items: algos.filter((a) => a.category === arc.key) }));

  return (
    <div className={`app ${vhs ? "vhs" : ""}`}>
      <header className="header">
        <div className="logo">
          <span className="logo-jp">アルゴ戦士</span>
          <span className="logo-en">ALGO SENSHI</span>
        </div>
        <p className="tagline">Data structures &amp; algorithms, one episode at a time.</p>
        <label className="vhs-toggle">
          <input type="checkbox" checked={vhs} onChange={(e) => setVhs(e.target.checked)} />
          <span>VHS mode</span>
        </label>
      </header>

      {loadState !== "ready" ? (
        <main className="boot">
          {loadState === "error" ? (
            <div className="panel boot-panel">
              <h2>Nani?! Can't reach the server.</h2>
              <p>{loadError}</p>
              <button className="btn btn-primary" onClick={load}>
                Try again
              </button>
            </div>
          ) : (
            <div className="panel boot-panel">
              <div className="boot-spinner" aria-hidden="true">★</div>
              <h2>{loadState === "slow" ? "Waking up the server…" : "Loading episodes…"}</h2>
              {loadState === "slow" && <p>The free backend naps when it's idle. This can take up to a minute the first time.</p>}
            </div>
          )}
        </main>
      ) : (
        <div className="layout">
          <nav className="episodes panel" aria-label="Episodes">
            {arcs.map((arc) => (
              <section key={arc.key} className="arc">
                <h3 className="arc-title">
                  {arc.label} <span>{arc.jp}</span>
                </h3>
                <ul>
                  {arc.items.map((a) => (
                    <li key={a.id}>
                      <button className={`episode ${a.id === selectedId ? "is-active" : ""}`} onClick={() => setSelectedId(a.id)}>
                        <span className="episode-num">{String(a.episode).padStart(2, "0")}</span>
                        <span className="episode-name">{a.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </nav>

          <main className="main">
            <section className={`stage panel ${playing ? "is-playing" : ""}`}>
              <div className="stage-head">
                <span className="stage-ep">EP.{String(algo?.episode ?? 0).padStart(2, "0")}</span>
                <h1 className="stage-title">{algo?.title}</h1>
              </div>

              <div className="stage-body">
                {category === "graph" ? (
                  <GridStage grid={grid} state={graphState} showWeights={!!algo?.weighted} editable={!playing && !running} onPaint={paint} />
                ) : (
                  <BarStage array={shownArray} step={step} category={category} stepIndex={idx} />
                )}
                {step?.done && (
                  <div key={`stamp-${idx}`} className={`stamp ${step.missing ? "is-fail" : ""}`}>
                    {step.missing ? "NANI?!" : step.stamp ?? (category === "sorting" ? "MISSION COMPLETE!" : "FOUND IT!")}
                  </div>
                )}
              </div>

              <Legend category={category} weighted={!!algo?.weighted} />

              <Controls
                playing={playing}
                running={running}
                idx={idx}
                total={steps?.length ?? 0}
                speed={speed}
                onPlay={play}
                onPause={() => setPlaying(false)}
                onBack={back}
                onForward={forward}
                onRestart={() => {
                  setPlaying(false);
                  setIdx(0);
                }}
                onScrub={(i) => {
                  setPlaying(false);
                  setIdx(i);
                }}
                onSpeed={setSpeed}
              />
            </section>

            <Narrator
              text={say}
              mood={mood}
              stepKey={`${selectedId}-${idx}-${!!steps}`}
              typeMs={playing ? Math.min(250, Math.round(SPEEDS[speed].ms * 0.45)) : 250}
            />

            <section className="inputs panel">
              {category === "graph" ? (
                <div className="input-row">
                  <div className="tools" role="radiogroup" aria-label="Drawing tool">
                    {[
                      ["wall", "Wall"],
                      ...(algo?.weighted ? [["weight", "Heavy (×5)"]] : []),
                      ["start", "Move ★ start"],
                      ["end", "Move ◆ goal"],
                    ].map(([id, label]) => (
                      <button key={id} role="radio" aria-checked={tool === id} className={`chip ${tool === id ? "is-active" : ""}`} onClick={() => setTool(id)}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="input-actions">
                    <button className="btn" onClick={() => setGrid((g) => scatterGrid(g, !!algo?.weighted))}>
                      Random maze
                    </button>
                    <button className="btn" onClick={() => setGrid((g) => ({ ...g, walls: new Set(), weights: new Set() }))}>
                      Clear
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="input-row">
                    <label className="size">
                      <span>Size: {size}</span>
                      <input
                        type="range"
                        min={4}
                        max={40}
                        value={size}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          setSize(n);
                          shuffle(n);
                        }}
                      />
                    </label>
                    <button className="btn" onClick={() => shuffle()}>
                      Shuffle
                    </button>
                    <label className={`neg-toggle ${valuesRule !== "any" ? "is-locked" : ""}`} title={valuesRule === "signed" ? "This episode always uses negatives" : valuesRule === "positive" ? "This episode needs positive numbers" : "Mix in values below zero"}>
                      <input type="checkbox" checked={signed} disabled={valuesRule !== "any"} onChange={(e) => setNegativesPref(e.target.checked)} />
                      <span>Negatives{valuesRule === "signed" ? " (always)" : valuesRule === "positive" ? " (off here)" : ""}</span>
                    </label>
                    {algo?.param === "k" && (
                      <label className="size">
                        <span>Window size k: {k}</span>
                        <input type="range" min={1} max={array.length} value={k} onChange={(e) => setK(Number(e.target.value))} />
                      </label>
                    )}
                    {algo?.param === "target" && (
                      <label className="target">
                        <span>{algo.id === "two_pointers" ? "Pair sum" : "Sum ≥"}</span>
                        <input
                          type="number"
                          min={1}
                          max={60000}
                          value={target ?? ""}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            if (Number.isInteger(v) && v >= -60000 && v <= 60000) setTarget(v);
                          }}
                        />
                        <button className="btn btn-small" type="button" onClick={() => setTarget(defaultPatternTarget(algo.id, array))}>
                          Random
                        </button>
                      </label>
                    )}
                    {category === "searching" && (
                      <label className="target">
                        <span>Target</span>
                        <input
                          type="number"
                          min={-999}
                          max={999}
                          value={target ?? ""}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            if (Number.isInteger(v) && v >= -999 && v <= 999) setTarget(v);
                          }}
                        />
                        <button className="btn btn-small" onClick={() => setTarget(pick(array))} type="button">
                          Random
                        </button>
                        <button className="btn btn-small" onClick={() => {
                            const absent = Array.from({ length: 999 }, (_, i) => i + 1).filter((v) => !array.includes(v) && v <= 120);
                            setTarget(pick(absent.length ? absent : [999]));
                          }} type="button" title="Pick a value that isn't in the array">
                          Missing
                        </button>
                      </label>
                    )}
                  </div>
                  <form className="input-row custom" onSubmit={applyCustom}>
                    <input
                      type="text"
                      placeholder="Your own numbers, e.g. 42, -7, 19, 3"
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                      aria-label="Custom numbers"
                    />
                    <button className="btn" type="submit">
                      Use these
                    </button>
                    {inputError && <span className="input-error">{inputError}</span>}
                  </form>
                </>
              )}
            </section>
          </main>

          <InfoPanel algo={algo} line={step?.line} />
        </div>
      )}

      <footer className="footer">
        Space = play/pause · ← → = step · An original fan-made homage to 90s anime.
      </footer>

      <TitleCard algo={titleAlgo} onDone={() => setTitleAlgo(null)} />
    </div>
  );
}

function Legend({ category, weighted }) {
  const items =
    category === "graph"
      ? [
          ["sw-frontier", "Frontier"],
          ["sw-visited", "Visited"],
          ["sw-path", "Path"],
          ["sw-wall", "Wall"],
          ...(weighted ? [["sw-weight", "Heavy"]] : []),
        ]
      : category === "patterns"
        ? [
            ["sw-window", "Window"],
            ["sw-best", "Best so far"],
            ["sw-compare", "Pointers"],
            ["sw-found", "Found"],
          ]
      : category === "searching"
        ? [
            ["sw-compare", "Checking"],
            ["sw-found", "Found"],
            ["sw-dim", "Ruled out"],
          ]
        : [
            ["sw-compare", "Compare"],
            ["sw-swap", "Swap"],
            ["sw-pivot", "Pivot"],
            ["sw-set", "Write"],
            ["sw-sorted", "Final place"],
          ];
  return (
    <ul className="legend">
      {items.map(([cls, label]) => (
        <li key={cls}>
          <span className={`swatch ${cls}`} />
          {label}
        </li>
      ))}
    </ul>
  );
}
