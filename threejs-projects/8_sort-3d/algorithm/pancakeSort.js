/**
 * Pancake Sort algorithm module.
 * Exports metadata and async generator.
 */

export const pancakeSort = {
  name: 'Pancake Sort',
  description: 'Pancake Sort repeatedly flips subarrays to move the largest unsorted element to its place.',
  isSlow: true,
  nonNegativeOnly: false,
  supportsEmpty: true,
  async *generator(array) {
    const n = array.length;

    function flip(end) {
      let start = 0;
      while (start < end) {
        [array[start], array[end]] = [array[end], array[start]];
        start++;
        end--;
      }
    }

    for (let currSize = n; currSize > 1; currSize--) {
      let maxIdx = 0;
      for (let i = 1; i < currSize; i++) {
        yield { type: 'compare', indices: [i, maxIdx] };
        if (array[i] > array[maxIdx]) {
          maxIdx = i;
        }
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      if (maxIdx !== currSize - 1) {
        flip(maxIdx);
        yield { type: 'swap', indices: [0, maxIdx] };
        flip(currSize - 1);
        yield { type: 'swap', indices: [0, currSize - 1] };
      }
    }
  }
};