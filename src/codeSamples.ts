import type { Language } from './api'

// The landing page's code sample: the binary search lesson's problem (line 1: n and target, line 2:
// the n sorted numbers; print the position or -1), one program per language. Code is the same in
// both interface languages, so it lives here and not in en.json/ar.json.
export const BINARY_SEARCH_SAMPLES: Record<Language, string> = {
  python: `import sys

def binary_search(a, target):
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

data = sys.stdin.read().split()
n, target = int(data[0]), int(data[1])
a = [int(x) for x in data[2:2 + n]]
print(binary_search(a, target))
`,
  java: `import java.util.Scanner;

public class Main {
    static int binarySearch(int[] a, int target) {
        int low = 0, high = a.length - 1;
        while (low <= high) {
            int mid = low + (high - low) / 2;
            if (a[mid] == target) return mid;
            if (a[mid] < target) low = mid + 1;
            else high = mid - 1;
        }
        return -1;
    }

    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt(), target = in.nextInt();
        int[] a = new int[n];
        for (int i = 0; i < n; i++) a[i] = in.nextInt();
        System.out.println(binarySearch(a, target));
    }
}
`,
  javascript: `const data = require('fs').readFileSync(0, 'utf8').split(/\\s+/).filter(Boolean).map(Number);
const [n, target] = data;
const a = data.slice(2, 2 + n);

function binarySearch(a, target) {
  let low = 0, high = a.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (a[mid] === target) return mid;
    if (a[mid] < target) low = mid + 1;
    else high = mid - 1;
  }
  return -1;
}

console.log(binarySearch(a, target));
`,
  cpp: `#include <iostream>
#include <vector>

int binarySearch(const std::vector<int>& a, int target) {
    int low = 0, high = (int)a.size() - 1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (a[mid] == target) return mid;
        if (a[mid] < target) low = mid + 1;
        else high = mid - 1;
    }
    return -1;
}

int main() {
    int n, target;
    std::cin >> n >> target;
    std::vector<int> a(n);
    for (int& x : a) std::cin >> x;
    std::cout << binarySearch(a, target) << std::endl;
    return 0;
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
