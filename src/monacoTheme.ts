import type * as Monaco from 'monaco-editor/esm/vs/editor/editor.api.js'

// Monaco's own vs / vs-dark themes ignore our tokens, so the editor gets two themes built from the
// CSS variables in src/index.css. Monaco needs hex, not var(), so the values are read from :root at
// runtime. :root only holds the current mode's values, so defineMonacoThemes defines the theme of the
// mode in effect; call it again (then setTheme) after the user toggles light/dark.
export const MONACO_LIGHT = 'algoslab-light'
export const MONACO_DARK = 'algoslab-dark'

export function monacoThemeName(dark: boolean) {
  return dark ? MONACO_DARK : MONACO_LIGHT
}

// A token as 6 hex digits without the #, or the fallback when the page has no such variable (SSR).
function read(styles: CSSStyleDeclaration | null, name: string, fallback: string) {
  const value = styles?.getPropertyValue(name).trim() ?? ''
  return /^#[0-9a-f]{6}$/i.test(value) ? value.slice(1) : fallback
}

// Mix two 6-digit hex colours: `amount` of b into a.
function mix(a: string, b: string, amount: number) {
  let out = ''
  for (let i = 0; i < 6; i += 2) {
    const from = parseInt(a.slice(i, i + 2), 16)
    const to = parseInt(b.slice(i, i + 2), 16)
    out += Math.round(from + (to - from) * amount).toString(16).padStart(2, '0')
  }
  return out
}

// Hex with alpha, as Monaco wants it (#rrggbbaa).
function alpha(color: string, opacity: number) {
  return `#${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`
}

export function defineMonacoThemes(monaco: typeof Monaco, dark: boolean) {
  const styles = typeof document === 'undefined' ? null : getComputedStyle(document.documentElement)
  const code = read(styles, '--color-code', dark ? '0b0f19' : 'bdbdbd')
  const ink = read(styles, '--color-ink', dark ? 'f8fafc' : '0a0a0a')
  const muted = read(styles, '--color-muted', dark ? '94a3b8' : '2e2e2e')
  const surface = read(styles, '--color-surface', dark ? '0f172a' : 'c8c8c8')
  const line = read(styles, '--color-line', dark ? '1e293b' : '9c9c9c')
  const accent = read(styles, '--color-accent', dark ? '10b981' : '065f46')
  const keyword = read(styles, '--color-syntax-keyword', dark ? 'c4b5fd' : '46198a')
  const func = read(styles, '--color-syntax-function', dark ? '7dd3fc' : '02405f')
  const number = read(styles, '--color-syntax-number', dark ? 'fcd34d' : '6f2f04')
  const string = read(styles, '--color-syntax-string', dark ? 'f9a8d4' : '7d0d40')
  const comment = read(styles, '--color-syntax-comment', dark ? '8391a7' : '3d3d3d')
  const operator = read(styles, '--color-syntax-operator', dark ? '94a3b8' : '2e2e2e')

  monaco.editor.defineTheme(monacoThemeName(dark), {
    base: dark ? 'vs-dark' : 'vs',
    inherit: true,
    rules: [
      { token: '', foreground: ink, background: code },
      { token: 'keyword', foreground: keyword },
      { token: 'keyword.control', foreground: keyword },
      { token: 'identifier', foreground: ink },
      { token: 'type', foreground: func },
      { token: 'type.identifier', foreground: func },
      { token: 'number', foreground: number },
      { token: 'number.float', foreground: number },
      { token: 'number.hex', foreground: number },
      { token: 'string', foreground: string },
      { token: 'string.escape', foreground: string },
      { token: 'comment', foreground: comment },
      { token: 'delimiter', foreground: operator },
      { token: 'operator', foreground: operator },
      { token: 'annotation', foreground: func },
      { token: 'predefined', foreground: func },
    ],
    colors: {
      'editor.background': `#${code}`,
      'editor.foreground': `#${ink}`,
      'editorLineNumber.foreground': `#${muted}`,
      'editorLineNumber.activeForeground': `#${ink}`,
      'editor.lineHighlightBackground': `#${mix(code, ink, 0.07)}`,
      'editor.lineHighlightBorder': '#00000000',
      'editor.selectionBackground': alpha(accent, 0.3),
      'editor.inactiveSelectionBackground': alpha(accent, 0.15),
      'editorCursor.foreground': `#${ink}`,
      'editorGutter.background': `#${code}`,
      'editorIndentGuide.background1': alpha(muted, 0.25),
      'editorIndentGuide.activeBackground1': alpha(muted, 0.5),
      'editorWidget.background': `#${surface}`,
      'editorWidget.border': `#${line}`,
      'editorWidget.foreground': `#${ink}`,
      'editorSuggestWidget.background': `#${surface}`,
      'editorSuggestWidget.border': `#${line}`,
      'editorSuggestWidget.foreground': `#${ink}`,
      'editorSuggestWidget.selectedBackground': `#${mix(surface, ink, 0.12)}`,
      'editorSuggestWidget.highlightForeground': `#${dark ? accent : read(styles, '--color-accent-text', '043d2d')}`,
      'editorHoverWidget.background': `#${surface}`,
      'editorHoverWidget.border': `#${line}`,
      // Bracket pair colours (Monaco's defaults are yellow, pink and blue, low contrast on gray).
      'editorBracketHighlight.foreground1': `#${keyword}`,
      'editorBracketHighlight.foreground2': `#${func}`,
      'editorBracketHighlight.foreground3': `#${number}`,
      'editorBracketHighlight.foreground4': `#${string}`,
      'editorBracketHighlight.foreground5': `#${operator}`,
      'editorBracketHighlight.foreground6': `#${comment}`,
      'editorBracketHighlight.unexpectedBracket.foreground': `#${string}`,
      'list.hoverBackground': `#${mix(surface, ink, 0.08)}`,
      'scrollbarSlider.background': alpha(muted, 0.3),
      'scrollbarSlider.hoverBackground': alpha(muted, 0.5),
      'scrollbarSlider.activeBackground': alpha(muted, 0.65),
    },
  })
}
