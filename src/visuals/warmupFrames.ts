// Pure function for the read, compute, print cycle of "Double the number", and the
// solution shown for each language. The player only reads these.

export type WarmupLine = 'prompt' | 'read' | 'convert' | 'double' | 'print'

export type WarmupFrame = {
  input: string // what the grader wrote to standard input
  line: WarmupLine | null // the code line running in this step
  text: string | null // the text the program read
  n: number | null
  answer: number | null
  output: string[] // lines printed so far
  verdict: string | null // shown when the grader has compared
  passed: boolean
  description: string
}

// Each solution as [step, code] lines; '' marks a line no step points at. The 'prompt'
// line is only shown when the prompt option is on. Every line was run in the sandbox.
export const SOLUTIONS: Record<string, { label: string; lines: [WarmupLine | '', string][] }> = {
  python: {
    label: 'Python',
    lines: [
      ['prompt', 'print("Enter a number:")'],
      ['read', 'text = input()'],
      ['convert', 'n = int(text)'],
      ['double', 'answer = 2 * n'],
      ['print', 'print(answer)'],
    ],
  },
  java: {
    label: 'Java',
    lines: [
      ['', 'import java.util.Scanner;'],
      ['', ''],
      ['', 'public class Main {'],
      ['', '    public static void main(String[] args) {'],
      ['', '        Scanner in = new Scanner(System.in);'],
      ['prompt', '        System.out.println("Enter a number:");'],
      ['read', '        String text = in.nextLine().trim();'],
      ['convert', '        int n = Integer.parseInt(text);'],
      ['double', '        int answer = 2 * n;'],
      ['print', '        System.out.println(answer);'],
      ['', '    }'],
      ['', '}'],
    ],
  },
  javascript: {
    label: 'JavaScript',
    lines: [
      ['prompt', "console.log('Enter a number:');"],
      ['read', "const text = require('fs').readFileSync(0, 'utf8');"],
      ['convert', 'const n = Number(text.trim());'],
      ['double', 'const answer = 2 * n;'],
      ['print', 'console.log(answer);'],
    ],
  },
  cpp: {
    label: 'C++',
    lines: [
      ['', '#include <iostream>'],
      ['', '#include <string>'],
      ['', 'using namespace std;'],
      ['', ''],
      ['', 'int main() {'],
      ['', '    string text;'],
      ['prompt', '    cout << "Enter a number:" << endl;'],
      ['read', '    cin >> text;'],
      ['convert', '    int n = stoi(text);'],
      ['double', '    int answer = 2 * n;'],
      ['print', '    cout << answer << endl;'],
      ['', '}'],
    ],
  },
}

export const PROMPT = 'Enter a number:'

// Expects n in the problem's range, -1000000000 to 1000000000.
export function warmupFrames(n: number, prompt: boolean): WarmupFrame[] {
  const input = String(n)
  const output: string[] = []
  let text: string | null = null
  let value: number | null = null
  let answer: number | null = null
  const frame = (line: WarmupLine | null, description: string, verdict: string | null = null, passed = false): WarmupFrame => ({
    input,
    line,
    text,
    n: value,
    answer,
    output: [...output],
    verdict,
    passed,
    description,
  })

  const frames = [frame(null, `The grader writes "${input}" to standard input and starts your program.`)]
  if (prompt) {
    output.push(PROMPT)
    frames.push(frame('prompt', `Your program prints "${PROMPT}". No person reads it: it goes to standard output, like everything printed.`))
  }
  text = input
  frames.push(frame('read', `Your program reads the text "${text}" from standard input. It is text, not a number yet.`))
  value = Number(text)
  frames.push(frame('convert', `It converts the text "${text}" to the integer ${value}.`))
  answer = 2 * value
  frames.push(frame('double', `It doubles ${value} to ${answer}.`))
  output.push(String(answer))
  frames.push(frame('print', `It prints ${answer} to standard output.`))

  // The grader's rule: whitespace at the start and end is ignored; everything else must match.
  const expected = String(2 * n)
  const actual = output.join('\n').trim()
  if (actual === expected) {
    frames.push(frame(null, `The grader compares "${actual}" with the expected "${expected}": passed.`, 'Passed', true))
  } else {
    const verdict = output.length > 1 ? 'Failed: the output has an extra line' : 'Failed'
    const shown = output.map((line) => `"${line}"`).join(' and ')
    frames.push(
      frame(null, `The grader compares the output, ${shown} on ${output.length} lines, with the expected "${expected}". They differ. ${verdict}.`, verdict),
    )
  }
  return frames
}
