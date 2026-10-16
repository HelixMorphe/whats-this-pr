// Builds every example's page with the CLI, the way the skill does: story → check → make. Pages land in dist/examples/.
import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const bin = 'packages/cli/bin/whats-this-pr.mjs'
const ex = 'plugins/whats-this-pr/skills/whats-this-pr/examples'
const out = 'dist/examples'
mkdirSync(out, { recursive: true })
for (const name of readdirSync(ex).filter((f) => f.endsWith('.story.json')).map((f) => f.replace('.story.json', ''))) {
  const pr = join(out, `${name}.pr.json`)
  const run = (...args) => execFileSync('node', [bin, ...args], { stdio: ['ignore', 'pipe', 'inherit'] }).toString().trim().split('\n').pop()
  run('story', join(ex, `${name}.story.json`), join('examples', name, 'pr.diff'), '-o', pr)
  const checked = run('check', pr, join(ex, `${name}.hero.json`))
  run('make', pr, join(ex, `${name}.hero.json`), '-o', join(out, `${name}.html`))
  console.log(`${name.padEnd(16)} ${checked} → ${out}/${name}.html`)
}
