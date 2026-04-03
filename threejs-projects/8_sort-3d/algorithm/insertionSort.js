/**
 * Insertion Sort algorithm module.
 * Exports metadata and async generator.
 */

export const insertionSort = {
  name: 'Insertion Sort',
  description: 'Insertion Sort builds the sorted array one item at a time by comparing and inserting elements into their correct position.',
  isSlow: false,
  nonNegativeOnly: false,
  supportsEmpty: true,
  async *generator(array) {
    const n = array.length;
    for (let i = 1; i < n; i++) {
      let j = i;
      while (j > 0) {
        yield { type: 'compare', indices: [j - 1, j] };
        if (array[j - 1] > array[j]) {
          [array[j - 1], array[j]] = [array[j], array[j - 1]];
          yield { type: 'swap', indices: [j - 1, j] };
        } else {
          break;
        }
        j--;
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
  }
};