/**
 * Heap Sort algorithm module.
 * Exports metadata and async generator.
 */

export const heapSort = {
  name: 'Heap Sort',
  description: 'Heap Sort builds a max heap and repeatedly extracts the maximum element to sort the array.',
  isSlow: false,
  nonNegativeOnly: false,
  supportsEmpty: true,
  async *generator(array) {
    const n = array.length;

    async function* heapify(n, i) {
      let largest = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;

      if (left < n) {
        yield { type: 'compare', indices: [left, largest] };
        if (array[left] > array[largest]) {
          largest = left;
        }
      }

      if (right < n) {
        yield { type: 'compare', indices: [right, largest] };
        if (array[right] > array[largest]) {
          largest = right;
        }
      }

      if (largest !== i) {
        [array[i], array[largest]] = [array[largest], array[i]];
        yield { type: 'swap', indices: [i, largest] };
        yield* heapify(n, largest);
      }
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    // Build max heap
    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
      yield* heapify(n, i);
    }

    // Extract elements from heap
    for (let i = n - 1; i > 0; i--) {
      [array[0], array[i]] = [array[i], array[0]];
      yield { type: 'swap', indices: [0, i] };
      yield* heapify(i, 0);
    }
  }
};