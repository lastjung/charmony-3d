/**
 * Bitonic Sort algorithm module.
 * Parallelizable sorting network.
 */

export const bitonicSort = {
  name: 'Bitonic Sort',
  description: 'A parallelizable sorting network that recursively builds bitonic sequences and merges them.',
  isSlow: false,
  nonNegativeOnly: false,
  supportsEmpty: true,
  isStable: false,
  isInPlace: true,
  isComparisonSort: true,
  timeComplexity: 'O(log^2 n)',
  spaceComplexity: 'O(1)',

  async *generator(array) {
      function nextPowerOfTwo(n) {
        return 2 ** Math.ceil(Math.log2(n));
      }

      const originalLength = array.length;
      const paddedLength = nextPowerOfTwo(originalLength);

      // Pad with Infinity to make length a power of two
      for (let i = originalLength; i < paddedLength; i++) {
        array.push(Infinity);
      }

      async function* bitonicSortRecursive(arr, low, cnt, dir) {
        if (cnt > 1) {
          const k = Math.floor(cnt / 2);
          yield* bitonicSortRecursive(arr, low, k, true);
          yield* bitonicSortRecursive(arr, low + k, k, false);
          yield* bitonicMerge(arr, low, cnt, dir);
        }
      }

      async function* bitonicMerge(arr, low, cnt, dir) {
        if (cnt > 1) {
          const k = Math.floor(cnt / 2);
          for (let i = low; i < low + k; i++) {
            yield { type: 'compare', indices: [i, i + k] };
            if ((dir && arr[i] > arr[i + k]) || (!dir && arr[i] < arr[i + k])) {
              [arr[i], arr[i + k]] = [arr[i + k], arr[i]];
              yield { type: 'swap', indices: [i, i + k] };
            }
            await new Promise(resolve => setTimeout(resolve, 0));
          }
          yield* bitonicMerge(arr, low, k, dir);
          yield* bitonicMerge(arr, low + k, k, dir);
        }
      }

      yield* bitonicSortRecursive(array, 0, paddedLength, true);

      // Remove padding
      array.length = originalLength;
    }
};