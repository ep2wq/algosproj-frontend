// Keyboard shortcuts that work on the whole site (README "Keyboard shortcuts"): "/" focuses the
// page's search field and "?" opens the shortcuts dialog, both only when focus is not in a text field.

export const OPEN_SHORTCUTS = 'algoslab:shortcuts'

// Marks the page's search field (FilterBar's); "/" focuses it.
export const SEARCH_ATTRIBUTE = 'data-search-input'

// True when typing goes into the target: a text field, a select, a rich editor (contenteditable,
// Monaco).
export function inTextField(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), .monaco-editor') !== null
}

// Ctrl on Windows and Linux, Cmd on Apple devices.
export function isApple(): boolean {
  return typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent)
}
