// Artifact builds only (vite.config.ts aliases `shiki` here): the same exports @pierre/diffs uses from `shiki`, but
// with only the languages this page's files need (langs.gen.ts, written by scripts/build-artifact.mjs) instead of all
// ~230 grammars, which would be inlined into the single-file page.
import { createBundledHighlighter, createCssVariablesTheme, createSingletonShorthands, getTokenStyleObject, stringifyTokenStyle } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import { createOnigurumaEngine } from 'shiki/engine/oniguruma'

import { languages } from './langs.gen'

export const bundledLanguages = languages
export const createHighlighter = createBundledHighlighter({ langs: languages, themes: {}, engine: () => createJavaScriptRegexEngine() })
export const { codeToHtml } = createSingletonShorthands(createHighlighter)
export { createCssVariablesTheme, createJavaScriptRegexEngine, createOnigurumaEngine, getTokenStyleObject, stringifyTokenStyle }
