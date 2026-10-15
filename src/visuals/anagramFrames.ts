// Pure function for Valid anagram, as in the lesson: compare the lengths first, then add 1 for
// each letter of s and take 1 away for each letter of t. The player only reads these.

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

function letters(n: number) {
  return n === 1 ? '1 letter' : `${n} letters`
}

function quoted(word: string) {
  return word === '' ? 'an empty word' : `"${word}"`
}

export function anagramFrames(s: string, t: string): AnagramFrame[] {
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
        description: `Compare the lengths first: s, ${quoted(s)}, has ${letters(s.length)} and t, ${quoted(t)}, has ${letters(t.length)}. Different lengths never match. Print no.`,
      }),
    ]
  }

  const same = s.length === 0 ? 's and t are both empty, so the lengths match' : `s, ${quoted(s)}, and t, ${quoted(t)}, both have ${letters(s.length)}`
  const frames = [frame({ pass: 'length', description: `Compare the lengths first: ${same}. Start counting with an empty map.` })]

  for (let i = 0; i < s.length; i++) {
    const letter = s[i]
    const entry = counts.find((e) => e.letter === letter)
    if (entry) entry.count++
    else counts.push({ letter, count: 1 })
    const count = entry ? entry.count : 1
    frames.push(frame({ pass: 's', index: i, changed: letter, description: `Pass 1, position ${i} of s, letter ${letter}: add 1, so ${letter}: ${count}.` }))
  }

  for (let i = 0; i < t.length; i++) {
    const letter = t[i]
    const entry = counts.find((e) => e.letter === letter)
    if (entry) entry.count--
    else counts.push({ letter, count: -1 })
    const count = entry ? entry.count : -1
    const start = `Pass 2, position ${i} of t, letter ${letter}: take 1 away`
    if (count < 0) {
      const why = entry ? `, so ${letter} drops to -1` : `: ${letter} was never counted, so it drops to -1`
      frames.push(
        frame({
          pass: 't',
          index: i,
          changed: letter,
          below: letter,
          output: 'no',
          description: `${start}${why}. A count below 0 means t uses ${letter} more often than s. Print no.`,
        }),
      )
      return frames
    }
    frames.push(frame({ pass: 't', index: i, changed: letter, description: `${start}, so ${letter}: ${count}.` }))
  }

  const done =
    s.length === 0
      ? 'Both words are empty, so there is nothing to count and no count is above or below 0.'
      : 'Every letter of t is taken away and no count went below 0. The lengths are equal, so every count is 0.'
  frames.push(frame({ pass: 'done', output: 'yes', description: `${done} Print yes.` }))
  return frames
}
