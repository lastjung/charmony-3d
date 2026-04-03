/**
 * IntroSort algorithm module.
 * Hybrid quicksort + heapsort.
 */

export const introSort = {
  name: 'IntroSort',
  description: 'A hybrid sorting algorithm that begins with quicksort and switches to heapsort to avoid worst-case performance.',
  isSlow: false,
  nonNegativeOnly: false,
  supportsEmpty: true,
  isStable: false,
  isInPlace: true,
  isComparisonSort: true,
  timeComplexity: 'O(n log n)',
  spaceComplexity: 'O(log n)',

  async *generator(array) {
    const maxDepth = 2 * Math.floor(Math.log2(array.length));

    async function* quickSort(arr, low, high, depthLimit) {
      if (low < high) {
        if (depthLimit === 0) {
          yield* heapSort(arr, low, high);
          return;
        }
        const p = yield* partition(arr, low, high);
        yield* quickSort(arr, low, p - 1, depthLimit - 1);
        yield* quickSort(arr, p + 1, high, depthLimit - 1);
      }
    }

    async function* partition(arr, low, high) {
      const pivot = arr[high];
      let i = low;
      for (let j = low; j < high; j++) {
        yield { type: 'compare', indices: [j, high] };
        if (arr[j] < pivot) {
          [arr[i], arr[j]] = [arr[j], arr[i]];
          yield { type: 'swap', indices: [i, j] };
          i++;
        }
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      [arr[i], arr[high]] = [arr[high], arr[i]];
      yield { type: 'swap', indices: [i, high] };
      return i;
    }

    async function* heapSort(arr, start, end) {
      const n = end - start + 1;

      async function* heapify(n, i) {
        let largest = i;
        const l = 2 * i + 1;
        const r = 2 * i + 2;

        if (l < n && arr[start + l] > arr[start + largest]) largest = l;
        if (r < n && arr[start + r] > arr[start + largest]) largest = r;

        if (largest !== i) {
          [arr[start + i], arr[start + largest]] = [arr[start + largest], arr[start + i]];
          yield { type: 'swap', indices: [start + i, start + largest] };
          yield* heapify(n, largest);
        }
      }

      for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
        yield* heapify(n, i);
      }

      for (let i = n - 1; i > 0; i--) {
        [arr[start], arr[start + i]] = [arr[start + i], arr[start]];
        yield { type: 'swap', indices: [start, start + i] };
        yield* heapify(i, 0);
      }
    }

    yield* quickSort(array, 0, array.length - 1, maxDepth);
  }
};