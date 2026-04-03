# Implementation Guide

This guide provides a step-by-step approach to building the 3D Sorting Algorithm Visualizer incrementally.

---

## Milestone 1: Basic 3D Scene

- Set up a Three.js scene with a camera and lighting
- Add a simple grid of colored bars representing an array
- Implement camera controls (OrbitControls)
- Ensure the scene is responsive to window resizing
- The colored bars should fill the entire browser viewport optimally, fully utilizing the available space without overflowing outside the viewport
- **Hint:** Carefully tune the camera distance relative to the calculated fit distance. Bringing the camera slightly closer than the exact fit (e.g., multiply by 0.8 instead of 1.2) helps the bars fill the viewport more fully, especially on wide screens.

---

## Milestone 2: Array Initialization and Shuffling

- Initialize an array with linearly distributed values (e.g., 1 to 100)
- Assign each bar a fixed rainbow gradient color based on its value
- Shuffle the array to create an unsorted state
- Verify the rainbow appears scrambled after shuffling

---

## Milestone 3: Sorting Algorithm Generators

- Implement Bubble Sort as an **async generator** yielding steps
- Highlight compared bars using indicator dots positioned just below the bars. Ensure indicator dots are clearly visible and complement color cues. Test across all sorting algorithms for consistent highlighting behavior.

---

## Milestone 4: UI Controls

- Add Start/Pause button
- Add Step button (advance one step when paused)
- Add algorithm selector dropdown and adjustable speed slider.
- On initialization, explicitly read the dropdown and slider values and assign them to the internal state variables (e.g., `currentAlgorithm`, `speed`) to ensure UI and logic are synchronized, especially after page refreshes.
- Set up event listeners on these controls to update the internal state dynamically when the user changes selections.
- Connect the internal state variables to the sorting logic so that the selected algorithm and speed are always consistent with the UI.
- Modularize into UI, controller, algorithms, entry point modules
- Use a guard (e.g., `sortLoopPromise`) to prevent overlapping async sorting loops
- Display a short description of the selected algorithm's working principle in the UI

### Hints

- Use an async guard (e.g., a promise variable) to prevent multiple overlapping sorting loops.
- Implement pause and step by checking flags inside the async generator loop and waiting with small delays.
- Update the sorting speed dynamically by reading the slider value inside the loop and applying a delay accordingly.
- Carefully design the UI layout with flexbox or grid to keep controls aligned and user-friendly, even with multiple elements.
- Modularize control logic separately from visualization and algorithms to simplify event handling and future extensions.

### UI Stability Guidelines

- Assign **fixed widths** to all control buttons (e.g., Start/Pause/Resume, Step) to prevent resizing when their labels change.
- Set the **algorithm dropdown** to a fixed width wide enough to fit all algorithm names without truncation.
- Constrain the **algorithm description** area with a fixed width and fixed height, enabling vertical scrolling if content overflows, to prevent the control panel from resizing vertically or horizontally.
- Display a simple status indicator (e.g., "Sorting", "Paused") with a fixed width to avoid layout shifts. This basic indicator will be replaced by a detailed FSM state display (showing states like "IDLE", "SORTING", "PAUSED", etc.) when the FSM is implemented in Milestone 7.
- Assign fixed widths to other dynamic elements like the **countdown display** and **speed slider**.
- Avoid setting a fixed width on the entire control panel container; instead, fix the size of individual UI elements to maintain responsiveness and prevent layout shifts.
- Design all UI elements to **avoid causing layout shifts** during dynamic content changes, ensuring a stable and user-friendly interface.

---

## Milestone 5: Centralize Algorithm Collection with Decentralized Metadata

- **Refactor all sorting algorithm modules** (e.g., `bubbleSort.js`, `quickSort.js`) to **export an object** containing:
  - The async generator function
  - Metadata such as:
    - `name`: Human-readable algorithm name
    - `description`: Brief explanation of the algorithm
    - (Optional) `complexity`: Time/space complexity info

- **Example export from an algorithm module:**

```js
export const bubbleSort = {
  name: 'Bubble Sort',
  description: 'Bubble Sort repeatedly steps through the list, compares adjacent elements and swaps them if they are in the wrong order.',
  generator: async function* (array) {
    // sorting logic here
  }
};
```

- **Create a central registry module** (e.g., `algorithm/index.js`) that:
  - **Imports all algorithm modules**
  - **Exports a single object or array** containing all algorithm exports
  - **Does NOT add or duplicate metadata**; it simply collects the modules

- **Refactor the controller** to:
  - Import the central registry
  - Dynamically populate dropdown options using the `name` metadata
  - Display descriptions using the `description` metadata
  - Call the generator function via `algorithm.generator(array)`

- **Add 2-3 additional sorting algorithms** (Insertion Sort, Quicksort, Selection Sort) following this export pattern
- **Ensure all algorithms yield consistent compare/swap steps**
- **Perfect the cancellation and switching logic** using the centralized collection
- **Prepare for future unit testing** by enabling easy iteration over all algorithms via the registry

### Hints

- **Implement all algorithms as async generators** that yield consistent `{ type: 'compare' | 'swap', indices: [i, j] }` steps.
- **Design algorithms to be stateless**: they should only depend on the input array and not maintain internal state.
- **Switching algorithms mid-sort** requires:
  - Canceling the current async generator cleanly (e.g., with a cancellation flag).
  - Immediately starting a new generator with the current partially sorted array.
  - Avoiding array resets or shuffling during the switch.
- **Manage async control flow carefully**:
  - Use a cancellation flag checked inside the sort loop to exit gracefully.
  - After cancellation, start the new algorithm's generator on the same array.
  - Prevent overlapping sort loops with a guard promise.
- **Maintain UI consistency**:
  - Reset highlights when switching.
  - Avoid flickering or inconsistent states.
- **Keep the user experience intuitive**: switching should feel instant and not require manual pause/resume.

### Architecture Diagram

```mermaid
flowchart TD
    subgraph Algorithm Modules
        A1[bubbleSort.js<br/>exports {name, description, generator}]
        A2[quickSort.js<br/>exports {name, description, generator}]
        A3[insertionSort.js<br/>exports {name, description, generator}]
    end

    subgraph Registry
        R[algorithm/index.js<br/>collects & re-exports]
    end

    subgraph Controller
        C[controller.js<br/>imports registry,<br/>uses metadata + generator]
    end

    A1 --> R
    A2 --> R
    A3 --> R
    R --> C
```

---

## Milestone 6: Implement Unit Tests for Sorting Algorithms

- Develop a comprehensive suite of **unit tests** for all sorting algorithms.
- **Add metadata flags** to each algorithm module to describe its properties:
  - `isSlow`: whether the algorithm is slow on large inputs (e.g., quadratic time)
  - `nonNegativeOnly`: whether the algorithm only supports non-negative inputs
  - `supportsEmpty`: whether the algorithm supports empty arrays
- The **test suite dynamically reads these metadata flags** to:
  - Skip large array tests for slow algorithms
  - Skip negative number tests for algorithms that don't support negatives
  - Skip empty array tests for algorithms that don't support empty inputs
- This makes the test suite **universal and self-configuring**, without hardcoded algorithm lists.
- Tests should:
  - **Run each async generator to completion** on various input arrays.
  - **Verify the array is sorted in ascending order** after sorting completes.
  - **Check that the sorted array contains the same elements** as the original (no loss or duplication).
  - **Count the number of iterations (yields)** during sorting.
  - **Assert that the number of iterations does not exceed a maximum threshold** based on the algorithm and input size.
- Include test cases for:
  - Empty arrays (skipped if unsupported)
  - Single-element arrays
  - Already sorted arrays
  - Reverse sorted arrays
  - Arrays with duplicates
  - Arrays with negative numbers (skipped if unsupported)
  - Large random arrays (skipped for slow algorithms)
- Use **Jest** as the JavaScript testing framework, which supports async tests and is easy to set up.
- Define **maximum iteration limits** conservatively based on the expected worst-case complexity of each algorithm (e.g., Bubble Sort worst case ≈ n²).
- Automate these tests to run on every code change to catch regressions early.
- **All tests should pass** when algorithms respect their domain constraints.

---

## Milestone 7: Add Remaining Algorithms

- Implement the remaining sorting algorithms as async generators:
  - Merge Sort
  - Heap Sort
  - Shell Sort
  - Cocktail Shaker Sort
  - Counting Sort
  - Comb Sort
  - Gnome Sort
  - Odd-Even Sort
  - Cycle Sort
  - Pigeonhole Sort
  - Bucket Sort
  - Radix Sort
  - Pancake Sort
- Follow the same async generator pattern yielding consistent compare/swap steps
- Integrate all into the dropdown with dynamic switching
- Test switching algorithms at various sort stages

---

## Milestone 8: Automatic Cycling and FSM-Based Control Enhancements

- **Refactor the control logic using an explicit Finite State Machine (FSM)** to manage all UI and sorting states clearly.
- Define explicit states such as:
  - `IDLE`: waiting for user or auto start
  - `SORTING`: sorting in progress
  - `PAUSED`: sorting paused by user
  - `COUNTDOWN`: countdown before next auto cycle
  - `CANCELING`: gracefully stopping current sort before switching
- Implement a **centralized state transition function** to handle all changes between these states, ensuring clean and predictable behavior.
- Start sorting automatically on application load by transitioning from `IDLE` to `SORTING`.
- After each sort completes, transition to `COUNTDOWN`, display a countdown timer, reshuffle the array, then transition back to `SORTING` with the next algorithm.
- When the user manually changes the algorithm during sorting, paused, or countdown states:
  - Transition to `CANCELING`, set a cancellation flag, and wait for the current sort to stop.
  - Then immediately start the new algorithm on the **partially sorted** array by transitioning back to `SORTING`.
- Prevent overlapping sorts by guarding async loops with promises and state checks.
- Use the FSM to control UI updates, button states, and event handling, reducing bugs from conflicting flags.
- **Display the current FSM state visibly in the UI** to help users understand what the app is doing and assist with debugging.
- Refine responsiveness and polish UI, including dark theme styling.
- This FSM approach will make the control flow more robust, maintainable, and easier to extend.
- Polish UI and add dark theme styling


## Tips

- Keep sorting algorithms **stateless**: rely only on input data and yield steps
- Modularize code: separate UI, visualization, sorting control, and algorithms
- Test each milestone thoroughly before moving on
- Use console logs and breakpoints to debug issues incrementally

---

Following this plan will help you build the project step by step, reducing bugs and confusion.

---
## Milestone 9: Add all the algorithms!

- **Goal:** Greatly expand the visualizer's algorithm library with a wide variety of terminating sorting algorithms, beyond the core set.
- **Scope:** Add at least 10-15 new algorithms, including hybrids, parallelizable sorts, educational inefficient sorts, and exotic algorithms.

### Candidate Algorithms

- TimSort
- IntroSort
- Bitonic Sort
- Strand Sort
- SmoothSort
- Tree Sort
- Stooge Sort
- Slow Sort
- Gravity (Bead) Sort
- Binary Insertion Sort
- Library Sort
- Cartesian Tree Sort
- Pairwise Sorting Network

### Implementation Guidelines

**Note:** Avoid including unstable, unreliable, or joke algorithms that do not consistently sort data correctly. Only algorithms that terminate and produce correct sorted output should be part of the visualizer.

- **Each algorithm must export an object** with:
  - `name`: Human-readable name
  - `description`: Brief explanation
  - `isSlow`: true/false (for test skipping and UI hints)
  - `nonNegativeOnly`: true/false (for test skipping)
  - `supportsEmpty`: true/false (for test skipping)
  - **Additional metadata for testing and UI (recommended):**
    - `isStable`: true/false
    - `isInPlace`: true/false
    - `isComparisonSort`: true/false
    - `timeComplexity`: e.g., "O(n log n)"
    - `spaceComplexity`: e.g., "O(1)"
- **Implement as async generators** yielding `{ type: 'compare' | 'swap', indices: [i, j] }`.
- **Register all new algorithms** in `algorithm/index.js`.
- **Update `docs/Algorithms.md`** with new entries and descriptions.

### Testing

- The existing **universal test suite** (see Milestone 6) will automatically pick up new algorithms.
- Ensure metadata is accurate to enable correct test skipping and validation.
- Run tests on all new algorithms to verify correctness and integration.

### Optional Enhancements

- Categorize algorithms (comparison-based, non-comparison, hybrid, educational).
- Add UI filters based on metadata (e.g., show only stable sorts).
- Add complexity info to UI tooltips or documentation.

---


