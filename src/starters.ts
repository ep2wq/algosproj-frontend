import type { Language } from './api'

export const LANGUAGE_LABELS: Record<Language, string> = {
  python: 'Python',
  java: 'Java',
  javascript: 'JavaScript',
  cpp: 'C++',
}

// Starter code per language: read one integer from stdin and print it.
export const STARTER_CODE: Record<Language, string> = {
  python: `n = int(input())
print(n)
`,
  java: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
        System.out.println(n);
    }
}
`,
  javascript: `const input = require('fs').readFileSync(0, 'utf8').trim();
const n = parseInt(input, 10);
process.stdout.write(n + '\\n');
`,
  cpp: `#include <iostream>

int main() {
    int n;
    std::cin >> n;
    std::cout << n << std::endl;
    return 0;
}
`,
}
