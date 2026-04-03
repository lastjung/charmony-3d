/**
 * Slow Sort algorithm module.
 * A deliberately inefficient recursive sorting algorithm.
 */

export const slowSort = {
  name: 'Slow Sort',
  description: 'A deliberately inefficient recursive sorting algorithm inspired by Stooge Sort and Heap Sort.',
  isSlow: true,
  nonNegativeOnly: false,
  supportsEmpty: true,
  isStable: true,
  isInPlace: true,
  isComparisonSort: true,
  timeComplexity: 'O(n^(log n))',
  spaceComplexity: 'O(log n)',

  async *generator(array, i = 0, j = array.length - 1) {
    if (i >= j) return;

    const m = Math.floor((i + j) / 2);
    yield* slowSort.generator(array, i, m);
    yield* slowSort.generator(array, m + 1, j);

    yield { type: 'compare', indices: [m, j] };
    if (array[m] > array[j]) {
      [array[m], array[j]] = [array[j], array[m]];
      yield { type: 'swap', indices: [m, j] };
    }

    yield* slowSort.generator(array, i, j - 1);

    await new Promise(resolve => setTimeout(resolve, 0));
  }
};