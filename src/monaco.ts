import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import 'monaco-editor/esm/vs/editor/edcore.main.js'
import 'monaco-editor/esm/vs/basic-languages/cpp/cpp.contribution.js'
import 'monaco-editor/esm/vs/basic-languages/java/java.contribution.js'
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution.js'
import 'monaco-editor/esm/vs/basic-languages/python/python.contribution.js'
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'

// Monaco from our own bundle instead of jsDelivr (the version the CDN loader used, 0.55.1, pinned in
// package.json). edcore.main is the editor with all its editor features but no languages; then the
// syntax colouring of the sandbox's four languages and the editor worker. No language services
// (TypeScript, JSON, CSS, HTML workers), so JavaScript gets no type-aware suggestions or error
// squiggles. ProblemSolver lazy-loads this file and hands it to @monaco-editor/react, so the page shows
// before the editor's code arrives. Nothing here imports React, so React stays out of this chunk.
self.MonacoEnvironment = { getWorker: () => new EditorWorker() }

export { monaco }
