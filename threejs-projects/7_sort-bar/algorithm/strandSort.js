/**
 * Strand Sort algorithm module.
 * Extracts increasing subsequences and merges.
 */

export const strandSort = {
  name: 'Strand Sort',
  description: 'A stable sorting algorithm that repeatedly extracts increasing subsequences (strands) and merges them.',
  isSlow: true,
  nonNegativeOnly: false,
  supportsEmpty: true,
  isStable: true,
  isInPlace: false,
  isComparisonSort: true,
  timeComplexity: 'O(n^2)',
  spaceComplexity: 'O(n)',

  async *generator(array) {
    const output = [];

    while (array.length) {
      const strand = [];
      strand.push(array.shift());

      for (let i = 0; i < array.length; ) {
        yield { type: 'compare', indices: [i, -1] }; // -1 as placeholder
        if (array[i] >= strand[strand.length - 1]) {
          strand.push(array.splice(i, 1)[0]);
        } else {
          i++;
        }
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      let i = 0, j = 0, k = 0;
      const merged = [];
      while (i < output.length && j < strand.length) {
        if (output[i] <= strand[j]) {
          merged[k++] = output[i++];
        } else {
          merged[k++] = strand[j++];
        }
      }
      while (i < output.length) merged[k++] = output[i++];
      while (j < strand.length) merged[k++] = strand[j++];

      output.length = 0;
      for (const val of merged) output.push(val);
    }

    for (let i = 0; i < output.length; i++) {
      array[i] = output[i];
    }
  }
};