/**
 * Cycle Sort algorithm module.
 * Exports metadata and async generator.
 */

export const cycleSort = {
  name: 'Cycle Sort',
  description: 'Cycle Sort minimizes writes by rotating cycles of elements into place.',
  isSlow: true,
  nonNegativeOnly: false,
  supportsEmpty: true,
  async *generator(array) {
    const n = array.length;

    for (let cycleStart = 0; cycleStart < n - 1; cycleStart++) {
      let item = array[cycleStart];
      let pos = cycleStart;

      for (let i = cycleStart + 1; i < n; i++) {
        yield { type: 'compare', indices: [i, cycleStart] };
        if (array[i] < item) {
          pos++;
        }
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      if (pos === cycleStart) continue;

      while (item === array[pos]) {
        pos++;
      }

      if (pos !== cycleStart) {
        [array[pos], item] = [item, array[pos]];
        yield { type: 'swap', indices: [pos, cycleStart] };
      }

      while (pos !== cycleStart) {
        pos = cycleStart;
        for (let i = cycleStart + 1; i < n; i++) {
          yield { type: 'compare', indices: [i, cycleStart] };
          if (array[i] < item) {
            pos++;
          }
          await new Promise(resolve => setTimeout(resolve, 0));
        }

        while (item === array[pos]) {
          pos++;
        }

        if (item !== array[pos]) {
          [array[pos], item] = [item, array[pos]];
          yield { type: 'swap', indices: [pos, cycleStart] };
        }
      }
    }
  }
};