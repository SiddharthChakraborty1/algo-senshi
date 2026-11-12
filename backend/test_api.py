import random

import pytest
from fastapi.testclient import TestClient

from algorithms import ALGORITHMS
from main import app

client = TestClient(app)
SORTS = [a["id"] for a in ALGORITHMS if a["category"] == "sorting"]


def test_list():
    r = client.get("/api/algorithms")
    assert r.status_code == 200
    assert {a["id"] for a in r.json()} >= {"bubble", "binary", "dijkstra"}
    assert all("fn" not in a for a in r.json())


@pytest.mark.parametrize("algo", SORTS)
@pytest.mark.parametrize("seed", range(5))
def test_sorts_sort(algo, seed):
    rnd = random.Random(seed)
    arr = [rnd.randint(1, 99) for _ in range(rnd.randint(2, 30))]
    steps = client.post(f"/api/run/{algo}", json={"array": arr}).json()["steps"]
    assert steps[-1]["array"] == sorted(arr)
    assert steps[-1]["done"] is True
    lines = len(next(a for a in ALGORITHMS if a["id"] == algo)["pseudocode"])
    assert all(s["line"] is None or 0 <= s["line"] < lines for s in steps)


@pytest.mark.parametrize("algo", ["linear", "binary"])
def test_search_found_and_missing(algo):
    arr = [5, 3, 9, 1, 7]
    last = client.post(f"/api/run/{algo}", json={"array": arr, "target": 9}).json()["steps"][-1]
    assert last["array"][last["found"]] == 9
    last = client.post(f"/api/run/{algo}", json={"array": arr, "target": 4}).json()["steps"][-1]
    assert last.get("missing") is True


def grid(**kw):
    g = {"rows": 5, "cols": 5, "start": [0, 0], "end": [4, 4], "walls": [], "weights": []}
    g.update(kw)
    return {"grid": g}


@pytest.mark.parametrize("algo", ["bfs", "dfs", "dijkstra"])
def test_paths(algo):
    last = client.post(f"/api/run/{algo}", json=grid()).json()["steps"][-1]
    assert last["path"][0] == [0, 0] and last["path"][-1] == [4, 4]
    if algo != "dfs":
        assert len(last["path"]) == 9  # shortest Manhattan path


def test_blocked():
    walls = [[1, c] for c in range(5)]
    last = client.post("/api/run/bfs", json=grid(walls=walls)).json()["steps"][-1]
    assert last.get("missing") is True


def test_dijkstra_avoids_weights():
    # A weighted column forces Dijkstra around it through the open bottom row.
    weights = [[r, 2] for r in range(4)]
    last = client.post("/api/run/dijkstra", json=grid(weights=weights)).json()["steps"][-1]
    assert [3, 2] not in last["path"] or [4, 2] in last["path"]
    cost = sum(5 if c in weights else 1 for c in last["path"][1:])
    assert cost <= 12


def test_validation():
    assert client.post("/api/run/nope", json={}).status_code == 404
    assert client.post("/api/run/bubble", json={}).status_code == 422
    assert client.post("/api/run/bubble", json={"array": [1] * 100}).status_code == 422
    assert client.post("/api/run/bfs", json=grid(end=[9, 9])).status_code == 422


def brute_best_window(arr, k):
    return max(sum(arr[i:i + k]) for i in range(len(arr) - k + 1))


def brute_shortest(arr, target):
    best = None
    for i in range(len(arr)):
        for j in range(i, len(arr)):
            if sum(arr[i:j + 1]) >= target and (best is None or j - i + 1 < best):
                best = j - i + 1
    return best


@pytest.mark.parametrize("seed", range(8))
def test_patterns_match_brute_force(seed):
    rnd = random.Random(seed)
    arr = [rnd.randint(1, 99) for _ in range(rnd.randint(4, 30))]
    k = rnd.randint(1, len(arr))
    last = client.post("/api/run/window_fixed", json={"array": arr, "k": k}).json()["steps"][-1]
    assert last["stats"]["best"] == brute_best_window(arr, k)
    lo, hi = last["best"]
    assert hi - lo + 1 == k and sum(arr[lo:hi + 1]) == last["stats"]["best"]

    target = rnd.randint(50, 600)
    last = client.post("/api/run/window_variable", json={"array": arr, "target": target}).json()["steps"][-1]
    expected = brute_shortest(arr, target)
    if expected is None:
        assert last.get("missing") is True
    else:
        assert last["stats"]["shortest"] == expected
        lo, hi = last["best"]
        assert sum(arr[lo:hi + 1]) >= target and hi - lo + 1 == expected

    s = sorted(arr)
    pair_target = rnd.choice([s[0] + s[-1], s[1] + s[2], 9999])
    last = client.post("/api/run/two_pointers", json={"array": arr, "target": pair_target}).json()["steps"][-1]
    has_pair = any(s[i] + s[j] == pair_target for i in range(len(s)) for j in range(i + 1, len(s)))
    if has_pair:
        i, j = last["found"]
        assert last["array"][i] + last["array"][j] == pair_target and i < j
    else:
        assert last.get("missing") is True


def test_pattern_validation():
    assert client.post("/api/run/window_fixed", json={"array": [1, 2, 3]}).status_code == 422
    assert client.post("/api/run/window_fixed", json={"array": [1, 2, 3], "k": 5}).status_code == 422


@pytest.mark.parametrize("seed", range(10))
def test_kadane_matches_brute_force(seed):
    rnd = random.Random(100 + seed)
    arr = [rnd.randint(-60, 60) for _ in range(rnd.randint(2, 30))]
    last = client.post("/api/run/kadane", json={"array": arr}).json()["steps"][-1]
    expected = max(sum(arr[i:j + 1]) for i in range(len(arr)) for j in range(i, len(arr)))
    assert last["stats"]["best"] == expected
    lo, hi = last["best"]
    assert sum(arr[lo:hi + 1]) == expected


def test_kadane_all_negative():
    last = client.post("/api/run/kadane", json={"array": [-8, -3, -5]}).json()["steps"][-1]
    assert last["stats"]["best"] == -3 and last["best"] == [1, 1]


@pytest.mark.parametrize("algo", SORTS)
def test_sorts_handle_negatives(algo):
    arr = [5, -3, 0, -40, 12, -3, 7]
    last = client.post(f"/api/run/{algo}", json={"array": arr}).json()["steps"][-1]
    assert last["array"] == sorted(arr)


def test_shrinking_window_rejects_negatives():
    r = client.post("/api/run/window_variable", json={"array": [4, -2, 6], "target": 5})
    assert r.status_code == 422
