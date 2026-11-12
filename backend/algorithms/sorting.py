"""Sorting algorithms that record every step for the visualizer.

Each step is a full snapshot so the frontend can scrub backwards and forwards
without replaying anything:

    {
        "array":   [..current values..],
        "sorted":  [indices locked in their final place],
        "compare": [i, j]   (optional) indices being compared
        "swap":    [i, j]   (optional) indices just swapped
        "set":     [k]      (optional) index just overwritten (merge sort)
        "pivot":   p        (optional) pivot index (quick sort)
        "range":   [lo, hi] (optional) active sub-array
        "line":    n        index into the pseudocode lines
        "say":     "..."    narration for the mascot
        "done":    true     (final step only)
    }
"""

from __future__ import annotations

MAX_STEPS = 6000


class Tracer:
    def __init__(self, arr: list[int]):
        self.a = list(arr)
        self.steps: list[dict] = []
        self.sorted: set[int] = set()

    def snap(self, say: str, line: int | None = None, **highlights) -> None:
        if len(self.steps) >= MAX_STEPS:
            return
        step = {"array": list(self.a), "sorted": sorted(self.sorted), "line": line, "say": say}
        step.update({k: v for k, v in highlights.items() if v is not None})
        self.steps.append(step)

    def finish(self, name: str) -> list[dict]:
        self.sorted = set(range(len(self.a)))
        self.snap(f"MISSION COMPLETE! {name} wins the day!", done=True)
        return self.steps


def bubble_sort(arr: list[int]) -> list[dict]:
    t = Tracer(arr)
    a, n = t.a, len(t.a)
    t.snap("Bubble Sort, activate! The biggest values float to the top!", line=0)
    for i in range(n):
        swapped = False
        t.snap(f"Pass {i + 1}! Here we go!", line=1)
        for j in range(n - 1 - i):
            t.snap(f"Comparing {a[j]} and {a[j + 1]}...", line=2, compare=[j, j + 1])
            if a[j] > a[j + 1]:
                a[j], a[j + 1] = a[j + 1], a[j]
                swapped = True
                t.snap(f"{a[j + 1]} is bigger than {a[j]}! Swap!", line=3, swap=[j, j + 1])
        t.sorted.add(n - 1 - i)
        t.snap(f"{a[n - 1 - i]} is locked in place!", line=4)
        if not swapped:
            t.snap("No swaps this pass... that means it's already sorted!", line=5)
            break
    return t.finish("Bubble Sort")


def selection_sort(arr: list[int]) -> list[dict]:
    t = Tracer(arr)
    a, n = t.a, len(t.a)
    t.snap("Selection Sort! I'll find the smallest and put it first!", line=0)
    for i in range(n):
        m = i
        t.snap(f"Position {i}: assume {a[i]} is the smallest for now.", line=2, compare=[i, i])
        for j in range(i + 1, n):
            t.snap(f"Is {a[j]} smaller than {a[m]}?", line=3, compare=[m, j])
            if a[j] < a[m]:
                m = j
                t.snap(f"Yes! {a[m]} is the new smallest!", line=4, compare=[m, m])
        if m != i:
            a[i], a[m] = a[m], a[i]
            t.snap(f"Swap {a[i]} into position {i}!", line=5, swap=[i, m])
        t.sorted.add(i)
        t.snap(f"{a[i]} is in its final place.", line=5)
    return t.finish("Selection Sort")


def insertion_sort(arr: list[int]) -> list[dict]:
    t = Tracer(arr)
    a, n = t.a, len(t.a)
    t.snap("Insertion Sort! Like sorting a hand of cards!", line=0)
    t.sorted = {0}
    for i in range(1, n):
        j = i
        t.snap(f"Picking up {a[i]}. Where does it belong?", line=2, compare=[i, i])
        while j > 0:
            t.snap(f"Is {a[j - 1]} bigger than {a[j]}?", line=3, compare=[j - 1, j])
            if a[j - 1] <= a[j]:
                break
            a[j - 1], a[j] = a[j], a[j - 1]
            t.snap(f"Yes! Slide {a[j - 1]} to the left!", line=4, swap=[j - 1, j])
            j -= 1
        t.sorted = set(range(i + 1))
        t.snap(f"The first {i + 1} cards are in order.", line=1)
    return t.finish("Insertion Sort")


def merge_sort(arr: list[int]) -> list[dict]:
    t = Tracer(arr)
    a = t.a
    t.snap("Merge Sort! Divide and conquer!", line=0)

    def sort(lo: int, hi: int) -> None:
        if hi - lo < 1:
            return
        mid = (lo + hi) // 2
        t.snap(f"Split [{lo}..{hi}] into [{lo}..{mid}] and [{mid + 1}..{hi}]!", line=2, range=[lo, hi])
        sort(lo, mid)
        sort(mid + 1, hi)
        left, right = a[lo:mid + 1], a[mid + 1:hi + 1]
        t.snap(f"Now merge [{lo}..{mid}] with [{mid + 1}..{hi}]!", line=4, range=[lo, hi])
        i = j = 0
        k = lo
        while i < len(left) and j < len(right):
            if left[i] <= right[j]:
                a[k] = left[i]
                t.snap(f"{left[i]} ≤ {right[j]}, so {left[i]} goes first.", line=5, set=[k], range=[lo, hi])
                i += 1
            else:
                a[k] = right[j]
                t.snap(f"{right[j]} < {left[i]}, so {right[j]} goes first.", line=5, set=[k], range=[lo, hi])
                j += 1
            k += 1
        while i < len(left):
            a[k] = left[i]
            t.snap(f"Copy the leftover {left[i]}.", line=6, set=[k], range=[lo, hi])
            i += 1
            k += 1
        while j < len(right):
            a[k] = right[j]
            t.snap(f"Copy the leftover {right[j]}.", line=6, set=[k], range=[lo, hi])
            j += 1
            k += 1

    sort(0, len(a) - 1)
    return t.finish("Merge Sort")


def quick_sort(arr: list[int]) -> list[dict]:
    t = Tracer(arr)
    a = t.a
    t.snap("Quick Sort! Pick a pivot and split the world in two!", line=0)

    def sort(lo: int, hi: int) -> None:
        if lo > hi:
            return
        if lo == hi:
            t.sorted.add(lo)
            t.snap(f"Just {a[lo]} alone here. It's already home.", line=1, range=[lo, hi])
            return
        pivot = a[hi]
        i = lo
        t.snap(f"Pivot is {pivot}! Smaller values go left!", line=2, pivot=hi, range=[lo, hi])
        for j in range(lo, hi):
            t.snap(f"Is {a[j]} smaller than {pivot}?", line=3, compare=[j, hi], pivot=hi, range=[lo, hi])
            if a[j] < pivot:
                if i != j:
                    a[i], a[j] = a[j], a[i]
                    t.snap(f"Yes! Swap {a[i]} to the left side.", line=4, swap=[i, j], pivot=hi, range=[lo, hi])
                i += 1
        a[i], a[hi] = a[hi], a[i]
        t.sorted.add(i)
        t.snap(f"Pivot {a[i]} lands in its true position!", line=5, swap=[i, hi], range=[lo, hi])
        sort(lo, i - 1)
        sort(i + 1, hi)

    sort(0, len(a) - 1)
    return t.finish("Quick Sort")


def heap_sort(arr: list[int]) -> list[dict]:
    t = Tracer(arr)
    a, n = t.a, len(t.a)
    t.snap("Heap Sort! First, I'll build a max-heap!", line=0)

    def sift_down(root: int, end: int) -> None:
        while True:
            child = 2 * root + 1
            if child >= end:
                return
            if child + 1 < end:
                t.snap(f"Which child is bigger: {a[child]} or {a[child + 1]}?", line=6, compare=[child, child + 1], range=[0, end - 1])
                if a[child + 1] > a[child]:
                    child += 1
            t.snap(f"Compare parent {a[root]} with child {a[child]}.", line=6, compare=[root, child], range=[0, end - 1])
            if a[child] <= a[root]:
                return
            a[root], a[child] = a[child], a[root]
            t.snap(f"Child is bigger! Swap {a[root]} up!", line=6, swap=[root, child], range=[0, end - 1])
            root = child

    for start in range(n // 2 - 1, -1, -1):
        sift_down(start, n)
    t.snap("The max-heap is ready! The biggest value is on top.", line=1)
    for end in range(n - 1, 0, -1):
        a[0], a[end] = a[end], a[0]
        t.sorted.add(end)
        t.snap(f"Send the champion {a[end]} to the back!", line=3, swap=[0, end])
        sift_down(0, end)
    return t.finish("Heap Sort")
