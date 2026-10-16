// Builds the artifact template: the whole app as one self-contained HTML file, with no PR in it.
//   node scripts/build-template.mjs    →  dist-template/template.html
// A page is the template plus two JSON blocks, the PR and its hero (scripts/make-page.mjs); nothing is rebuilt per PR.
// The artifact host wraps the file in its own <!doctype>/<head>/<body>, so the output keeps only what goes inside.
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { bundledLanguagesInfo } from 'shiki'

// A fixed set of syntax grammars, under every name @pierre/diffs may ask for (it uses Shiki's aliases, e.g. tf, zsh).
// A file in any other language shows as plain text. Each grammar costs page size, so the list stays short.
export const LANGS = [
  'typescript', 'tsx', 'javascript', 'jsx', 'json', 'jsonc', 'yaml', 'toml', 'markdown', 'css', 'scss', 'html',
  'shellscript', 'python', 'go', 'rust', 'java', 'kotlin', 'sql', 'graphql', 'docker', 'hcl', 'terraform', 'ruby',
  'xml', 'ini', 'dotenv',
]
const info = Object.fromEntries(bundledLanguagesInfo.map((l) => [l.id, l]))
const names = LANGS.flatMap((id) => {
  if (!info[id]) throw new Error(`no Shiki grammar ${id}`)
  return [id, ...(info[id].aliases ?? [])].map((n) => [n, id])
})
writeFileSync(
  'src/artifact/langs.gen.ts',
  `// Written by scripts/build-template.mjs: the syntax grammars the template carries.
export const languages = {
${names.map(([n, id]) => `  '${n}': () => import('shiki/dist/langs/${id}.mjs'),`).join('\n')}
}
`,
)

const outDir = 'dist-template/build'
execFileSync('npx', ['vite', 'build', '--mode', 'artifact', '--outDir', outDir, '--emptyOutDir'], { stdio: 'inherit' })

const html = readFileSync(join(outDir, 'index.html'), 'utf8')
// The document's own head and body are the last ones: the inlined script carries strings that contain those words too.
const head = html.slice(html.indexOf('<head>') + 6, html.lastIndexOf('</head>'))
const body = html.slice(html.lastIndexOf('<body>') + 6, html.lastIndexOf('</body>'))
const template = (head + body)
  .replace(/<meta charset[^>]*>|<meta name="viewport"[^>]*>|<link rel="icon"[^>]*>/g, '')
  .replace(/<title>[\s\S]*?<\/title>/, '')
  // Shiki's grammars carry a literal U+FFFD inside JS strings, which the artifact publisher refuses; the escape is the
  // same character at runtime.
  .replaceAll('\uFFFD', '\\uFFFD')
  .trim()
mkdirSync('dist-template', { recursive: true })
writeFileSync('dist-template/template.html', template + '\n')
console.log(`wrote dist-template/template.html (${(template.length / 1024 / 1024).toFixed(2)} MB, ${LANGS.length} grammars)`)
