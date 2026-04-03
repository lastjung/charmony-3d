/**
 * Bucket Sort algorithm module.
 * Exports metadata and async generator.
 * Normalizes the current input range before distributing values into buckets.
 */

export const bucketSort = {
  name: 'Bucket Sort',
  description: 'Bucket Sort distributes elements into buckets, sorts each, then concatenates.',
  isSlow: false,
  nonNegativeOnly: true,
  supportsEmpty: false,
  async *generator(array) {
    const n = array.length;
    const buckets = Array.from({ length: n }, () => []);
    const min = Math.min(...array);
    const max = Math.max(...array);
    const range = Math.max(1, max - min + 1);

    for (let i = 0; i < n; i++) {
      const normalizedValue = (array[i] - min) / range;
      const idx = Math.min(Math.floor(normalizedValue * n), n - 1);
      buckets[idx].push(array[i]);
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    let idx = 0;
    for (const bucket of buckets) {
      bucket.sort((a, b) => a - b);
      for (const val of bucket) {
        yield { type: 'compare', indices: [idx, idx] };
        array[idx] = val;
        yield { type: 'swap', indices: [idx, idx] };
        idx++;
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
  }
};
