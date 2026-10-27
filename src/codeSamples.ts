import type { Language } from './api'

// The landing page's code sample: only the search loop of the binary search lesson's problem, one
// function per language, not a whole program (reading the input and printing the answer are left
// to the learner). Code is the same in both interface languages, so it lives here and not in
// en.json/ar.json.
export const BINARY_SEARCH_SAMPLES: Record<Language, string> = {
  python: `def binary_search(a, target):
    low, high = 0, len(a) - 1
    while low <= high:
        mid = (low + high) // 2
        if a[mid] == target:
            return mid
        if a[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1
`,
  java: `static int binarySearch(int[] a, int target) {
    int low = 0, high = a.length - 1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (a[mid] == target) return mid;
        if (a[mid] < target) low = mid + 1;
        else high = mid - 1;
    }
    return -1;
}
`,
  javascript: `function binarySearch(a, target) {
  let low = 0, high = a.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (a[mid] === target) return mid;
    if (a[mid] < target) low = mid + 1;
    else high = mid - 1;
  }
  return -1;
}
`,
  cpp: `int binarySearch(const std::vector<int>& a, int target) {
    int low = 0, high = (int)a.size() - 1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (a[mid] == target) return mid;
        if (a[mid] < target) low = mid + 1;
        else high = mid - 1;
    }
    return -1;
}
`,
}

// The fixed run shown next to it: the problem's two visible tests and its four hidden ones, all
// passed, and one total time for the whole run (the app reports no time per test). An example,
// not a measurement.
export const SAMPLE_RUN = {
  visible: [
    { input: '6 9\n-1 0 3 5 9 12', expected: '4', actual: '4' },
    { input: '6 2\n-1 0 3 5 9 12', expected: '-1', actual: '-1' },
  ],
  hidden: 4,
  ms: 48,
}
