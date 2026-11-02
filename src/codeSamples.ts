import type { Language } from './api'
import type { Token } from './syntax'

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

// The same samples, split into coloured pieces line by line ([type, text], .syntax-<type> in
// index.css), stored here so the landing page needs no highlighter. Generated once with
// tokenize() from src/syntax.ts; scripts/check-code-samples.mjs (npm run lint) fails if the pieces
// of a sample, joined, are not exactly BINARY_SEARCH_SAMPLES above. Edit both together.
export const BINARY_SEARCH_LINES: Record<Language, Token[][]> = {
  python: [
    [['keyword', "def"], ['plain', " "], ['function', "binary_search"], ['plain', "(a, target)"], ['operator', ":"]],
    [['plain', "    low, high "], ['operator', "="], ['plain', " "], ['number', "0"], ['plain', ", "], ['function', "len"], ['plain', "(a) "], ['operator', "-"], ['plain', " "], ['number', "1"]],
    [['plain', "    "], ['keyword', "while"], ['plain', " low "], ['operator', "<="], ['plain', " high"], ['operator', ":"]],
    [['plain', "        mid "], ['operator', "="], ['plain', " (low "], ['operator', "+"], ['plain', " high) "], ['operator', "//"], ['plain', " "], ['number', "2"]],
    [['plain', "        "], ['keyword', "if"], ['plain', " a[mid] "], ['operator', "=="], ['plain', " target"], ['operator', ":"]],
    [['plain', "            "], ['keyword', "return"], ['plain', " mid"]],
    [['plain', "        "], ['keyword', "if"], ['plain', " a[mid] "], ['operator', "<"], ['plain', " target"], ['operator', ":"]],
    [['plain', "            low "], ['operator', "="], ['plain', " mid "], ['operator', "+"], ['plain', " "], ['number', "1"]],
    [['plain', "        "], ['keyword', "else"], ['operator', ":"]],
    [['plain', "            high "], ['operator', "="], ['plain', " mid "], ['operator', "-"], ['plain', " "], ['number', "1"]],
    [['plain', "    "], ['keyword', "return"], ['plain', " "], ['operator', "-"], ['number', "1"]],
  ],
  java: [
    [['keyword', "static"], ['plain', " "], ['keyword', "int"], ['plain', " "], ['function', "binarySearch"], ['plain', "("], ['keyword', "int"], ['plain', "[] a, "], ['keyword', "int"], ['plain', " target) {"]],
    [['plain', "    "], ['keyword', "int"], ['plain', " low "], ['operator', "="], ['plain', " "], ['number', "0"], ['plain', ", high "], ['operator', "="], ['plain', " a.length "], ['operator', "-"], ['plain', " "], ['number', "1"], ['plain', ";"]],
    [['plain', "    "], ['keyword', "while"], ['plain', " (low "], ['operator', "<="], ['plain', " high) {"]],
    [['plain', "        "], ['keyword', "int"], ['plain', " mid "], ['operator', "="], ['plain', " low "], ['operator', "+"], ['plain', " (high "], ['operator', "-"], ['plain', " low) "], ['operator', "/"], ['plain', " "], ['number', "2"], ['plain', ";"]],
    [['plain', "        "], ['keyword', "if"], ['plain', " (a[mid] "], ['operator', "=="], ['plain', " target) "], ['keyword', "return"], ['plain', " mid;"]],
    [['plain', "        "], ['keyword', "if"], ['plain', " (a[mid] "], ['operator', "<"], ['plain', " target) low "], ['operator', "="], ['plain', " mid "], ['operator', "+"], ['plain', " "], ['number', "1"], ['plain', ";"]],
    [['plain', "        "], ['keyword', "else"], ['plain', " high "], ['operator', "="], ['plain', " mid "], ['operator', "-"], ['plain', " "], ['number', "1"], ['plain', ";"]],
    [['plain', "    }"]],
    [['plain', "    "], ['keyword', "return"], ['plain', " "], ['operator', "-"], ['number', "1"], ['plain', ";"]],
    [['plain', "}"]],
  ],
  javascript: [
    [['keyword', "function"], ['plain', " "], ['function', "binarySearch"], ['plain', "(a, target) {"]],
    [['plain', "  "], ['keyword', "let"], ['plain', " low "], ['operator', "="], ['plain', " "], ['number', "0"], ['plain', ", high "], ['operator', "="], ['plain', " a.length "], ['operator', "-"], ['plain', " "], ['number', "1"], ['plain', ";"]],
    [['plain', "  "], ['keyword', "while"], ['plain', " (low "], ['operator', "<="], ['plain', " high) {"]],
    [['plain', "    "], ['keyword', "const"], ['plain', " mid "], ['operator', "="], ['plain', " Math."], ['function', "floor"], ['plain', "((low "], ['operator', "+"], ['plain', " high) "], ['operator', "/"], ['plain', " "], ['number', "2"], ['plain', ");"]],
    [['plain', "    "], ['keyword', "if"], ['plain', " (a[mid] "], ['operator', "==="], ['plain', " target) "], ['keyword', "return"], ['plain', " mid;"]],
    [['plain', "    "], ['keyword', "if"], ['plain', " (a[mid] "], ['operator', "<"], ['plain', " target) low "], ['operator', "="], ['plain', " mid "], ['operator', "+"], ['plain', " "], ['number', "1"], ['plain', ";"]],
    [['plain', "    "], ['keyword', "else"], ['plain', " high "], ['operator', "="], ['plain', " mid "], ['operator', "-"], ['plain', " "], ['number', "1"], ['plain', ";"]],
    [['plain', "  }"]],
    [['plain', "  "], ['keyword', "return"], ['plain', " "], ['operator', "-"], ['number', "1"], ['plain', ";"]],
    [['plain', "}"]],
  ],
  cpp: [
    [['keyword', "int"], ['plain', " "], ['function', "binarySearch"], ['plain', "("], ['keyword', "const"], ['plain', " std"], ['operator', "::"], ['plain', "vector"], ['operator', "<"], ['keyword', "int"], ['operator', ">&"], ['plain', " a, "], ['keyword', "int"], ['plain', " target) {"]],
    [['plain', "    "], ['keyword', "int"], ['plain', " low "], ['operator', "="], ['plain', " "], ['number', "0"], ['plain', ", high "], ['operator', "="], ['plain', " ("], ['keyword', "int"], ['plain', ")a."], ['function', "size"], ['plain', "() "], ['operator', "-"], ['plain', " "], ['number', "1"], ['plain', ";"]],
    [['plain', "    "], ['keyword', "while"], ['plain', " (low "], ['operator', "<="], ['plain', " high) {"]],
    [['plain', "        "], ['keyword', "int"], ['plain', " mid "], ['operator', "="], ['plain', " low "], ['operator', "+"], ['plain', " (high "], ['operator', "-"], ['plain', " low) "], ['operator', "/"], ['plain', " "], ['number', "2"], ['plain', ";"]],
    [['plain', "        "], ['keyword', "if"], ['plain', " (a[mid] "], ['operator', "=="], ['plain', " target) "], ['keyword', "return"], ['plain', " mid;"]],
    [['plain', "        "], ['keyword', "if"], ['plain', " (a[mid] "], ['operator', "<"], ['plain', " target) low "], ['operator', "="], ['plain', " mid "], ['operator', "+"], ['plain', " "], ['number', "1"], ['plain', ";"]],
    [['plain', "        "], ['keyword', "else"], ['plain', " high "], ['operator', "="], ['plain', " mid "], ['operator', "-"], ['plain', " "], ['number', "1"], ['plain', ";"]],
    [['plain', "    }"]],
    [['plain', "    "], ['keyword', "return"], ['plain', " "], ['operator', "-"], ['number', "1"], ['plain', ";"]],
    [['plain', "}"]],
  ],
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
