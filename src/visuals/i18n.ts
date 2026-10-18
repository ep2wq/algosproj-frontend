import type { TFunction } from 'i18next'
import i18n from '../i18n'
import ar from '../locales/visuals.ar.json'
import en from '../locales/visuals.en.json'

// The visualization strings are their own i18next namespace, "visuals". Every visual imports
// this file, so the strings load with the first visual instead of in the main bundle.
i18n.addResourceBundle('en', 'visuals', en)
i18n.addResourceBundle('ar', 'visuals', ar)

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
