/**
 * Counting Sort algorithm module.
 * Exports metadata and async generator.
 * Assumes non-negative integer values.
 */

export const countingSort = {
  name: 'Counting Sort',
  description: 'Counting Sort counts occurrences of each value and reconstructs the sorted array.',
  isSlow: false,
  nonNegativeOnly: true,
  supportsEmpty: false,
  async *generator(array) {
    const max = Math.max(...array);
    const count = new Array(max + 1).fill(0);

    for (let i = 0; i < array.length; i++) {
      count[array[i]]++;
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    let idx = 0;
    for (let i = 0; i <= max; i++) {
      while (count[i]-- > 0) {
        yield { type: 'compare', indices: [idx, idx] };
        array[idx] = i;
        yield { type: 'swap', indices: [idx, idx] };
        idx++;
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
  }
};