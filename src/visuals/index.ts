import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

// Lesson slug -> visualization shown on that lesson's page. Each one is lazy-loaded.
export const VISUALS = new Map<string, LazyExoticComponent<ComponentType>>([
  ['sum-of-an-array', lazy(() => import('./ArrayScanVisual').then((m) => ({ default: m.SumVisual })))],
  ['maximum-of-an-array', lazy(() => import('./ArrayScanVisual').then((m) => ({ default: m.MaxVisual })))],
  ['reverse-a-string', lazy(() => import('./TwoPointerVisual').then((m) => ({ default: m.ReverseVisual })))],
  ['check-for-a-palindrome', lazy(() => import('./TwoPointerVisual').then((m) => ({ default: m.PalindromeVisual })))],
  ['balanced-brackets', lazy(() => import('./StackVisual').then((m) => ({ default: m.BracketsVisual })))],
  ['evaluate-a-postfix-expression', lazy(() => import('./StackVisual').then((m) => ({ default: m.PostfixVisual })))],
  ['next-greater-element', lazy(() => import('./StackVisual').then((m) => ({ default: m.NextGreaterVisual })))],
  ['sort-an-array', lazy(() => import('./SortingVisual'))],
  ['binary-search', lazy(() => import('./BinarySearchVisual'))],
])
