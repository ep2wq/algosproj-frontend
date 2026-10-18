// Pure functions for three stack algorithms: balanced brackets, postfix evaluation and
// next greater element. The player only reads these.

import { joinAnd, value, type T } from './i18n'

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
export function bracketFrames(text: string, t: T): StackFrame[] {
  const items = [...text]
  const frame = frameMaker(items)
  const stack: StackItem[] = []
  if (items.length === 0) {
    return [frame({ stack, result: t('stack.balanced'), description: t('stack.noBrackets') })]
  }
  const frames = [frame({ stack, description: t('stack.start') })]

  for (let i = 0; i < items.length; i++) {
    const c = items[i]
    const opener = OPENER_OF[c]
    if (opener === undefined) {
      stack.push({ text: c })
      frames.push(frame({ current: i, stack, description: t('stack.push', { token: c }) }))
    } else if (stack.length === 0) {
      frames.push(frame({ current: i, stack, result: t('stack.notBalanced'), failed: true, description: t('stack.noOpener', { closer: c }) }))
      return frames
    } else if (stack[stack.length - 1].text !== opener) {
      const top = stack[stack.length - 1].text
      frames.push(frame({ current: i, stack, result: t('stack.notBalanced'), failed: true, description: t('stack.mismatch', { closer: c, top }) }))
      return frames
    } else {
      stack.pop()
      frames.push(frame({ current: i, stack, description: t('stack.popMatch', { opener, closer: c }) }))
    }
  }

  if (stack.length === 0) {
    frames.push(frame({ stack, result: t('stack.balanced'), description: t('stack.allClosed') }))
  } else {
    frames.push(frame({ stack, result: t('stack.notBalanced'), failed: true, description: t('stack.stillOpen', { count: stack.length }) }))
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
export function postfixError(tokens: string[], t: T): string | null {
  const stack: number[] = []
  for (const token of tokens) {
    if (!OPERATORS.includes(token)) {
      stack.push(Number(token))
      continue
    }
    if (stack.length < 2) return t('stack.needsTwo', { token })
    const right = stack.pop()!
    const left = stack.pop()!
    if (token === '/' && right === 0) return t('stack.divideByZero')
    const result = applyOperator(token, left, right)
    if (result < INT32_MIN || result > INT32_MAX) return t('stack.tooBig')
    stack.push(result)
  }
  if (stack.length !== 1) return t('stack.leftover', { count: stack.length })
  return null
}

// Wraps a negative right operand in parentheses: "3 - (-4)".
function term(n: number) {
  return n < 0 ? `(${n})` : String(n)
}

// Expects tokens that postfixError accepts.
export function postfixFrames(tokens: string[], t: T): StackFrame[] {
  const frame = frameMaker(tokens)
  const stack: StackItem[] = []
  const frames = [frame({ stack, description: t('stack.start') })]

  tokens.forEach((token, i) => {
    if (!OPERATORS.includes(token)) {
      stack.push({ text: token })
      frames.push(frame({ current: i, stack, description: t('stack.push', { token }) }))
      return
    }
    const right = Number(stack.pop()!.text)
    const left = Number(stack.pop()!.text)
    const result = applyOperator(token, left, right)
    const params = { left, right, op: token, term: term(right), result }
    stack.push({ text: String(result) })
    frames.push(
      frame({
        current: i,
        stack,
        description: token === '/' && left % right !== 0 ? t('stack.computeRounded', params) : t('stack.compute', params),
      }),
    )
  })

  const last = stack[0].text
  frames.push(frame({ stack, result: t('stack.resultLabel', { value: last }), description: t('stack.resultDone', { value: last }) }))
  return frames
}

// The problem's rule: the first element to the right that is strictly greater, or -1.
export function nextGreaterFrames(values: number[], t: T): StackFrame[] {
  const items = values.map(String)
  const frame = frameMaker(items)
  const stack: StackItem[] = []
  const answers: (number | null)[] = values.map(() => null)
  const frames = [frame({ stack, answers, description: t('stack.nextStart') })]

  values.forEach((current, i) => {
    frames.push(frame({ current: i, stack, answers, description: t('stack.look', { value: current, index: i }) }))
    while (stack.length > 0 && current > values[stack[stack.length - 1].index!]) {
      const top = stack.pop()!.index!
      answers[top] = current
      frames.push(
        frame({
          current: i,
          stack,
          answers,
          filled: [top],
          description: t('stack.biggerPop', { value: current, top: values[top] }),
        }),
      )
    }
    const top = stack.length > 0 ? values[stack[stack.length - 1].index!] : null
    stack.push({ text: String(current), index: i })
    frames.push(
      frame({
        current: i,
        stack,
        answers,
        description: top === null ? t('stack.pushIndex', { index: i }) : t('stack.notBiggerPush', { value: current, top, index: i }),
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
      result: t('stack.answersLabel', { answers: answers.join(' ') }),
      description: t('stack.leftOnStack', { positions: joinAnd(t, waiting.map((position) => value(t, position))), count: waiting.length }),
    }),
  )
  return frames
}
