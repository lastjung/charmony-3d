/**
 * Radix Sort algorithm module.
 * Exports metadata and async generator.
 * Assumes non-negative integers.
 */

export const radixSort = {
  name: 'Radix Sort',
  description: 'Radix Sort sorts numbers digit by digit from least to most significant.',
  isSlow: false,
  nonNegativeOnly: true,
  supportsEmpty: false,
  async *generator(array) {
    const max = Math.max(...array);
    let exp = 1;

    while (Math.floor(max / exp) > 0) {
      const output = new Array(array.length).fill(0);
      const count = new Array(10).fill(0);

      for (let i = 0; i < array.length; i++) {
        const digit = Math.floor(array[i] / exp) % 10;
        count[digit]++;
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      for (let i = 1; i < 10; i++) {
        count[i] += count[i - 1];
      }

      for (let i = array.length - 1; i >= 0; i--) {
        const digit = Math.floor(array[i] / exp) % 10;
        output[--count[digit]] = array[i];
      }

      for (let i = 0; i < array.length; i++) {
        yield { type: 'compare', indices: [i, i] };
        array[i] = output[i];
        yield { type: 'swap', indices: [i, i] };
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      exp *= 10;
    }
  }
};