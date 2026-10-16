// Shape of the generated story (scripts/build-pr-923.mjs writes pr-923.json).

// A note says one thing about one piece of code: the text `at` on a new-side line of a file in a step. The arrow
// points at the line; `at` records exactly which text the note is about.
export type Note = { line: number; at: string; text: string }

export type Hunk = { file: string; isNew: boolean; isDeleted?: boolean; patch: string; notes: Note[] }

// Files a reviewer only needs to know about (lockfiles, pure moves, docs): listed, never shown as a diff.
export type MechanicalFile = { file: string; add: number; del: number; from?: string; deleted?: boolean }
export type MechanicalGroup = { kind: string; why: string; files: MechanicalFile[] }

export type Spotlight = { id: string; label: string; why: string; step: number }

export type Step = {
  n: number
  title: string
  diagram?: string // an SVG schematic, only for steps whose shape a picture explains (scripts/diagrams.mjs)
  why: string
  consequence: string
  spotlights: string[]
  hunks: Hunk[]
}

export type PullRequest = {
  repo: string // owner/repo
  url?: string // the PR on GitHub; without it, github.com/<repo>/pull/<number>
  number: number
  title: string
  author: string
  agent: string
  files: number
  add: number
  del: number
  ticket: { key: string; title: string }
  spotlights: Spotlight[]
  steps: Step[]
  mechanical: MechanicalGroup[]
}
