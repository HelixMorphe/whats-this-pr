#!/usr/bin/env node
// whats-this-pr: turn a pull request's data into a guided review page.
//   story <story.json> <pr.diff> [-o pr.json]       the PR told as data → pr.json (cuts the diff, places the notes)
//   check <pr.json> <hero.json>                      errors fail (exit 1); warnings are for a look
//   make  <pr.json> <hero.json> [-o page.html]       the page: the template with both files written in
import { readFileSync, writeFileSync } from 'node:fs'

import { check } from '../lib/check.mjs'
import { make } from '../lib/make.mjs'
import { story } from '../lib/story.mjs'

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const USAGE = `whats-this-pr ${version}: a guided review page for a pull request

  whats-this-pr story <story.json> <pr.diff> [-o pr.json]
  whats-this-pr check <pr.json> <hero.json>
  whats-this-pr make  <pr.json> <hero.json> [-o page.html]

story  the PR told as data (steps, hunks, notes) → pr.json, with every hunk placed
check  that pr.json and hero.json are right for this template
make   the page: one self-contained HTML file

Docs: https://github.com/HelixMorphe/whats-this-pr`

const [cmd, ...rest] = process.argv.slice(2)
const out = (() => {
  const i = rest.indexOf('-o')
  return i >= 0 ? rest.splice(i, 2)[1] : undefined
})()
const json = (p) => {
  try {
    return JSON.parse(readFileSync(p, 'utf8'))
  } catch (e) {
    console.error(`can't read ${p}: ${e.message}`)
    process.exit(2)
  }
}
const need = (n) => {
  if (rest.length < n) {
    console.error(USAGE)
    process.exit(2)
  }
}

try {
  switch (cmd) {
    case 'story': {
      need(2)
      const pr = story(json(rest[0]), rest[1])
      const file = out ?? 'pr.json'
      writeFileSync(file, JSON.stringify(pr, null, 1) + '\n')
      console.log(`wrote ${file}: ${pr.steps.length} steps, ${pr.steps.reduce((n, s) => n + s.hunks.length, 0)} hunks, ${pr.mechanical.length} skippable groups`)
      break
    }
    case 'check': {
      need(2)
      const r = check(json(rest[0]), json(rest[1]))
      for (const m of r.warnings) console.log('warn  ' + m)
      for (const m of r.errors) console.log('ERROR ' + m)
      console.log(`${r.errors.length} errors, ${r.warnings.length} warnings · ${r.steps} steps · ${r.cases} hero cases`)
      process.exit(r.errors.length ? 1 : 0)
    }
    case 'make': {
      need(2)
      const pr = json(rest[0])
      const page = make(pr, json(rest[1]))
      const file = out ?? `${String(pr.repo ?? 'pr').split('/').pop()}-${pr.number ?? 'page'}.html`
      writeFileSync(file, page)
      console.log(`wrote ${file} (${(page.length / 1024 / 1024).toFixed(2)} MB)`)
      break
    }
    case '-v':
    case '--version':
      console.log(version)
      break
    default:
      console.log(USAGE)
      process.exit(cmd && cmd !== '-h' && cmd !== '--help' ? 2 : 0)
  }
} catch (e) {
  console.error(e.message)
  process.exit(1)
}
