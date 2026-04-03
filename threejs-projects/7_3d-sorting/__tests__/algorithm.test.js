import { algorithms } from '../algorithm/index.js';

function isSorted(arr) {
  for (let i = 1; i < arr.length; i++) {
    if (arr[i - 1] > arr[i]) return false;
  }
  return true;
}

function arraysHaveSameElements(arr1, arr2) {
  const countMap = new Map();
  for (const el of arr1) {
    countMap.set(el, (countMap.get(el) || 0) + 1);
  }
  for (const el of arr2) {
    if (!countMap.has(el)) return false;
    countMap.set(el, countMap.get(el) - 1);
    if (countMap.get(el) < 0) return false;
  }
  return Array.from(countMap.values()).every(count => count === 0);
}

const smallCases = [
  [],
  [1],
  [1, 2, 3, 4, 5],
  [5, 4, 3, 2, 1],
  [3, 1, 2, 3, 1],
  [-3, -1, -2, 0, 2, 1]
];

const largeRandom = Array.from({ length: 100 }, () => Math.floor(Math.random() * 1000));


describe('Sorting Algorithms', () => {
  for (const [key, algo] of Object.entries(algorithms)) {
    describe(algo.name || key, () => {
      for (const input of smallCases) {
        const skipNegatives = algo.nonNegativeOnly && input.some(x => x < 0);
        const skipEmpty = algo.supportsEmpty === false && input.length === 0;

        const testName = `sorts array: [${input}]`;

        (skipNegatives || skipEmpty ? it.skip : it)(testName, async () => {
          const arr = [...input];
          const original = [...input];
          let iterations = 0;

          const gen = algo.generator(arr);
          while (true) {
            const { done } = await gen.next();
            iterations++;
            if (done) break;
          }

          expect(isSorted(arr)).toBe(true);
          expect(arraysHaveSameElements(arr, original)).toBe(true);

          // Relax iteration count for non-comparison sorts
          if (!algo.nonNegativeOnly) {
            const n = arr.length;
            const maxIterations = n <= 1 ? 3 : n * n * 2;
            expect(iterations).toBeLessThanOrEqual(maxIterations);
          }
        });
      }
      it('emits compare steps for indicator dots', async () => {
        const arr = [3, 1, 2];
        const gen = algo.generator([...arr]);
        let compareCount = 0;
        while (true) {
          const { value, done } = await gen.next();
          if (done) break;
          if (value && value.type === 'compare') {
            compareCount++;
          }
        }
        if (algo.isComparisonSort !== false) {
          expect(compareCount).toBeGreaterThan(0);
        } else {
          // Non-comparison sort: just document that no compare steps are expected
          expect(compareCount).toBe(0);
        }
      });

      // Skip large array test for slow algorithms
      if (!algo.isSlow) {
        it(`sorts large random array`, async () => {
          const arr = [...largeRandom];
          const original = [...largeRandom];
          let iterations = 0;

          const gen = algo.generator(arr);
          while (true) {
            const { done } = await gen.next();
            iterations++;
            if (done) break;
          }

          expect(isSorted(arr)).toBe(true);
          expect(arraysHaveSameElements(arr, original)).toBe(true);
        }, 20000); // increase timeout for large array
      }
    });
  }
});