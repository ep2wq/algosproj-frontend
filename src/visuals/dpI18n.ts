import type { TFunction } from 'i18next'
import i18n from '../i18n'
import './i18n'
import ar from '../locales/visuals-dp.ar.json'
import en from '../locales/visuals-dp.en.json'

// The dynamic programming visuals' strings are their own namespace, "dp", so they load with those
// visuals only and not with every visual (the landing card loads the shared "visuals" strings).
// The DP visuals translate with useTranslation(DP_NS, { nsMode: 'fallback' }): a key missing from
// "dp" (common.*) is looked up in "visuals".
i18n.addResourceBundle('en', 'dp', en)
i18n.addResourceBundle('ar', 'dp', ar)

export const DP_NS = ['dp', 'visuals'] as const

export type DpT = TFunction<typeof DP_NS>
