/**
 * Gnome Sort algorithm module.
 * Exports metadata and async generator.
 */

export const gnomeSort = {
  name: 'Gnome Sort',
  description: 'Gnome Sort moves elements to their correct place by swapping backward like a garden gnome.',
  isSlow: true,
  nonNegativeOnly: false,
  supportsEmpty: true,
  async *generator(array) {
    let i = 0;
    const n = array.length;

    while (i < n) {
      if (i === 0 || array[i - 1] <= array[i]) {
        i++;
      } else {
        yield { type: 'compare', indices: [i - 1, i] };
        [array[i - 1], array[i]] = [array[i], array[i - 1]];
        yield { type: 'swap', indices: [i - 1, i] };
        i--;
      }
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
};