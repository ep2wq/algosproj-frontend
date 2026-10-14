import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

// Lesson slug -> visualization shown on that lesson's page. Each one is lazy-loaded.
export const VISUALS = new Map<string, LazyExoticComponent<ComponentType>>([
  ['sort-an-array', lazy(() => import('./SortingVisual'))],
  ['binary-search', lazy(() => import('./BinarySearchVisual'))],
])
