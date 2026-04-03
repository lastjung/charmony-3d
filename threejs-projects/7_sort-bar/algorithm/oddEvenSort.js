/**
 * Odd-Even Sort (Brick Sort) algorithm module.
 * Exports metadata and async generator.
 */

export const oddEvenSort = {
  name: 'Odd-Even Sort',
  description: 'Odd-Even Sort repeatedly compares odd and even indexed pairs to sort the array.',
  isSlow: true,
  nonNegativeOnly: false,
  supportsEmpty: true,
  async *generator(array) {
    const n = array.length;
    let sorted = false;

    while (!sorted) {
      sorted = true;

      for (let i = 1; i < n - 1; i += 2) {
        yield { type: 'compare', indices: [i, i + 1] };
        if (array[i] > array[i + 1]) {
          [array[i], array[i + 1]] = [array[i + 1], array[i]];
          yield { type: 'swap', indices: [i, i + 1] };
          sorted = false;
        }
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      for (let i = 0; i < n - 1; i += 2) {
        yield { type: 'compare', indices: [i, i + 1] };
        if (array[i] > array[i + 1]) {
          [array[i], array[i + 1]] = [array[i + 1], array[i]];
          yield { type: 'swap', indices: [i, i + 1] };
          sorted = false;
        }
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
  }
};