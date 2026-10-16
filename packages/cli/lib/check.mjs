// Checks a page's two data files against what the template reads: errors mean the page would be wrong or broken,
// warnings are for a look. It checks the shape, that every rule points at something that exists, that every
// combination of the hero's inputs shows something, the colours, the participants' order, and the diagram's geometry.
export function check(pr, hero) {
  const errors = [], warnings = []
  const err = (m) => errors.push(m), warn = (m) => warnings.push(m)
  const isStr = (v) => typeof v === 'string' && v.length > 0

  // ── pr.json ──────────────────────────────────────────────────────────────────────────────────────────────────────
  for (const k of ['repo', 'title', 'author', 'agent']) if (!isStr(pr[k])) err(`pr.${k}: missing`)
  if (isStr(pr.repo) && !pr.repo.includes('/')) warn(`pr.repo: "${pr.repo}" should be owner/repo; the header shows it as the PR's link`)
  if (!isStr(pr.url)) warn('pr.url: missing; the header links to github.com/<repo>/pull/<number> instead')
  for (const k of ['number', 'files', 'add', 'del']) if (typeof pr[k] !== 'number') err(`pr.${k}: not a number`)
  if (!Array.isArray(pr.steps) || !pr.steps.length) err('pr.steps: none')
  const spotIds = new Set((pr.spotlights ?? []).map((s) => s.id))
  for (const s of pr.spotlights ?? []) {
    if (!isStr(s.id) || !isStr(s.label) || !isStr(s.why)) err(`spotlight ${s.id}: needs id, label, why`)
    if (!pr.steps?.some((st) => st.n === s.step)) err(`spotlight ${s.id}: step ${s.step} does not exist`)
  }
  for (const [i, s] of (pr.steps ?? []).entries()) {
    const at = `step ${s.n ?? i + 1}`
    if (s.n !== i + 1) err(`${at}: n should be ${i + 1}`)
    for (const k of ['title', 'why', 'consequence']) if (!isStr(s[k])) err(`${at}: ${k} missing`)
    for (const id of s.spotlights ?? []) if (!spotIds.has(id)) err(`${at}: spotlight ${id} is not in pr.spotlights`)
    if (!s.hunks?.length) err(`${at}: no hunks`)
    for (const h of s.hunks ?? []) {
      if (!isStr(h.file) || !isStr(h.patch)) err(`${at}: a hunk without file or patch`)
      for (const n of h.notes ?? []) {
        if (typeof n.line !== 'number' || !isStr(n.text) || !isStr(n.at)) err(`${at} ${h.file}: a note needs line, at, text`)
        else if (n.text.split(/\s+/).length > 8) warn(`${at} ${h.file}:${n.line}: note over 8 words: "${n.text}"`)
      }
    }
    if (s.title && s.title.length > 70) warn(`${at}: title over 70 characters`)
  }
  if ((pr.steps?.length ?? 0) > 7) warn(`pr.steps: ${pr.steps.length} steps; more than 7 is hard to follow`)
  for (const g of pr.mechanical ?? []) if (!isStr(g.kind) || !isStr(g.why) || !g.files?.length) err(`mechanical ${g.kind}: needs kind, why, files`)

  // ── hero.json ────────────────────────────────────────────────────────────────────────────────────────────────────
  const d = hero.diagram ?? {}
  if (hero.version !== 1) err('hero.version: must be 1')
  if (!isStr(hero.title)) err('hero.title: missing')
  else if (hero.title.length > 80) warn(`hero.title: ${hero.title.length} characters; aim for under ~70`)
  for (const k of ['top', 'end']) if (typeof d[k] !== 'number') err(`diagram.${k}: not a number`)
  if (!d.view?.w || !d.view?.h) err('diagram.view: needs w and h')
  if (!isStr(d.label)) err('diagram.label: missing (it is what a screen reader hears)')
  const P = Object.fromEntries((d.participants ?? []).map((p) => [p.id, p]))
  const M = Object.fromEntries((d.messages ?? []).map((m) => [m.id, m]))
  if (Object.keys(P).length !== (d.participants ?? []).length) err('diagram.participants: duplicate ids')
  if (Object.keys(M).length !== (d.messages ?? []).length) err('diagram.messages: duplicate ids')
  if ((d.participants ?? []).length > 5) warn('diagram: more than 5 participants; cut to the ones the change touches')
  if ((d.messages ?? []).length > 9) warn('diagram: more than 9 messages; cut to the rows around the change')
  for (const m of d.messages ?? []) {
    if (!P[m.from] || !P[m.to]) err(`message ${m.id}: from/to must be participant ids`)
    if (m.from === m.to) err(`message ${m.id}: a message to itself can't be drawn`)
    if (m.y <= d.top + 56 || m.y >= d.end) err(`message ${m.id}: y ${m.y} is outside the lifelines (${d.top + 56}–${d.end})`)
  }

  // Inputs and their state.
  const inputs = hero.inputs ?? []
  if (!inputs.length) warn('hero.inputs: none; the diagram will be static')
  // The `before` switch is drawn as Before / With this PR tabs; every other input is a row in the table under them.
  const BEFORE = 'before'
  const rows = inputs.filter((i) => i.id !== BEFORE)
  if (rows.length > 4) warn(`hero.inputs: ${rows.length} rows; more than 4 is a lot to play with`)
  const before = inputs.find((i) => i.id === BEFORE)
  if (before) {
    if (before.kind !== 'switch') err('input before: must be a switch (the template draws it as Before / With this PR tabs)')
    if (before.disabledWhen) err('input before: can\'t be disabled; every case has a before')
    if (hero.initial?.before !== false) warn('initial.before: start on With this PR (false), the case the PR is about')
  }
  for (const i of inputs) {
    if (!['choice', 'switch'].includes(i.kind)) err(`input ${i.id}: kind must be choice or switch`)
    if (i.kind === 'choice' && !(i.options?.length >= 2)) err(`input ${i.id}: a choice needs 2+ options`)
    if (i.id !== BEFORE && !isStr(i.label)) err(`input ${i.id}: needs a label (the row's name in the table)`)
    const v = hero.initial?.[i.id]
    if (i.kind === 'choice' && !i.options?.some((o) => o.value === v)) err(`initial.${i.id}: "${v}" is not one of its options`)
    if (i.kind === 'switch' && typeof v !== 'boolean') err(`initial.${i.id}: a switch starts true or false`)
  }
  const known = new Set(inputs.map((i) => i.id))
  const checkWhen = (when, where) => {
    for (const [k, v] of Object.entries(when ?? {})) {
      if (!known.has(k)) err(`${where}: when.${k} is not an input`)
      const input = inputs.find((i) => i.id === k)
      for (const x of [v].flat())
        if (input?.kind === 'choice' && !input.options.some((o) => o.value === x)) err(`${where}: when.${k} = "${x}" is not one of its options`)
    }
  }
  // disabledWhen is one when, or a list: the input doesn't apply while any of them matches.
  const whens = (w) => (w ? [w].flat() : [])
  for (const i of inputs) for (const w of whens(i.disabledWhen)) checkWhen(w, `input ${i.id}.disabledWhen`)

  // A row is a label and its pills on one line of a 560px table: a label plus choices scoring up to ~85 fit (measured).
  for (const i of rows) {
    const width = (i.label ?? '').length * 1.1 + (i.kind === 'choice' ? i.options : [{ label: 'Yes' }, { label: 'No' }]).reduce((n, o) => n + o.label.length + 4, 0)
    if (width > 85) warn(`input ${i.id}: label and choices are too long for one row (${Math.round(width)} of ~85); shorten the option labels`)
  }

  // Control labels are the reader's words: identifiers, snake_case, camelCase and code quotes belong in message labels.
  const CODEY = /[_`]|[a-z][A-Z]|\(\)|^[A-Z_]{2,}_[A-Z_]+$/
  for (const i of inputs) {
    if (i.label && /[_`]|[a-z][A-Z]|\(\)/.test(i.label)) warn(`input ${i.id}: label "${i.label}" reads as code; name it in the reader's words`)
    for (const o of i.options ?? []) if (CODEY.test(o.label)) warn(`input ${i.id}: option "${o.label}" reads as code; name the case in the reader's words`)
  }

  // Rules point at things that exist.
  for (const [n, r] of (hero.rules ?? []).entries()) {
    const where = `rule ${n}`
    checkWhen(r.when, where)
    for (const id of r.show ?? []) if (!M[id]) err(`${where}: show "${id}" is not a message`)
    for (const id of Object.keys(r.labels ?? {})) if (!M[id]) err(`${where}: label for "${id}", not a message`)
    for (const [id, s] of Object.entries(r.status ?? {})) {
      if (!M[id]) err(`${where}: status for "${id}", not a message`)
      if (!['ok', 'error'].includes(s)) err(`${where}: status ${id} must be ok or error`)
    }
    for (const id of r.hot ?? []) if (!P[id]) err(`${where}: hot "${id}" is not a participant`)
    if (r.frame && !['ink', 'dim', 'off'].includes(r.frame)) err(`${where}: frame must be ink, dim or off`)
  }

  // Play every combination of the inputs, the way the template does.
  const matches = (when = {}, s) => Object.entries(when).every(([k, v]) => (Array.isArray(v) ? v.includes(s[k]) : s[k] === v))
  const play = (s) => {
    const out = { show: new Set(), labels: {}, hot: new Set(), status: {} }
    for (const r of (hero.rules ?? []).filter((r) => matches(r.when, s))) {
      r.show?.forEach((x) => out.show.add(x))
      r.hot?.forEach((x) => out.hot.add(x))
      Object.assign(out.labels, r.labels)
      Object.assign(out.status, r.status)
    }
    return out
  }
  const axes = inputs.map((i) => (i.kind === 'choice' ? i.options.map((o) => [i.id, o.value]) : [[i.id, true], [i.id, false]]))
  const states = axes.reduce((acc, ax) => acc.flatMap((s) => ax.map(([k, v]) => ({ ...s, [k]: v }))), [{}])
  const everShown = new Set()
  for (const s of states) {
    const r = play(s)
    r.show.forEach((x) => everShown.add(x))
    if (!r.show.size) err(`case ${JSON.stringify(s)}: no message is shown`)
  }
  for (const id of Object.keys(M)) if (!everShown.has(id)) warn(`message ${id}: never shown in any case`)

  // Status: green is an answer that succeeded and decided the case, red one that failed. Shown messages only.
  const lit = (s) => { const r = play(s); return Object.fromEntries(Object.entries(r.status).filter(([id]) => r.show.has(id))) }
  const FAILURE = /error|fail|malformed|unreadable|invalid|reject|denied|timeout|times? out|throw|missing|broken|corrupt|down|outage|not configured|refus/i
  // A case's name, from the choices that apply in it; the before tab is how it used to work, so it isn't judged here.
  const applies = (i, s) => !whens(i.disabledWhen).some((w) => matches(w, s))
  const optionLabel = (s) => inputs.filter((i) => i.kind === 'choice' && applies(i, s)).map((i) => i.options.find((o) => o.value === s[i.id])?.label ?? '').join(' ')
  // Red is for a call that failed. A red message whose label reads as an ordinary value (a logged string, a credited
  // conversion) is a wrong-but-successful outcome, which gets no colour: its label carries the difference.
  // Error codes (INVALID_ARGUMENT, PurgeCacheError) are matched case-sensitively, or any word would count.
  const FAILED = { test: (t) => FAILURE.test(t) || /exception|not valid|unparseable|timed out|\b[45]\d\d\b|\bnull\b/i.test(t) || /[A-Z][A-Z_]{3,}|Error\b/.test(t) }
  for (const s of states) {
    const r = play(s)
    for (const [id, st] of Object.entries(lit(s)))
      if (st === 'error' && !FAILED.test(r.labels[id] ?? M[id].text))
        warn(`message ${id}: red in ${JSON.stringify(s)}, but "${r.labels[id] ?? M[id].text}" doesn't read as a failure; red is for a call that failed, and a wrong value that went through gets no colour`)
  }
  for (const s of states.filter((s) => s.before !== true)) {
    const st = lit(s)
    const name = optionLabel(s)
    if (FAILURE.test(name) && !Object.values(st).includes('error'))
      warn(`case ${JSON.stringify(s)} ("${name}") sounds like a failure, but nothing in it is red; put status error on the reply that failed`)
  }
  if (states.length > 1) {
    for (const id of Object.keys(M)) {
      const shownIn = states.filter((s) => play(s).show.has(id))
      if (shownIn.length > 1 && shownIn.every((s) => lit(s)[id] === 'ok')) warn(`message ${id}: green in every case it appears in; green means the answer that decided the case, so drop it here`)
    }
    if (!states.some((s) => Object.values(lit(s)).includes('error')) && states.some((s) => FAILURE.test(optionLabel(s))))
      warn('no case has a red message, though some cases sound like failures')
  }
  // The before switch must show something: at least one case looks different before the PR than with it.
  if (before && !states.some((s) => s.before === false && JSON.stringify([...play(s).show].sort()) + JSON.stringify(play(s).labels) + JSON.stringify(lit(s)) !== JSON.stringify([...play({ ...s, before: true }).show].sort()) + JSON.stringify(play({ ...s, before: true }).labels) + JSON.stringify(lit({ ...s, before: true }))))
    warn('input before: no case changes between Before and With this PR; write the rules for how it used to work')
  for (const i of inputs) {
    // An input that changes nothing in any case is a control that does nothing.
    const differs = states.some((s) => {
      const other = { ...s, [i.id]: i.kind === 'switch' ? !s[i.id] : i.options.find((o) => o.value !== s[i.id]).value }
      if (whens(i.disabledWhen).some((w) => matches(w, s))) return false
      const look = (x) => { const r = play(x); return JSON.stringify([[...r.show].sort(), r.labels, [...r.hot].sort()]) }
      return look(s) !== look(other)
    })
    if (!differs) warn(`input ${i.id}: changing it never changes the diagram`)
  }

  // Order: the request reads rightwards. The participant that starts it is leftmost, and each other participant sits
  // right of whoever first calls it (its first appearance as a message's `to`, top to bottom).
  const msgsByY = [...(d.messages ?? [])].sort((a, b) => a.y - b.y)
  const starter = msgsByY[0]?.from
  const leftmost = [...(d.participants ?? [])].sort((a, b) => a.x - b.x)[0]?.id
  if (starter && leftmost && starter !== leftmost) warn(`${P[starter].name} starts the request, so it goes leftmost (${P[leftmost].name} is)`)
  for (const p of d.participants ?? []) {
    // A reply answers a call; it isn't one.
    const first = msgsByY.find((m) => m.to === p.id && !m.reply)
    if (p.id !== starter && first && P[first.from] && P[first.from].x > p.x)
      warn(`${p.name} sits left of ${P[first.from].name}, which first calls it; callers go left of what they call`)
  }

  // Geometry: inside the view, and labels clear of one another.
  const w = d.view?.w ?? 1000
  for (const p of d.participants ?? []) if (p.x - 85 < 0 || p.x + 85 > w) err(`participant ${p.id}: its box (x ${p.x} ± 85) leaves the view`)
  const xs = (d.participants ?? []).map((p) => p.x).sort((a, b) => a - b)
  for (let k = 1; k < xs.length; k++) if (xs[k] - xs[k - 1] < 175) err(`participants at x ${xs[k - 1]} and ${xs[k]}: boxes overlap (need 175 apart)`)
  for (const p of d.participants ?? []) if (p.name.length * 13 * 0.68 * 1.08 > 160) warn(`participant ${p.id}: "${p.name}" may not fit its box`)
  if (d.frame) {
    const f = d.frame
    if (f.x < 0 || f.x + f.w > w || f.y + f.h > (d.view?.h ?? 0)) err('diagram.frame: leaves the view')
    if (!f.branches?.length) err('diagram.frame: needs branches')
    // Branch labels are 11.5px caps (~8.4px a character): the first beside the kind's tab, the rest at the left edge.
    const tab = f.kind.length * 11.5 * 0.68 + 20
    for (const [k, b] of (f.branches ?? []).entries()) {
      const x0 = k === 0 ? f.x + tab + 10 : f.x + 10
      const x1 = x0 + b.label.length * 8.4
      for (const p of d.participants ?? []) if (p.x > x0 - 2 && p.x < x1 + 2) warn(`frame branch "${b.label}" crosses the ${p.name} lifeline; shorten it or move the frame`)
    }
  }
  // Every label any case can show, as a box: 13px Geist Mono is ~7.8px a character.
  const boxes = []
  for (const s of states) {
    const r = play(s)
    for (const m of d.messages ?? []) {
      const text = r.labels[m.id] ?? m.text
      const x = m.labelX ?? (P[m.from]?.x + P[m.to]?.x) / 2
      const half = (text.length * 7.8) / 2 + 4
      if (x - half < 0 || x + half > w) err(`message ${m.id}: label "${text}" leaves the view`)
      boxes.push({ id: m.id, text, x0: x - half, x1: x + half, y: m.y - 14 })
    }
  }
  const clash = new Set()
  for (const a of boxes)
    for (const b of boxes)
      if (a.id < b.id && Math.abs(a.y - b.y) < 16 && a.x0 < b.x1 && b.x0 < a.x1) clash.add(`messages ${a.id} and ${b.id}: labels overlap ("${a.text}" / "${b.text}"); move one with labelX or y`)
  clash.forEach(err)
  // A label crossing a lifeline is hard to read: move it into a clear gap with labelX.
  for (const b of boxes)
    for (const p of d.participants ?? [])
      if (p.x > b.x0 + 6 && p.x < b.x1 - 6) warn(`message ${b.id}: label "${b.text}" crosses the ${p.name} lifeline`)

  const uniq = (xs) => [...new Set(xs)]
  return { errors: uniq(errors), warnings: uniq(warnings), steps: pr.steps?.length ?? 0, cases: states.length }
}
