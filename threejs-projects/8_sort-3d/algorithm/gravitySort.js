/**
 * Gravity (Bead) Sort algorithm module.
 * Non-comparison sort for non-negative integers.
 */

export const gravitySort = {
  name: 'Gravity (Bead) Sort',
  description: 'A non-comparison sorting algorithm inspired by beads falling under gravity, works only for non-negative integers.',
  isSlow: false,
  nonNegativeOnly: true,
  supportsEmpty: true,
  isStable: false,
  isInPlace: false,
  isComparisonSort: false,
  timeComplexity: 'O(n * max)',
  spaceComplexity: 'O(n * max)',

  async *generator(array) {
    const n = array.length;
    if (n === 0) return;

    const max = Math.max(...array);
    const beads = Array.from({ length: n }, () => new Array(max).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < array[i]; j++) {
        beads[i][j] = 1;
      }
    }

    for (let j = 0; j < max; j++) {
      let sum = 0;
      for (let i = 0; i < n; i++) {
        sum += beads[i][j];
        beads[i][j] = 0;
      }
      for (let i = n - sum; i < n; i++) {
        beads[i][j] = 1;
      }
    }

    for (let i = 0; i < n; i++) {
      let count = 0;
      for (let j = 0; j < max; j++) {
        count += beads[i][j];
      }
      array[i] = count;
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
};