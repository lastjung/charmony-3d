/**
 * Selection Sort algorithm module.
 * Exports metadata and async generator.
 */

export const selectionSort = {
  name: 'Selection Sort',
  description: 'Selection Sort repeatedly selects the minimum element from the unsorted part and moves it to the sorted part.',
  isSlow: true,
  nonNegativeOnly: false,
  supportsEmpty: true,
  async *generator(array) {
    const n = array.length;
    for (let i = 0; i < n - 1; i++) {
      let minIdx = i;
      for (let j = i + 1; j < n; j++) {
        yield { type: 'compare', indices: [minIdx, j] };
        if (array[j] < array[minIdx]) {
          minIdx = j;
        }
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      if (minIdx !== i) {
        [array[i], array[minIdx]] = [array[minIdx], array[i]];
        yield { type: 'swap', indices: [i, minIdx] };
      }
    }
  }
};