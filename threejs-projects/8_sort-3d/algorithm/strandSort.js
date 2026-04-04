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
    const input = array.slice();
    const output = [];

    while (input.length) {
      const strand = [];
      strand.push(input.shift());

      for (let i = 0; i < input.length; ) {
        yield { type: 'compare', indices: [0, i + 1] };
        if (input[i] >= strand[strand.length - 1]) {
          strand.push(input.splice(i, 1)[0]);
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

      for (let writeIndex = 0; writeIndex < output.length; writeIndex++) {
        if (array[writeIndex] !== output[writeIndex]) {
          array[writeIndex] = output[writeIndex];
          yield { type: 'write', index: writeIndex };
        }
      }
    }
  }
};
