// Builds every example's page with the CLI, the way the skill does: story → check → make. Pages land in dist/examples/,
// with an index.html listing them (the GitHub Pages site).
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const bin = 'packages/cli/bin/whats-this-pr.mjs'
const ex = 'plugins/whats-this-pr/skills/whats-this-pr/examples'
const out = 'dist/examples'
mkdirSync(out, { recursive: true })
const pages = []
for (const name of readdirSync(ex).filter((f) => f.endsWith('.story.json')).map((f) => f.replace('.story.json', ''))) {
  const pr = join(out, `${name}.pr.json`)
  const run = (...args) => execFileSync('node', [bin, ...args], { stdio: ['ignore', 'pipe', 'inherit'] }).toString().trim().split('\n').pop()
  run('story', join(ex, `${name}.story.json`), join('examples', name, 'pr.diff'), '-o', pr)
  const checked = run('check', pr, join(ex, `${name}.hero.json`))
  run('make', pr, join(ex, `${name}.hero.json`), '-o', join(out, `${name}.html`))
  pages.push({ name, ...JSON.parse(readFileSync(pr, 'utf8')) })
  console.log(`${name.padEnd(16)} ${checked} → ${out}/${name}.html`)
}

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const rows = pages
  .map((p) => `<li><a class="page" href="${p.name}.html"><span class="repo">${esc(p.repo)} #${p.number}</span><span class="title">${esc(p.title)}</span><span class="stat"><b class="add">+${p.add}</b> <b class="del">−${p.del}</b></span></a><a class="gh" href="${esc(p.url)}">PR ↗</a></li>`)
  .join('\n')
writeFileSync(
  join(out, 'index.html'),
  `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>What's this PR? Examples</title>
<meta name="description" content="Guided review pages for real pull requests, made by the whats-this-pr skill.">
<style>
:root { --bg: #fbfbfa; --ink: #18181b; --muted: #71717a; --line: #e4e4e7; --card: #fff; --add: #15803d; --del: #b91c1c; color-scheme: light; }
@media (prefers-color-scheme: dark) { :root { --bg: #0c0c0e; --ink: #f4f4f5; --muted: #a1a1aa; --line: #27272a; --card: #141417; --add: #4ade80; --del: #f87171; color-scheme: dark; } }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink); font: 15px/1.5 Inter, ui-sans-serif, system-ui, sans-serif; padding: 64px 16px; }
main { max-width: 720px; margin: 0 auto; }
h1 { font-size: 28px; letter-spacing: -0.02em; margin: 0 0 8px; }
p { color: var(--muted); margin: 0 0 32px; }
code { font: 13px ui-monospace, 'Geist Mono', monospace; background: var(--card); border: 1px solid var(--line); border-radius: 6px; padding: 2px 6px; }
ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
li { display: flex; gap: 8px; align-items: stretch; }
a { color: inherit; text-decoration: none; }
.page { flex: 1; min-width: 0; display: grid; grid-template-columns: 1fr auto; gap: 2px 16px; padding: 14px 16px; background: var(--card); border: 1px solid var(--line); border-radius: 12px; }
.page:hover, .gh:hover { border-color: var(--muted); }
.repo { font: 12px ui-monospace, 'Geist Mono', monospace; color: var(--muted); }
.title { grid-column: 1; font-weight: 500; }
.stat { grid-row: 1 / 3; grid-column: 2; align-self: center; font: 12px ui-monospace, monospace; font-variant-numeric: tabular-nums; }
.add { color: var(--add); font-weight: 500; } .del { color: var(--del); font-weight: 500; }
.gh { display: flex; align-items: center; padding: 0 14px; border: 1px solid var(--line); border-radius: 12px; font-size: 13px; color: var(--muted); white-space: nowrap; }
footer { margin-top: 40px; color: var(--muted); font-size: 13px; }
footer a { text-decoration: underline; }
</style>
</head>
<body>
<main>
<h1>What's this PR?</h1>
<p>Guided review pages for real pull requests, each one self-contained HTML made by the skill. Install it in Claude Code with <code>/plugin marketplace add HelixMorphe/whats-this-pr</code>.</p>
<ul>
${rows}
</ul>
<footer><a href="https://github.com/HelixMorphe/whats-this-pr">github.com/HelixMorphe/whats-this-pr</a> · MIT</footer>
</main>
</body>
</html>
`,
)
console.log(`index            ${pages.length} pages → ${out}/index.html`)
