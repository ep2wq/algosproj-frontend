// Pure function for Valid anagram, as in the lesson: compare the lengths first, then add 1 for
// each letter of s and take 1 away for each letter of t. The player only reads these.

import type { T } from './i18n'

export type CountEntry = { letter: string; count: number }

export type AnagramFrame = {
  s: string
  t: string
  pass: 'length' | 's' | 't' | 'done'
  index: number | null // position read in s (pass 's') or t (pass 't')
  counts: CountEntry[] // letter -> count, in the order letters were first seen
  changed: string | null // letter whose count changed in this step
  below: string | null // letter whose count went below 0
  output: 'yes' | 'no' | null
  description: string
}

export function anagramFrames(s: string, t: string, tr: T): AnagramFrame[] {
  const letters = (n: number) => tr('anagram.letters', { count: n })
  const quoted = (word: string) => (word === '' ? tr('anagram.emptyWord') : tr('anagram.quoted', { word }))
  const counts: CountEntry[] = []
  const frame = (parts: Partial<Omit<AnagramFrame, 's' | 't' | 'counts' | 'description'>> & { pass: AnagramFrame['pass']; description: string }): AnagramFrame => ({
    s,
    t,
    pass: parts.pass,
    index: parts.index ?? null,
    counts: counts.map((entry) => ({ ...entry })),
    changed: parts.changed ?? null,
    below: parts.below ?? null,
    output: parts.output ?? null,
    description: parts.description,
  })

  if (s.length !== t.length) {
    return [
      frame({
        pass: 'length',
        output: 'no',
        description: tr('anagram.lengthsDiffer', { sWord: quoted(s), sLetters: letters(s.length), tWord: quoted(t), tLetters: letters(t.length) }),
      }),
    ]
  }

  const same = s.length === 0 ? tr('anagram.lengthsSameEmpty') : tr('anagram.lengthsSame', { sWord: quoted(s), tWord: quoted(t), letters: letters(s.length) })
  const frames = [frame({ pass: 'length', description: same })]

  for (let i = 0; i < s.length; i++) {
    const letter = s[i]
    const entry = counts.find((e) => e.letter === letter)
    if (entry) entry.count++
    else counts.push({ letter, count: 1 })
    const count = entry ? entry.count : 1
    frames.push(frame({ pass: 's', index: i, changed: letter, description: tr('anagram.passS', { i, letter, value: count }) }))
  }

  for (let i = 0; i < t.length; i++) {
    const letter = t[i]
    const entry = counts.find((e) => e.letter === letter)
    if (entry) entry.count--
    else counts.push({ letter, count: -1 })
    const count = entry ? entry.count : -1
    if (count < 0) {
      frames.push(
        frame({
          pass: 't',
          index: i,
          changed: letter,
          below: letter,
          output: 'no',
          description: entry ? tr('anagram.passTBelowCounted', { i, letter }) : tr('anagram.passTBelowNew', { i, letter }),
        }),
      )
      return frames
    }
    frames.push(frame({ pass: 't', index: i, changed: letter, description: tr('anagram.passT', { i, letter, value: count }) }))
  }

  frames.push(frame({ pass: 'done', output: 'yes', description: s.length === 0 ? tr('anagram.doneEmpty') : tr('anagram.done') }))
  return frames
}
