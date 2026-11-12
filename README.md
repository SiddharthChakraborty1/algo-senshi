# Algo Senshi (アルゴ戦士)

A 90s-anime-style data structures & algorithms visualizer. Every algorithm is an "episode" with a title card, and Kei, the show's guide, narrates each step.

- **Frontend:** React + Vite (`frontend/`), deployed on **Vercel**
- **Backend:** Python FastAPI (`backend/`), deployed on **Render**. It runs the algorithms and returns every step for the frontend to animate.

## Episodes

| Arc | Algorithms |
| --- | --- |
| Sorting | Bubble, Selection, Insertion, Merge, Quick, Heap |
| Search | Linear, Binary |
| Patterns | Sliding Window (fixed k), Shrinking Window (variable size), Two Pointers, Kadane (max subarray, with negatives) |
| Pathfinding | BFS, DFS, Dijkstra (with heavy ×5 cells) |

Controls: play/pause (Space), step back/forward (← →), scrub, speed, custom input (negatives allowed; bars hang below a zero line), random mazes, and a VHS-mode toggle.

## Run locally

Backend (Python 3.10+):

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Frontend (Node 18+), in a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` to the backend, so no env vars are needed locally.

Tests: `cd backend && pip install pytest httpx && pytest`

## API

- `GET /api/algorithms`: episode list with complexity and pseudocode
- `POST /api/run/{id}`: body `{ "array": [...] }`, `{ "array": [...], "target": n }`, or `{ "grid": { rows, cols, start, end, walls, weights } }`; returns `{ steps: [...] }`
- Interactive docs at `/docs`

## Deploy

1. **Render (backend):** New → Blueprint → pick this repo. It reads `render.yaml`. Set `ALLOWED_ORIGINS` to your Vercel URL (e.g. `https://algo-senshi.vercel.app`).
2. **Vercel (frontend):** Add New → Project → import this repo, set **Root Directory** to `frontend`, and add the env var `VITE_API_URL` = your Render URL (e.g. `https://algo-senshi-api.onrender.com`).
3. If you used a different Vercel project name, update `ALLOWED_ORIGIN_REGEX` in Render so preview deployments are allowed too.

The Render free tier sleeps when idle, so the first request can take up to a minute. The frontend shows a "waking up" message while it waits.

---

An original fan-made homage to the look of 90s anime. No characters or artwork from any existing show are used.
