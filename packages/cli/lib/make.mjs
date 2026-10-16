// A page: the template with the PR and its hero written in as data. The template is the whole review app, built once
// with no PR in it, and shipped in this package; nothing is rebuilt per PR.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const TEMPLATE = join(dirname(fileURLToPath(import.meta.url)), '../template.html')

// JSON inside a <script> block: escaping `<` keeps a `</script>` in a diff from closing it, and U+FFFD is escaped
// because some hosts refuse it. Both escapes read back as the same characters.
const block = (id, data) =>
  `<script type="application/json" id="${id}">${JSON.stringify(data).replaceAll('<', '\\u003c').replaceAll('\uFFFD', '\\uFFFD')}</script>`
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c])

export function make(pr, hero, template = readFileSync(TEMPLATE, 'utf8')) {
  // The title first: some hosts only scan the start of the file for it. A name, not a summary.
  return [`<title>${esc(`${pr.repo} #${pr.number}`)}</title>`, block('pr-data', pr), block('pr-hero', hero), template].join('\n') + '\n'
}
