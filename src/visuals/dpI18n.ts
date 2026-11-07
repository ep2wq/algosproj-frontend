import type { TFunction } from 'i18next'
import { addNamespace } from '../i18n'
import { loadVisualStrings } from './i18n'

// The dynamic programming visuals' strings are their own namespace, "dp", so they load with those
// visuals only and not with every visual (the landing card loads the shared "visuals" strings), in
// the page's language only, like "visuals": the DP entries in index.ts pass loadDpStrings to lazyVisual.
// The DP visuals translate with useTranslation(DP_NS, { nsMode: 'fallback' }): a key missing from
// "dp" (common.*) is looked up in "visuals".
export function loadDpStrings(): Promise<unknown> {
  return Promise.all([
    loadVisualStrings(),
    addNamespace('dp', (language) => (language === 'ar' ? import('../locales/visuals-dp.ar.json') : import('../locales/visuals-dp.en.json'))),
  ])
}

export const DP_NS = ['dp', 'visuals'] as const

export type DpT = TFunction<typeof DP_NS>
