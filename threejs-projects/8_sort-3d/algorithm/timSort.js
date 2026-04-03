/**
 * TimSort algorithm module.
 * Hybrid stable sorting algorithm.
 */

export const timSort = {
  name: 'TimSort',
  description: 'A hybrid stable sorting algorithm combining merge sort and insertion sort, used in Python and Java.',
  isSlow: false,
  nonNegativeOnly: false,
  supportsEmpty: true,
  isStable: true,
  isInPlace: false,
  isComparisonSort: true,
  timeComplexity: 'O(n log n)',
  spaceComplexity: 'O(n)',

  async *generator(array) {
    const RUN = 32;

    async function* insertionSort(arr, left, right) {
      for (let i = left + 1; i <= right; i++) {
        let temp = arr[i];
        let j = i - 1;
        while (j >= left && arr[j] > temp) {
          yield { type: 'compare', indices: [j, i] };
          arr[j + 1] = arr[j];
          yield { type: 'swap', indices: [j + 1, j] };
          j--;
          await new Promise(resolve => setTimeout(resolve, 0));
        }
        arr[j + 1] = temp;
      }
    }

    async function* merge(arr, l, m, r) {
      const len1 = m - l + 1;
      const len2 = r - m;
      const left = arr.slice(l, m + 1);
      const right = arr.slice(m + 1, r + 1);

      let i = 0, j = 0, k = l;
      while (i < len1 && j < len2) {
        yield { type: 'compare', indices: [l + i, m + 1 + j] };
        if (left[i] <= right[j]) {
          arr[k++] = left[i++];
        } else {
          arr[k++] = right[j++];
        }
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      while (i < len1) {
        arr[k++] = left[i++];
      }
      while (j < len2) {
        arr[k++] = right[j++];
      }
    }

    const n = array.length;
    for (let i = 0; i < n; i += RUN) {
      yield* insertionSort(array, i, Math.min(i + RUN - 1, n - 1));
    }

    for (let size = RUN; size < n; size = 2 * size) {
      for (let left = 0; left < n; left += 2 * size) {
        const mid = Math.min(left + size - 1, n - 1);
        const right = Math.min(left + 2 * size - 1, n - 1);
        if (mid < right) {
          yield* merge(array, left, mid, right);
        }
      }
    }
  }
};