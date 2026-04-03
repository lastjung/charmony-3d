/**
 * Stooge Sort algorithm module.
 * Highly inefficient recursive sorting algorithm.
 */

export const stoogeSort = {
  name: 'Stooge Sort',
  description: 'A highly inefficient recursive sorting algorithm that recursively sorts overlapping parts of the array.',
  isSlow: true,
  nonNegativeOnly: false,
  supportsEmpty: true,
  isStable: true,
  isInPlace: true,
  isComparisonSort: true,
  timeComplexity: 'O(n^2.7095)',
  spaceComplexity: 'O(log n)',

  async *generator(array, i = 0, j = array.length - 1) {
    if (i >= j) return;

    yield { type: 'compare', indices: [i, j] };
    if (array[i] > array[j]) {
      [array[i], array[j]] = [array[j], array[i]];
      yield { type: 'swap', indices: [i, j] };
    }

    if (j - i + 1 > 2) {
      const t = Math.floor((j - i + 1) / 3);
      yield* stoogeSort.generator(array, i, j - t);
      yield* stoogeSort.generator(array, i + t, j);
      yield* stoogeSort.generator(array, i, j - t);
    }

    await new Promise(resolve => setTimeout(resolve, 0));
  }
};