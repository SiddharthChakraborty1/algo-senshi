"""Array technique patterns: sliding windows and two pointers.

Steps are full snapshots:

    {"array", "window": [l, r], "best": [l, r], "left": i, "right": j,
     "compare": [i, j], "found": [i, j], "stats": {label: value},
     "stamp": "...", "line", "say", "done", "missing"}
"""

from __future__ import annotations


def _step(arr, say, line, **kw):
    s = {"array": arr, "line": line, "say": say}
    s.update({k: v for k, v in kw.items() if v is not None})
    return s


def sliding_window_fixed(arr: list[int], k: int) -> list[dict]:
    n = len(arr)
    k = max(1, min(k, n))
    steps = [_step(arr, f"Sliding Window! I'll find the size-{k} window with the biggest sum, without re-adding everything each time!", 0)]
    total = 0
    for i in range(k):
        total += arr[i]
        steps.append(_step(arr, f"Build the first window: add {arr[i]} → sum {total}.", 1, window=[0, i], stats={"sum": total}))
    best, best_win = total, [0, k - 1]
    steps.append(_step(arr, f"First window sum is {total}. That's our best so far!", 1, window=[0, k - 1], best=best_win, stats={"sum": total, "best": best}))
    for r in range(k, n):
        l = r - k + 1
        out, inc = arr[r - k], arr[r]
        total += inc - out
        steps.append(
            _step(arr, f"Slide! Drop {out}, add {inc} → sum {total}.", 3, window=[l, r], best=best_win, left=l, right=r, stats={"sum": total, "best": best})
        )
        if total > best:
            best, best_win = total, [l, r]
            steps.append(_step(arr, f"{total} beats the record! New best window!", 4, window=[l, r], best=best_win, stats={"sum": total, "best": best}))
    steps.append(
        _step(arr, f"MISSION COMPLETE! The best size-{k} window sums to {best}. Only {n} additions instead of {n * k}!", 5, best=best_win, stats={"best": best}, done=True, stamp="MISSION COMPLETE!")
    )
    return steps


def sliding_window_variable(arr: list[int], target: int) -> list[dict]:
    n = len(arr)
    steps = [_step(arr, f"Shrinking Window! Find the shortest stretch whose sum reaches {target}. Grow on the right, shrink from the left!", 0)]
    left = total = 0
    best_len, best_win = None, None
    steps.append(_step(arr, "Start with an empty window.", 1, left=0, stats={"sum": 0, "target": target}))
    for right in range(n):
        total += arr[right]
        steps.append(
            _step(arr, f"Grow: add {arr[right]} → sum {total}.", 3, window=[left, right], best=best_win, left=left, right=right, stats={"sum": total, "target": target, "shortest": best_len or "—"})
        )
        while total >= target and left <= right:
            length = right - left + 1
            if best_len is None or length < best_len:
                best_len, best_win = length, [left, right]
                steps.append(
                    _step(arr, f"Sum {total} ≥ {target}! A window of length {length}, the shortest yet!", 5, window=[left, right], best=best_win, left=left, right=right, stats={"sum": total, "target": target, "shortest": best_len})
                )
            total -= arr[left]
            left += 1
            win = [left, right] if left <= right else None
            steps.append(
                _step(arr, f"Shrink: drop {arr[left - 1]} from the left → sum {total}.", 6, window=win, best=best_win, left=left if left < n else None, right=right, stats={"sum": total, "target": target, "shortest": best_len})
            )
    if best_win is None:
        steps.append(_step(arr, f"Nani?! Even the whole array can't reach {target}.", 7, stats={"target": target}, done=True, missing=True))
    else:
        steps.append(
            _step(arr, f"FOUND IT! The shortest window with sum ≥ {target} has length {best_len}.", 7, best=best_win, stats={"target": target, "shortest": best_len}, done=True, stamp="FOUND IT!")
        )
    return steps


def two_pointers(arr: list[int], target: int) -> list[dict]:
    arr = sorted(arr)
    n = len(arr)
    steps = [_step(arr, f"Two Pointers! The array is sorted, so I'll squeeze in from both ends to find a pair that sums to {target}!", 0)]
    left, right = 0, n - 1
    steps.append(_step(arr, "Left pointer at the start, right pointer at the end.", 1, left=left, right=right, stats={"target": target}))
    while left < right:
        s = arr[left] + arr[right]
        steps.append(_step(arr, f"{arr[left]} + {arr[right]} = {s}.", 3, left=left, right=right, compare=[left, right], stats={"sum": s, "target": target}))
        if s == target:
            steps.append(
                _step(arr, f"FOUND IT! {arr[left]} + {arr[right]} = {target}!", 4, left=left, right=right, found=[left, right], stats={"sum": s, "target": target}, done=True, stamp="FOUND IT!")
            )
            return steps
        if s < target:
            left += 1
            steps.append(_step(arr, f"{s} is too small, so move the left pointer right!", 5, left=left, right=right, stats={"sum": s, "target": target}))
        else:
            right -= 1
            steps.append(_step(arr, f"{s} is too big, so move the right pointer left!", 6, left=left, right=right, stats={"sum": s, "target": target}))
    steps.append(_step(arr, f"Nani?! The pointers met. No pair adds up to {target}.", 7, stats={"target": target}, done=True, missing=True))
    return steps


def kadane(arr: list[int]) -> list[dict]:
    n = len(arr)
    steps = [_step(arr, "Kadane's Algorithm! Find the stretch with the biggest sum, even with negative numbers in the way!", 0)]
    cur = best = arr[0]
    start = 0
    best_win = [0, 0]
    steps.append(_step(arr, f"Start with just {arr[0]}. Current run = best = {arr[0]}.", 1, window=[0, 0], best=best_win, right=0, stats={"current": cur, "best": best}))
    for i in range(1, n):
        v = arr[i]
        if cur + v < v:
            steps.append(
                _step(arr, f"The run so far ({cur}) only drags {v} down. Drop it and start fresh at {v}!", 3, window=[i, i], best=best_win, right=i, stats={"current": v, "best": best})
            )
            cur, start = v, i
        else:
            cur += v
            mood = "Even with a negative, the run is still worth keeping!" if v < 0 else "Extend the run!"
            steps.append(_step(arr, f"Add {v} → current run {cur}. {mood}", 4, window=[start, i], best=best_win, right=i, stats={"current": cur, "best": best}))
        if cur > best:
            best, best_win = cur, [start, i]
            steps.append(_step(arr, f"{cur} is a new record! Best stretch is now [{start}..{i}].", 5, window=[start, i], best=best_win, right=i, stats={"current": cur, "best": best}))
    steps.append(
        _step(arr, f"MISSION COMPLETE! The maximum subarray sum is {best}, from index {best_win[0]} to {best_win[1]}.", 6, best=best_win, stats={"best": best}, done=True, stamp="MISSION COMPLETE!")
    )
    return steps
