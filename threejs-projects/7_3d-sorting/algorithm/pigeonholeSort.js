/**
 * Pigeonhole Sort algorithm module.
 * Exports metadata and async generator.
 * Assumes non-negative integer values.
 */

export const pigeonholeSort = {
  name: 'Pigeonhole Sort',
  description: 'Pigeonhole Sort distributes elements into holes and collects them in order.',
  isSlow: false,
  nonNegativeOnly: true,
  supportsEmpty: false,
  async *generator(array) {
    const min = Math.min(...array);
    const max = Math.max(...array);
    const size = max - min + 1;
    const holes = Array.from({ length: size }, () => []);

    for (let i = 0; i < array.length; i++) {
      holes[array[i] - min].push(array[i]);
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    let idx = 0;
    for (let i = 0; i < size; i++) {
      for (const val of holes[i]) {
        yield { type: 'compare', indices: [idx, idx] };
        array[idx] = val;
        yield { type: 'swap', indices: [idx, idx] };
        idx++;
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
  }
};