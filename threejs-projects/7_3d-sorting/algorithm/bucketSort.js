/**
 * Bucket Sort algorithm module.
 * Exports metadata and async generator.
 * Assumes values in range [0, 1).
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

    for (let i = 0; i < n; i++) {
      const idx = Math.min(Math.floor(array[i] * n), n - 1);
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