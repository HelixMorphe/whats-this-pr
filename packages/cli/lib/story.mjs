// story.json + pr.diff → pr.json. story.json is the PR told as data: its steps in reading order, which hunks of which
// files each step shows, and notes pinned to lines by their text. This cuts the diff, places every note on its line,
// fills in the counts, and fails unless every hunk lands in exactly one step or a skippable group.
import { loadDiff } from './diff.mjs'

const fail = (m) => {
  throw new Error(`story.json: ${m}`)
}

// A note is [lineText, note, at?, nth?], or { line, note, at?, nth? } for the same thing by name.
const asTuple = (n, where) => {
  if (Array.isArray(n)) return n
  if (n && typeof n === 'object' && typeof n.line === 'string' && typeof n.note === 'string') return [n.line, n.note, n.at, n.nth]
  fail(`${where}: a note is [lineText, note, at?, nth?] or { line, note, at?, nth? }`)
}

export function story(story, diffPath) {
  const { cut, mechanical, checkPlaced, files } = loadDiff(diffPath)
  const steps = (story.steps ?? []).map((s, i) => {
    const where = `step ${i + 1}`
    if (!Array.isArray(s.hunks) || !s.hunks.length) fail(`${where}: needs hunks`)
    return {
      n: i + 1,
      title: s.title,
      why: s.why,
      consequence: s.consequence,
      spotlights: s.spotlights ?? [],
      hunks: s.hunks.map((h, j) => {
        if (typeof h.file !== 'string') fail(`${where} hunk ${j + 1}: needs file (a path, or any unique ending of one)`)
        return cut(h.file, h.hunks, (h.notes ?? []).map((n) => asTuple(n, `${where} ${h.file}`)))
      }),
    }
  })
  const groups = (story.mechanical ?? []).map((g) => {
    if (!Array.isArray(g.files) || !g.files.length) fail(`mechanical "${g.kind}": needs files (path endings)`)
    return mechanical(g.kind, g.why, g.files)
  })
  checkPlaced(steps, groups)

  // The counts come from the diff unless story.json says otherwise.
  const all = Object.values(files)
  const pr = {
    repo: story.repo,
    number: story.number,
    url: story.url ?? (story.repo && story.number ? `https://github.com/${story.repo}/pull/${story.number}` : undefined),
    title: story.title,
    author: story.author,
    agent: story.agent ?? 'Unknown',
    files: story.files ?? all.length,
    add: story.add ?? all.reduce((n, f) => n + f.add, 0),
    del: story.del ?? all.reduce((n, f) => n + f.del, 0),
    ...(story.ticket && { ticket: story.ticket }),
    spotlights: story.spotlights ?? [],
    steps,
    mechanical: groups,
  }
  return pr
}
