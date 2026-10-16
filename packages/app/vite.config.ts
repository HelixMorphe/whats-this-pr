import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `--mode artifact` (scripts/build-template.mjs) builds the artifact template: the app as a single self-contained HTML
// file, every script, style and font inlined, with no PR in it (its page reads the PR from the document, page.ts).
// Inlining means nothing loads lazily, so the template keeps a fixed set of syntax grammars (src/artifact/shiki.ts)
// and none of Shiki's own themes or its WebAssembly engine.
const src = (p: string) => path.resolve(import.meta.dirname, './src', p)

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), ...(mode === 'artifact' ? [viteSingleFile()] : [])],
  resolve: {
    alias: [
      ...(mode === 'artifact'
        ? [
            { find: '@/data/pages', replacement: src('artifact/page.ts') },
            { find: /^shiki$/, replacement: src('artifact/shiki.ts') },
            { find: /^shiki\/wasm$/, replacement: src('artifact/empty.ts') },
            { find: /^@shikijs\/themes\/.+$/, replacement: src('artifact/empty.ts') },
          ]
        : []),
      { find: '@', replacement: src('') },
    ],
  },
}))
