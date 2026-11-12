import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, conint, conlist

from algorithms import ALGORITHMS, BY_ID, public_meta
from algorithms.graph import Grid

app = FastAPI(title="Algo Senshi API", version="1.0.0")

# Comma-separated list of exact origins, e.g. "https://algo-senshi.vercel.app".
origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",") if o.strip()]
# Optional regex so Vercel preview deployments also work, e.g. "https://algo-senshi.*\.vercel\.app".
origin_regex = os.getenv("ALLOWED_ORIGIN_REGEX") or None

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=origin_regex,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Values may be negative (Kadane's algorithm, signed sorting).
Value = conint(ge=-999, le=999)
Cell = conlist(conint(ge=0, le=99), min_length=2, max_length=2)


class GridInput(BaseModel):
    rows: conint(ge=2, le=40)
    cols: conint(ge=2, le=60)
    start: Cell
    end: Cell
    walls: list[Cell] = Field(default_factory=list)
    weights: list[Cell] = Field(default_factory=list)


class RunRequest(BaseModel):
    array: conlist(Value, min_length=2, max_length=60) | None = None
    # Search targets are values; pattern targets are sums, so allow larger numbers.
    target: conint(ge=-60000, le=60000) | None = None
    k: conint(ge=1, le=60) | None = None
    grid: GridInput | None = None


@app.get("/")
def root():
    return {"name": "Algo Senshi API", "docs": "/docs"}


@app.get("/api/health")
def health():
    return {"ok": True}


@app.get("/api/algorithms")
def list_algorithms():
    return [public_meta(a) for a in ALGORITHMS]


@app.post("/api/run/{algo_id}")
def run(algo_id: str, req: RunRequest):
    algo = BY_ID.get(algo_id)
    if algo is None:
        raise HTTPException(404, f"Unknown algorithm '{algo_id}'")

    category = algo["category"]
    if category == "sorting":
        if req.array is None:
            raise HTTPException(422, "Sorting needs an 'array'.")
        steps = algo["fn"](req.array)
    elif category == "searching":
        if req.array is None or req.target is None:
            raise HTTPException(422, "Searching needs an 'array' and a 'target'.")
        steps = algo["fn"](req.array, req.target)
    elif category == "patterns":
        param = algo["param"]
        value = getattr(req, param) if param else None
        if param and (req.array is None or value is None):
            raise HTTPException(422, f"{algo['name']} needs an 'array' and '{param}'.")
        if req.array is None:
            raise HTTPException(422, f"{algo['name']} needs an 'array'.")
        if algo.get("values") == "positive" and min(req.array) < 1:
            raise HTTPException(422, f"{algo['name']} only works with positive numbers.")
        if param is None:
            steps = algo["fn"](req.array)
            return {"algorithm": algo_id, "count": len(steps), "steps": steps}
        if param == "k" and value > len(req.array):
            raise HTTPException(422, "'k' can't be bigger than the array.")
        steps = algo["fn"](req.array, value)
    else:
        g = req.grid
        if g is None:
            raise HTTPException(422, "Pathfinding needs a 'grid'.")
        for name, cell in (("start", g.start), ("end", g.end)):
            if cell[0] >= g.rows or cell[1] >= g.cols:
                raise HTTPException(422, f"'{name}' is outside the grid.")
        grid = Grid(g.rows, g.cols, g.walls, g.weights if algo.get("weighted") else [], g.start, g.end)
        steps = algo["fn"](grid)

    return {"algorithm": algo_id, "count": len(steps), "steps": steps}
