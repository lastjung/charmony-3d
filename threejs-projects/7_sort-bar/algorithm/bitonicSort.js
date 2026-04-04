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
    if (originalLength <= 1) return;

    const paddedLength = nextPowerOfTwo(originalLength);
    const working = array.slice();

    for (let i = originalLength; i < paddedLength; i++) {
      working.push(Infinity);
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
          const leftInBounds = i < originalLength;
          const rightIndex = i + k;
          const rightInBounds = rightIndex < originalLength;

          if (leftInBounds && rightInBounds) {
            yield { type: 'compare', indices: [i, rightIndex] };
          }

          if ((dir && arr[i] > arr[rightIndex]) || (!dir && arr[i] < arr[rightIndex])) {
            [arr[i], arr[rightIndex]] = [arr[rightIndex], arr[i]];
            if (leftInBounds && rightInBounds) {
              yield { type: 'swap', indices: [i, rightIndex] };
            }
          }
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
        yield* bitonicMerge(arr, low, k, dir);
        yield* bitonicMerge(arr, low + k, k, dir);
      }
    }

    yield* bitonicSortRecursive(working, 0, paddedLength, true);

    for (let i = 0; i < originalLength; i++) {
      if (array[i] !== working[i]) {
        array[i] = working[i];
        yield { type: 'write', index: i };
      }
    }
  }
};
