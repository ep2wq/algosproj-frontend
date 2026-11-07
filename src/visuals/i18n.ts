import type { TFunction } from 'i18next'
import { lazy, type ComponentType } from 'react'
import { addNamespace } from '../i18n'

// The visualization strings are their own i18next namespace, "visuals", in the page's language only
// (src/i18n.ts loads the other one before the language changes). They load with the first visual:
// every visual is lazyVisual, which loads its code and its strings side by side and renders when both
// are in, so no key ever shows.
export function loadVisualStrings(): Promise<void> {
  return addNamespace('visuals', (language) => (language === 'ar' ? import('../locales/visuals.ar.json') : import('../locales/visuals.en.json')))
}

// The same type as React's lazy.
export function lazyVisual<C extends ComponentType<any>>(load: () => Promise<{ default: C }>, strings: () => Promise<unknown> = loadVisualStrings) {
  return lazy(() => Promise.all([load(), strings()]).then(([module]) => module))
}

// The frame functions take the translate function as their last argument, so they stay pure:
// the same input and language always give the same frames.
export type T = TFunction<'visuals'>

// A value inside a sentence: as it is in English, `inline code` in Arabic (left to right).
export function value(t: T, item: string | number): string {
  return t('common.value', { value: item })
}

// "1, 2 and 3" in the current language.
export function joinAnd(t: T, items: (string | number)[]): string {
  if (items.length <= 1) return items.join('')
  return t('common.joinAnd', { items: items.slice(0, -1).join(t('common.listSeparator')), last: items[items.length - 1] })
}
