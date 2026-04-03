/**
 * Quick Sort algorithm module.
 * Exports metadata and async generator.
 */

export const quickSort = {
  name: 'Quick Sort',
  description: 'Quick Sort partitions the array around a pivot, recursively sorting the partitions.',
  isSlow: false,
  nonNegativeOnly: false,
  supportsEmpty: true,
  async *generator(array) {
    const stack = [[0, array.length - 1]];

    while (stack.length) {
      const [low, high] = stack.pop();
      if (low >= high) continue;

      let pivotIndex = high;
      let i = low;

      for (let j = low; j < high; j++) {
        yield { type: 'compare', indices: [j, pivotIndex] };
        if (array[j] < array[pivotIndex]) {
          [array[i], array[j]] = [array[j], array[i]];
          yield { type: 'swap', indices: [i, j] };
          i++;
        }
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      [array[i], array[pivotIndex]] = [array[pivotIndex], array[i]];
      yield { type: 'swap', indices: [i, pivotIndex] };

      stack.push([low, i - 1]);
      stack.push([i + 1, high]);
    }
  }
};