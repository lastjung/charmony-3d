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
    let n = array.length;
    for (let i = 0; i < n; i++) {
      let swapped = false;
      // The inner loop range reduces by 'i' each pass as end elements are sorted
      for (let j = 0; j < n - 1 - i; j++) {
        yield { type: 'compare', indices: [j, j + 1] };
        if (array[j] > array[j + 1]) {
          [array[j], array[j + 1]] = [array[j + 1], array[j]];
          swapped = true;
          yield { type: 'swap', indices: [j, j + 1] };
        }
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      if (!swapped) break;
    }
  }
};