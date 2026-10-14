// Pure functions for three stack algorithms: balanced brackets, postfix evaluation and
// next greater element. The player only reads these.

export type StackMode = 'brackets' | 'postfix' | 'next-greater'

export type StackItem = { text: string; index?: number } // index: next greater stores positions

export type StackFrame = {
  items: string[] // the input: characters, tokens or numbers
  current: number | null // position being read, or null
  stack: StackItem[] // bottom to top
  answers: (number | null)[] | null // next greater only: null = not known yet
  filled: number[] // answer positions written in this step
  result: string | null // shown when finished
  failed: boolean // the result is a "not balanced" verdict
  description: string
}

function frameMaker(items: string[]) {
  return (parts: Partial<Omit<StackFrame, 'items' | 'description'>> & { stack: StackItem[]; description: string }): StackFrame => ({
    items: [...items],
    current: parts.current ?? null,
    stack: parts.stack.map((item) => ({ ...item })),
    answers: parts.answers ? [...parts.answers] : null,
    filled: [...(parts.filled ?? [])],
    result: parts.result ?? null,
    failed: parts.failed ?? false,
    description: parts.description,
  })
}

const OPENER_OF: Record<string, string> = { ')': '(', ']': '[', '}': '{' }

// The problem's rule: only ( ) [ ] { }; an empty line counts as balanced.
export function bracketFrames(text: string): StackFrame[] {
  const items = [...text]
  const frame = frameMaker(items)
  const stack: StackItem[] = []
  if (items.length === 0) {
    return [frame({ stack, result: 'Balanced', description: 'There are no brackets, so nothing is left open. Balanced.' })]
  }
  const frames = [frame({ stack, description: 'Start with an empty stack.' })]

  for (let i = 0; i < items.length; i++) {
    const c = items[i]
    const opener = OPENER_OF[c]
    if (opener === undefined) {
      stack.push({ text: c })
      frames.push(frame({ current: i, stack, description: `Push ${c}.` }))
    } else if (stack.length === 0) {
      frames.push(frame({ current: i, stack, result: 'Not balanced', failed: true, description: `Not balanced: ${c} has no opening bracket.` }))
      return frames
    } else if (stack[stack.length - 1].text !== opener) {
      const top = stack[stack.length - 1].text
      frames.push(frame({ current: i, stack, result: 'Not balanced', failed: true, description: `Not balanced: ${c} does not match the top, ${top}.` }))
      return frames
    } else {
      stack.pop()
      frames.push(frame({ current: i, stack, description: `Pop ${opener} — it matches ${c}.` }))
    }
  }

  if (stack.length === 0) {
    frames.push(frame({ stack, result: 'Balanced', description: 'Every bracket was closed and the stack is empty. Balanced.' }))
  } else {
    const n = stack.length
    frames.push(
      frame({ stack, result: 'Not balanced', failed: true, description: `Not balanced: ${n} ${n === 1 ? 'bracket is' : 'brackets are'} still open.` }),
    )
  }
  return frames
}

const OPERATORS = ['+', '-', '*', '/']

// The problem's rule: / is integer division that truncates toward zero.
export function applyOperator(op: string, left: number, right: number) {
  if (op === '+') return left + right
  if (op === '-') return left - right
  if (op === '*') return left * right
  return Math.trunc(left / right)
}

const INT32_MIN = -(2 ** 31)
const INT32_MAX = 2 ** 31 - 1

// Returns an error message, or null when the tokens form a valid expression the problem allows:
// two values before every operator, one value left at the end, no division by zero, and every
// intermediate result inside a 32-bit signed integer.
export function postfixError(tokens: string[]): string | null {
  const stack: number[] = []
  for (const token of tokens) {
    if (!OPERATORS.includes(token)) {
      stack.push(Number(token))
      continue
    }
    if (stack.length < 2) return `Not a valid expression: ${token} needs two values before it.`
    const right = stack.pop()!
    const left = stack.pop()!
    if (token === '/' && right === 0) return 'This expression divides by zero.'
    const value = applyOperator(token, left, right)
    if (value < INT32_MIN || value > INT32_MAX) return 'A result is too big for a 32-bit integer, which the problem rules out.'
    stack.push(value)
  }
  if (stack.length !== 1) return `Not a valid expression: it leaves ${stack.length} values instead of one.`
  return null
}

// Wraps a negative right operand in parentheses: "3 - (-4)".
function term(n: number) {
  return n < 0 ? `(${n})` : String(n)
}

// Expects tokens that postfixError accepts.
export function postfixFrames(tokens: string[]): StackFrame[] {
  const frame = frameMaker(tokens)
  const stack: StackItem[] = []
  const frames = [frame({ stack, description: 'Start with an empty stack.' })]

  tokens.forEach((token, i) => {
    if (!OPERATORS.includes(token)) {
      stack.push({ text: token })
      frames.push(frame({ current: i, stack, description: `Push ${token}.` }))
      return
    }
    const right = Number(stack.pop()!.text)
    const left = Number(stack.pop()!.text)
    const value = applyOperator(token, left, right)
    const rounded = token === '/' && left % right !== 0 ? ' (rounded toward zero)' : ''
    stack.push({ text: String(value) })
    frames.push(
      frame({
        current: i,
        stack,
        description: `Pop ${right} and ${left}. Compute ${left} ${token} ${term(right)} = ${value}${rounded}. Push ${value}.`,
      }),
    )
  })

  const value = stack[0].text
  frames.push(frame({ stack, result: `Result: ${value}`, description: `No tokens are left. The one value on the stack, ${value}, is the result.` }))
  return frames
}

function listPositions(positions: number[]) {
  if (positions.length === 1) return `Index ${positions[0]} is`
  return `Indices ${positions.slice(0, -1).join(', ')} and ${positions[positions.length - 1]} are`
}

// The problem's rule: the first element to the right that is strictly greater, or -1.
export function nextGreaterFrames(values: number[]): StackFrame[] {
  const items = values.map(String)
  const frame = frameMaker(items)
  const stack: StackItem[] = []
  const answers: (number | null)[] = values.map(() => null)
  const frames = [frame({ stack, answers, description: 'Start with an empty stack. No answers are known yet.' })]

  values.forEach((value, i) => {
    frames.push(frame({ current: i, stack, answers, description: `Look at ${value} at index ${i}.` }))
    while (stack.length > 0 && value > values[stack[stack.length - 1].index!]) {
      const top = stack.pop()!.index!
      answers[top] = value
      frames.push(
        frame({
          current: i,
          stack,
          answers,
          filled: [top],
          description: `${value} is bigger than the ${values[top]} on top, so the next greater of ${values[top]} is ${value}. Pop it.`,
        }),
      )
    }
    const top = stack.length > 0 ? values[stack[stack.length - 1].index!] : null
    stack.push({ text: String(value), index: i })
    frames.push(
      frame({
        current: i,
        stack,
        answers,
        description: top === null ? `Push index ${i}.` : `${value} is not bigger than the ${top} on top. Push index ${i}.`,
      }),
    )
  })

  const waiting = stack.map((item) => item.index!)
  for (const position of waiting) answers[position] = -1
  frames.push(
    frame({
      stack,
      answers,
      filled: waiting,
      result: `Answers: ${answers.join(' ')}`,
      description: `${listPositions(waiting)} still on the stack: nothing to the right is bigger, so the answer is -1.`,
    }),
  )
  return frames
}
