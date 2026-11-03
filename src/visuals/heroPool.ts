import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

// The visuals the landing page's card picks from, one at random per page view. Each is the lesson's
// own visual with a fixed demo input, playing once by itself; only the chosen one's code is loaded.
// Every one fits the card's height in LandingPage (HERO_HEIGHT) at every width, in English and
// Arabic, at every step: check that before adding one. The line under it is landing.visualFrom.<slug>.
type Demo = LazyExoticComponent<ComponentType<{ demo: unknown }>>

function entry<D>(slug: string, demo: D, load: () => Promise<{ default: ComponentType<{ demo: D }> }>) {
  return { slug, demo, Visual: lazy(load) as unknown as Demo }
}

export const HERO_POOL = [
  entry('binary-search', { array: [3, 8, 15, 21, 27, 34, 42, 56, 63, 78], target: 42 }, () => import('./AutoSearchVisual').then((m) => ({ default: m.HeroSearch }))),
  entry('check-for-a-palindrome', 'level', () => import('./TwoPointerVisual').then((m) => ({ default: m.PalindromeVisual }))),
  entry('reverse-a-string', 'hello', () => import('./TwoPointerVisual').then((m) => ({ default: m.ReverseVisual }))),
  entry('sum-of-an-array', [3, 8, 2, 6, 4], () => import('./ArrayScanVisual').then((m) => ({ default: m.SumVisual }))),
  entry('maximum-of-an-array', [4, 9, 2, 7, 5], () => import('./ArrayScanVisual').then((m) => ({ default: m.MaxVisual }))),
]
