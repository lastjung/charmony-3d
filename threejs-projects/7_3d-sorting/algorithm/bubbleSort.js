/**
 * Bubble Sort algorithm module.
 * Exports metadata and async generator.
 */

export const bubbleSort = {
  name: 'Bubble Sort',
  description: 'Bubble Sort repeatedly steps through the list, compares adjacent elements and swaps them if they are in the wrong order.',
  isSlow: true,
  nonNegativeOnly: false,
  supportsEmpty: true,
  async *generator(array) {
    const n = array.length;
    let swapped;
    do {
      swapped = false;
      for (let i = 0; i < n - 1; i++) {
        yield { type: 'compare', indices: [i, i + 1] };
        if (array[i] > array[i + 1]) {
          [array[i], array[i + 1]] = [array[i + 1], array[i]];
          swapped = true;
          yield { type: 'swap', indices: [i, i + 1] };
        }
        // Yield control to avoid blocking UI
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    } while (swapped);
  }
};