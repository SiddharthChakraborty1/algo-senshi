"""Grid pathfinding. Steps are incremental so payloads stay small; the
frontend replays them to build the state at any step index:

    {"visit": [r, c]        (optional) cell just taken off the queue/stack
     "frontier": [[r, c]..] (optional) cells just added to the queue/stack
     "path": [[r, c]..]     (final step only, when the goal was reached)
     "line", "say", "done", "missing"}
"""

from __future__ import annotations

import heapq
from collections import deque

WEIGHT_COST = 5
DIRS = ((-1, 0), (0, 1), (1, 0), (0, -1))


class Grid:
    def __init__(self, rows: int, cols: int, walls, weights, start, end):
        self.rows, self.cols = rows, cols
        self.walls = {tuple(w) for w in walls}
        self.weights = {tuple(w) for w in weights}
        self.start, self.end = tuple(start), tuple(end)
        self.walls.discard(self.start)
        self.walls.discard(self.end)

    def neighbors(self, cell):
        r, c = cell
        for dr, dc in DIRS:
            nr, nc = r + dr, c + dc
            if 0 <= nr < self.rows and 0 <= nc < self.cols and (nr, nc) not in self.walls:
                yield (nr, nc)

    def cost(self, cell) -> int:
        return WEIGHT_COST if cell in self.weights else 1


def _path(parent, end):
    path = []
    cur = end
    while cur is not None:
        path.append(list(cur))
        cur = parent[cur]
    return path[::-1]


def _found(steps, parent, g, name):
    path = _path(parent, g.end)
    cost = sum(g.cost(tuple(c)) for c in path[1:])
    steps.append({"path": path, "line": 4, "say": f"GOAL REACHED! {name} found a path of {len(path) - 1} steps (cost {cost})!", "done": True})
    return steps


def _missing(steps):
    steps.append({"line": 2, "say": "Nani?! The goal is walled off. There's no path!", "done": True, "missing": True})
    return steps


def bfs(g: Grid) -> list[dict]:
    steps = [{"frontier": [list(g.start)], "line": 1, "say": "BFS! I'll spread out in waves, one ring at a time!"}]
    parent = {g.start: None}
    q = deque([g.start])
    while q:
        cell = q.popleft()
        steps.append({"visit": list(cell), "line": 3, "say": f"Exploring {cell[0]},{cell[1]}..."})
        if cell == g.end:
            return _found(steps, parent, g, "BFS")
        new = []
        for nb in g.neighbors(cell):
            if nb not in parent:
                parent[nb] = cell
                q.append(nb)
                new.append(list(nb))
        if new:
            steps.append({"frontier": new, "line": 6, "say": f"Add {len(new)} new neighbor{'s' if len(new) > 1 else ''} to the queue!"})
    return _missing(steps)


def dfs(g: Grid) -> list[dict]:
    steps = [{"frontier": [list(g.start)], "line": 1, "say": "DFS! I'll charge down one path as deep as it goes!"}]
    parent = {g.start: None}
    seen = set()
    stack = [g.start]
    while stack:
        cell = stack.pop()
        if cell in seen:
            continue
        seen.add(cell)
        steps.append({"visit": list(cell), "line": 3, "say": f"Diving into {cell[0]},{cell[1]}!"})
        if cell == g.end:
            return _found(steps, parent, g, "DFS")
        new = []
        # Reverse so the first direction (up) is explored first.
        for nb in reversed(list(g.neighbors(cell))):
            if nb not in seen:
                parent[nb] = cell
                stack.append(nb)
                new.append(list(nb))
        if new:
            steps.append({"frontier": new, "line": 6, "say": "Push the neighbors onto the stack!"})
    return _missing(steps)


def dijkstra(g: Grid) -> list[dict]:
    steps = [{"frontier": [list(g.start)], "line": 1, "say": "Dijkstra! I always expand the cheapest cell first. Heavy cells cost 5!"}]
    dist = {g.start: 0}
    parent = {g.start: None}
    done = set()
    pq = [(0, g.start)]
    while pq:
        d, cell = heapq.heappop(pq)
        if cell in done:
            continue
        done.add(cell)
        steps.append({"visit": list(cell), "line": 3, "say": f"Cheapest cell is {cell[0]},{cell[1]} at cost {d}."})
        if cell == g.end:
            return _found(steps, parent, g, "Dijkstra")
        new = []
        for nb in g.neighbors(cell):
            nd = d + g.cost(nb)
            if nd < dist.get(nb, float("inf")):
                dist[nb] = nd
                parent[nb] = cell
                heapq.heappush(pq, (nd, nb))
                new.append(list(nb))
        if new:
            steps.append({"frontier": new, "line": 6, "say": f"Found cheaper routes to {len(new)} cell{'s' if len(new) > 1 else ''}!"})
    return _missing(steps)
