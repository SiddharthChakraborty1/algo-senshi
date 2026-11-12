"""Search algorithms. Steps carry the array plus search highlights:

    {"array", "checked": [...], "current": i, "low": lo, "high": hi,
     "found": i, "line", "say", "done"}
"""

from __future__ import annotations


def _step(arr, say, line, **kw):
    s = {"array": list(arr), "line": line, "say": say}
    s.update({k: v for k, v in kw.items() if v is not None})
    return s


def linear_search(arr: list[int], target: int) -> list[dict]:
    steps = [_step(arr, f"Linear Search! I'll check every single one for {target}!", 0)]
    checked: list[int] = []
    for i, v in enumerate(arr):
        steps.append(_step(arr, f"Is {v} the {target} we're looking for?", 2, current=i, checked=list(checked)))
        if v == target:
            steps.append(_step(arr, f"FOUND IT! {target} is at index {i}!", 2, found=i, checked=list(checked), done=True))
            return steps
        checked.append(i)
    steps.append(_step(arr, f"Nani?! {target} isn't here at all...", 3, checked=list(checked), done=True, missing=True))
    return steps


def binary_search(arr: list[int], target: int) -> list[dict]:
    arr = sorted(arr)
    steps = [_step(arr, f"Binary Search! The array is sorted, so I can cut it in half each time to find {target}!", 0)]
    lo, hi = 0, len(arr) - 1
    checked: list[int] = []
    steps.append(_step(arr, "Search the whole array first.", 1, low=lo, high=hi))
    while lo <= hi:
        mid = (lo + hi) // 2
        steps.append(_step(arr, f"The middle is index {mid}, value {arr[mid]}.", 3, low=lo, high=hi, current=mid, checked=list(checked)))
        if arr[mid] == target:
            steps.append(_step(arr, f"FOUND IT! {target} is at index {mid}!", 4, low=lo, high=hi, found=mid, checked=list(checked), done=True))
            return steps
        checked.append(mid)
        if arr[mid] < target:
            checked.extend(range(lo, mid))
            lo = mid + 1
            steps.append(_step(arr, f"{arr[mid]} < {target}, so throw away the left half!", 5, low=lo, high=hi, checked=list(checked)))
        else:
            checked.extend(range(mid + 1, hi + 1))
            hi = mid - 1
            steps.append(_step(arr, f"{arr[mid]} > {target}, so throw away the right half!", 6, low=lo, high=hi, checked=list(checked)))
    steps.append(_step(arr, f"Nani?! Nothing left to search. {target} isn't here.", 7, checked=list(checked), done=True, missing=True))
    return steps
