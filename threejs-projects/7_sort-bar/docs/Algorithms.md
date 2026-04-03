# Sorting Algorithms

The visualizer supports a wide range of sorting algorithms, each implemented as an **async generator** that yields steps for visualization.

---

## List of Algorithms

- Bubble Sort
- Insertion Sort
- Quicksort
- Selection Sort
- Merge Sort
- Heap Sort
- Shell Sort
- Cocktail Shaker Sort
- Counting Sort
- Comb Sort
- Gnome Sort
- Odd-Even Sort (Brick Sort)
- Cycle Sort
- Pigeonhole Sort
- Bucket Sort
- Radix Sort
- Pancake Sort
- Stooge Sort — Highly inefficient recursive sort
- Slow Sort — Deliberately inefficient recursive sort
- Bitonic Sort — Parallelizable sorting network
- TimSort — Hybrid merge/insertion sort used in Python and Java
- IntroSort — Hybrid quicksort/heapsort to avoid worst-case
- Strand Sort — Extracts increasing subsequences and merges
- Gravity (Bead) Sort — Non-comparison sort simulating gravity

---

## Implementation Guidelines

- **Async Generators:** Each algorithm should be implemented as an asynchronous generator function that yields steps (comparisons, swaps) for visualization.
- **Stateless Design:** Algorithms must be stateless, relying solely on input data and yielding steps without maintaining internal state. This allows seamless switching between algorithms during sorting.
- **Highlighting:** When two bars are compared, highlight them (e.g., in yellow).
- **Fixed Colors:** Bars retain their fixed rainbow gradient color during sorting.

---

## Educational Features

- **Switching Algorithms Mid-Sort:** You can change algorithms during sorting. The new algorithm will continue sorting the current, partially sorted array.
- **Partially Sorted Data:** Switching mid-sort helps compare how different algorithms handle partially sorted data.
- **Reset for Fresh Sort:** To see a pure run, pause and reset the array before starting a new algorithm.

---

## Algorithm Metadata

Each sorting algorithm module exports an object containing:

- `name`: Human-readable algorithm name
- `description`: Brief explanation of the algorithm
- `isSlow`: `true` if the algorithm is slow on large inputs (e.g., quadratic time)
- `nonNegativeOnly`: `true` if the algorithm only supports non-negative inputs
- `supportsEmpty`: `true` if the algorithm supports empty arrays
- (Optional) `complexity`: Time and space complexity information
- `generator`: The async generator function implementing the algorithm

This metadata is used to:

- Dynamically populate the algorithm selector dropdown
- Display algorithm descriptions in the UI
- Adjust test cases (e.g., skip large inputs for slow algorithms)

When adding new algorithms, **always include appropriate metadata**.

---

## Documentation Tips

When implementing algorithms, include clear comments explaining:

- The algorithm's logic
- Key steps and decisions
- Any important considerations or edge cases

Well-documented code improves maintainability and understanding.