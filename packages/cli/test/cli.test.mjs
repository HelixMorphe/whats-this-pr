// The examples are the fixtures: every one must build, check clean and make a page.
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'

import { check, make, story } from '../lib/index.mjs'

const root = new URL('../../../', import.meta.url).pathname
const skill = join(root, 'plugins/whats-this-pr/skills/whats-this-pr/examples')
const names = readdirSync(skill).filter((f) => f.endsWith('.story.json')).map((f) => f.replace('.story.json', ''))
const read = (p) => JSON.parse(readFileSync(p, 'utf8'))

test('there are examples', () => assert.ok(names.length >= 6))

for (const name of names) {
  test(`${name}: story → pr.json, check is clean, make writes the page`, () => {
    const pr = story(read(join(skill, `${name}.story.json`)), join(root, 'examples', name, 'pr.diff'))
    assert.ok(pr.steps.length > 0)
    assert.match(pr.url, /^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+$/)
    const hero = read(join(skill, `${name}.hero.json`))
    const r = check(pr, hero)
    assert.deepEqual(r.errors, [], r.errors.join('\n'))
    assert.deepEqual(r.warnings, [], r.warnings.join('\n'))
    const page = make(pr, hero, '<!-- template -->')
    assert.ok(page.startsWith(`<title>${pr.repo} #${pr.number}</title>`))
    assert.ok(page.endsWith('<!-- template -->\n'))
  })
}

test('story fails when a hunk is left out', () => {
  const name = names[0]
  const s = read(join(skill, `${name}.story.json`))
  s.steps = s.steps.slice(0, 1)
  assert.throws(() => story(s, join(root, 'examples', name, 'pr.diff')), /hunks placed|both in a step/)
})

test('a note whose line is not in the diff fails, naming it', () => {
  const name = names[0]
  const s = read(join(skill, `${name}.story.json`))
  s.steps[0].hunks[0].notes = [['this text is in no line', 'x']]
  assert.throws(() => story(s, join(root, 'examples', name, 'pr.diff')), /no line 1 contains this text is in no line/)
})

test('make escapes </script> inside the data', () => {
  const page = make({ repo: 'a/b', number: 1, steps: [{ why: '</script><b>' }] }, { title: 't' }, '')
  assert.ok(!page.includes('</script><b>'))
  assert.ok(page.includes('\\u003c/script>\\u003cb>'))
})
