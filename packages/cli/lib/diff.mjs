// Parses a unified diff (`gh pr diff`) and cuts it into the hunks a step shows, with notes pinned to new-side lines.
// story.mjs drives it from story.json; it can also be imported directly (`whats-this-pr/diff`).
import { readFileSync } from 'node:fs'

export function loadDiff(path) {
  const raw = readFileSync(path, 'utf8')
  // file path -> { head: lines before the first @@, hunks: [lines of each @@ block] }
  const files = {}
  for (const chunk of raw.split(/^(?=diff --git )/m).filter(Boolean)) {
    const lines = chunk.replace(/\n$/, '').split('\n')
    const file = lines[0].match(/ b\/(.+)$/)[1]
    const first = lines.findIndex((l) => l.startsWith('@@'))
    // A pure move or a binary file has no @@ hunks at all.
    const head = first === -1 ? lines : lines.slice(0, first)
    const hunks = []
    if (first !== -1) lines.slice(first).forEach((l) => (l.startsWith('@@') ? hunks.push([l]) : hunks[hunks.length - 1].push(l)))
    const count = (c) => hunks.flat().filter((l) => l[0] === c && !l.startsWith(c.repeat(3))).length
    const from = head.find((l) => l.startsWith('rename from '))?.slice(12)
    files[file] = { head, hunks, add: count('+'), del: count('-'), from, deleted: head.some((l) => l.startsWith('deleted file')) }
  }
  const short = (p) => (p in files ? p : Object.keys(files).find((f) => f.endsWith(p)))
  // The new-side line number of the nth line in `body` containing `match`.
  const lineOf = (body, match, p, nth = 1) => {
    let n = 0
    let seen = 0
    for (const l of body) {
      if (l.startsWith('@@')) {
        n = +l.match(/\+(\d+)/)[1] - 1
        continue
      }
      if (l[0] === '-') continue
      n += 1
      if (l.includes(match) && ++seen === nth) return n
    }
    throw new Error(`${p}: no line ${nth} contains ${match}`)
  }
  // One file's diff, keeping only the chosen hunks (all of them when `which` is omitted). `notes` are
  // [text on the line, explanation, text the arrow points at, nth match] tuples: each lands on the nth new-side line
  // containing the line text (the first by default), and points at `at` within it (the line text when omitted).
  const cut = (p, which, notes = []) => {
    const f = files[short(p)]
    if (!f) throw new Error(`no file ends with ${p}`)
    const keep = which ?? f.hunks.map((_, i) => i)
    const body = keep.flatMap((i) => f.hunks[i])
    return {
      file: short(p),
      isNew: f.head.some((l) => l.startsWith('new file')),
      ...(f.deleted && { isDeleted: true }),
      patch: [...f.head, ...body].join('\n') + '\n',
      notes: notes.map(([match, text, at = match, nth = 1]) => ({ line: lineOf(body, match, p, nth), at, text })),
    }
  }
  // Files a reviewer only needs to know about, not read (lockfiles, moves, docs): listed in a group, no diff shown.
  // `match` picks them: a list of path suffixes, or a predicate over { file, hunks, from, deleted }.
  const taken = new Set()
  const mechanical = (kind, why, match) => {
    const pick = typeof match === 'function' ? match : (f) => match.some((m) => f.file.endsWith(m))
    const list = Object.entries(files)
      .map(([file, f]) => ({ file, ...f }))
      .filter((f) => !taken.has(f.file) && pick(f))
    if (!list.length) throw new Error(`mechanical "${kind}" matched no files`)
    list.forEach((f) => taken.add(f.file))
    return { kind, why, files: list.map(({ file, add, del, from, deleted }) => ({ file, add, del, ...(from && { from }), ...(deleted && { deleted }) })) }
  }
  // Every file of the PR must land somewhere: each hunk in exactly one step, or the whole file in a mechanical group.
  const checkPlaced = (steps, groups = []) => {
    const used = new Map()
    steps.forEach((s) => s.hunks.forEach((h) => used.set(h.file, (used.get(h.file) ?? 0) + h.patch.split('\n').filter((l) => l.startsWith('@@')).length)))
    const listed = new Set(groups.flatMap((g) => g.files.map((f) => f.file)))
    for (const [f, { hunks }] of Object.entries(files)) {
      if (listed.has(f)) {
        if (used.has(f)) throw new Error(`${f}: both in a step and in a mechanical group`)
        continue
      }
      if (used.get(f) !== hunks.length) throw new Error(`${f}: ${used.get(f) ?? 0} of ${hunks.length} hunks placed`)
    }
  }
  return { cut, mechanical, checkPlaced, files }
}
