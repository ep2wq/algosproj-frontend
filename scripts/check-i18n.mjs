// Checks the translation files; prints nothing and exits 0 when they are fine (npm run check:i18n).
// - en.json and ar.json have the same keys, except admin.*, which ar.json leaves out (the admin
//   area is English); visuals.en.json and visuals.ar.json have the same keys.
// - A count key has _one and _other in English and all six Arabic forms.
// - Every key the code uses with t('...') exists in English (files under src/visuals use the
//   visuals namespace). ${...} in a t(`...`) key matches any part of a key.
// - No English string has a ~ (the ~term~ marker is for Arabic only), except the admin hint
//   that explains the marker.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const PLURALS = { en: ['one', 'other'], ar: ['zero', 'one', 'two', 'few', 'many', 'other'] }
const PLURAL = /_(zero|one|two|few|many|other)$/
const TILDE_ALLOWED = new Set(['admin.lesson.termsHint', 'admin.lesson.termsExample'])
const errors = []

function load(name) {
  return JSON.parse(readFileSync(new URL(`../src/locales/${name}`, import.meta.url), 'utf8'))
}

// Flattens nested keys to "a.b.c" -> string.
function flatten(object, prefix = '', out = new Map()) {
  for (const [key, value] of Object.entries(object)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value !== null && typeof value === 'object') flatten(value, path, out)
    else out.set(path, value)
  }
  return out
}

// Keys without plural endings, and the plural forms each one has.
function baseKeys(flat) {
  const bases = new Map()
  for (const key of flat.keys()) {
    const match = key.match(PLURAL)
    const base = match ? key.slice(0, -match[0].length) : key
    if (!bases.has(base)) bases.set(base, new Set())
    if (match) bases.get(base).add(match[1])
  }
  return bases
}

function compare(enName, arName, skip) {
  const en = baseKeys(flatten(load(enName)))
  const ar = baseKeys(flatten(load(arName)))
  for (const [key, forms] of en) {
    if (skip(key)) continue
    if (!ar.has(key)) errors.push(`${arName}: missing ${key}`)
    else if (forms.size > 0) {
      for (const form of PLURALS.en) if (!forms.has(form)) errors.push(`${enName}: missing ${key}_${form}`)
      for (const form of PLURALS.ar) if (!ar.get(key).has(form)) errors.push(`${arName}: missing ${key}_${form}`)
    }
  }
  for (const key of ar.keys()) if (!en.has(key)) errors.push(`${arName}: ${key} is not in ${enName}`)
  return en
}

const isAdmin = (key) => key === 'admin' || key.startsWith('admin.')
const main = compare('en.json', 'ar.json', (key) => isAdmin(key))
const visuals = compare('visuals.en.json', 'visuals.ar.json', () => false)

for (const [name, flat] of [['en.json', flatten(load('en.json'))], ['visuals.en.json', flatten(load('visuals.en.json'))]]) {
  for (const [key, value] of flat) {
    if (typeof value === 'string' && value.includes('~') && !TILDE_ALLOWED.has(key)) errors.push(`${name}: ${key} has a ~`)
  }
}

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? files(path) : /\.tsx?$/.test(name) ? [path] : []
  })
}

const src = new URL('../src', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
for (const file of files(src)) {
  const keys = file.replace(/\\/g, '/').includes('/src/visuals/') ? visuals : main
  const text = readFileSync(file, 'utf8')
  for (const [, quote, key] of text.matchAll(/\bt\(\s*(['"`])([^'"`]+)\1/g)) {
    const escape = (part) => part.replace(/[.*+?^$()[\]{}|\\]/g, '\\$&')
    const pattern = quote === '`' ? new RegExp(`^${key.split(/\$\{[^}]*\}/).map(escape).join('[^.]+')}$`) : null
    const found = pattern ? [...keys.keys()].some((base) => pattern.test(base)) : keys.has(key)
    if (!found) errors.push(`${file.slice(src.length + 1)}: t('${key}') is not in English`)
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'))
  process.exit(1)
}
