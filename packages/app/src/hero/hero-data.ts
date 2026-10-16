// a PR's hero as pure data (src/data/<base>.hero.json). The diagram, the inputs a reviewer
// plays with, and rules: every rule whose `when` matches the inputs' state adds to what the diagram shows.
import type { SeqSpec, Tone } from './sequence'

export type HeroState = Record<string, string | boolean>
// Each key is an input id; the state matches when every key equals its value (or one of its values).
export type When = Record<string, string | boolean | (string | boolean)[]>

export type HeroInput =
  | { id: string; kind: 'choice'; label?: string; options: { value: string; label: string }[]; disabledWhen?: When | When[] }
  | { id: string; kind: 'switch'; label: string; disabledWhen?: When | When[] }

export type HeroRule = {
  when?: When // none: always
  show?: string[] // message ids drawn ink; the rest fall back
  labels?: Record<string, string> // message id -> text for this case
  hot?: string[] // participant ids drawn ink
  frame?: Tone // the alt frame's tone, dim by default
  status?: Record<string, Status> // message id -> how that call ended, for the ones whose outcome is the point
}

export type Status = 'ok' | 'error'

export type HeroData = {
  version: 1
  title: string
  diagram: Omit<SeqSpec, 'participants' | 'messages'> & {
    participants: { id: string; x: number; name: string }[]
    messages: (Omit<SeqSpec['messages'][number], 'from' | 'to'> & { from: string; to: string })[]
  }
  inputs: HeroInput[]
  initial: HeroState
  rules: HeroRule[]
}

export const matches = (when: When | undefined, s: HeroState) =>
  Object.entries(when ?? {}).every(([k, v]) => (Array.isArray(v) ? v.includes(s[k]) : s[k] === v))

// An input doesn't apply (it's faded, and its value is ignored by the reader) while any of its disabledWhen matches.
export const whens = (w?: When | When[]) => (w ? (Array.isArray(w) ? w : [w]) : [])
export const applies = (input: HeroInput, s: HeroState) => !whens(input.disabledWhen).some((w) => matches(w, s))
// The switch that shows the code as it was before the PR: an input with id `before`. The page draws it as tabs.
export const BEFORE = 'before'

// Fold every matching rule, in order: show and hot accumulate, a later label, status or frame replaces an earlier one.
export function play(hero: HeroData, s: HeroState) {
  const out = { show: new Set<string>(), labels: {} as Record<string, string>, status: {} as Record<string, Status>, hot: new Set<string>(), frame: 'dim' as Tone }
  for (const r of hero.rules.filter((r) => matches(r.when, s))) {
    r.show?.forEach((id) => out.show.add(id))
    r.hot?.forEach((id) => out.hot.add(id))
    Object.assign(out.labels, r.labels)
    Object.assign(out.status, r.status)
    if (r.frame) out.frame = r.frame
  }
  return out
}

// The diagram as the Sequence component draws it: participants and messages placed by x.
export function toSpec(d: HeroData['diagram']): SeqSpec {
  const x = Object.fromEntries(d.participants.map((p) => [p.id, p.x]))
  return { ...d, participants: d.participants.map(({ x, name }) => ({ x, name })), messages: d.messages.map((m) => ({ ...m, from: x[m.from], to: x[m.to] })) }
}
