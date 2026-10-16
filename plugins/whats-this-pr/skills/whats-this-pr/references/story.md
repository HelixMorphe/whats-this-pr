# The story: story.json

`story.json` is everything below the hero: the PR cut into steps a reviewer reads in order, which hunks of the diff each step shows, notes on the lines that matter, the risks to check, and the files nobody needs to read. It is data. `whats-this-pr story` turns it and `pr.diff` into `pr.json`, the file the page reads: it cuts the diff, finds each note's line by its text, counts the lines, and fails unless every hunk lands somewhere.

```sh
npx -y whats-this-pr@0.1 story story.json pr.diff -o pr.json
```

Full examples: `examples/undici-5683.story.json` (2 steps), `examples/hono-4915.story.json` (one file's hunks split across three steps), `examples/starlette-3435.story.json` (4 steps and a skippable docs group).

## The shape

```json
{
  "repo": "nodejs/undici",
  "number": 5683,
  "url": "https://github.com/nodejs/undici/pull/5683",
  "title": "fix(retry): honor the retryAfter option in the default retry strategy",
  "author": "someone",
  "agent": "Unknown",
  "spotlights": [{ "id": "strict", "label": "Only a literal false turns it off", "why": "…", "step": 1 }],
  "steps": [
    {
      "title": "Skip the Retry-After header when retryAfter is false",
      "why": "…",
      "consequence": "…",
      "spotlights": ["strict"],
      "hunks": [
        {
          "file": "lib/handler/retry-handler.js",
          "notes": [["retryAfter === false ? undefined", "Strict: only false skips the header"]]
        }
      ]
    }
  ],
  "mechanical": [{ "kind": "Docs", "why": "A usage page and its nav entry.", "files": ["docs/early-hints.md", "mkdocs.yml"] }]
}
```

| Field | What goes in it |
|---|---|
| `repo`, `number`, `url`, `title`, `author` | From the PR (`gh api repos/<owner>/<repo>/pulls/<n>`). `repo` is `owner/repo`; `url` is the PR's `html_url`; `title` is the PR's title as written. The page's header shows `repo #number` as the link to `url`, then the title. |
| `agent` | What wrote the PR, if the PR says (`"Claude Code"`, `"AI-assisted"`); otherwise `"Unknown"`. |
| `files`, `add`, `del` | Leave them out: they're counted from the diff. |
| `spotlights` | `{ id, label, why, step }[]`: what the reviewer must check. `step` is the step's number, counting from 1. |
| `steps` | `{ title, why, consequence, spotlights: [ids], hunks: [...] }[]`, in reading order. |
| `steps[].hunks` | `{ file, hunks?, notes? }[]`. `file` is a path, or any unique ending of one. `hunks` picks that file's hunks by index (0-based, in diff order); leave it out for all of them. Split a file's hunks across steps when they do different jobs. |
| `mechanical` | `{ kind, why, files: [path endings] }[]`: files a reviewer only needs to know about, not read (lockfiles, generated code, pure moves, docs). Listed on the page, no diff shown. Or `[]`. |

### Notes

A note is `[lineText, note, at?, nth?]`, or `{ "line": lineText, "note": …, "at": …, "nth": … }`. It lands on the first new-side line whose text, as it appears in `pr.diff`, contains `lineText`: that line starts with `+` or a space, so `lineText` is a substring of one line, with no newline. The arrow points at `at` within it (the whole `lineText` when left out). When several lines contain `lineText`, pass `nth` (1-based) or make `lineText` more specific. Leading spaces count, so `'  ? 0'` won't match `'?? 0'`. A deleted line has no new-side number, so notes go on added or unchanged lines. "no line 1 contains …" means nothing matched: look for a typo, a newline or a tab.

Every hunk of every file must be in exactly one step, or the whole file in a `mechanical` group; `story` names the file that isn't.

## Writing it

- **Steps** follow the order a reviewer can follow, cause before effect: the types and constants a change needs, then the logic, then the wiring, then its tests. Write 2–7 steps; a one-line PR gets 1. Tests get their own step after the code they prove.
- **`title`**: what the step does, as a short sentence in sentence case, under ~70 characters: "Skip the Retry-After header when retryAfter is false".
- **`why`**: one to three plain sentences on what changes and how, naming the real functions and values.
- **`consequence`**: what is true once this step is in, for users or for the system, and what isn't yet.
- **Notes**: one to six per hunk, 8 words at most, pinned to the line that matters, saying what a reader would otherwise have to work out: "No ?? default: a missing header stays undefined". Never restate the code.
- **Spotlights** are the risks a reviewer has to judge: behaviour nobody has run yet, a behaviour change users will notice, a gap the PR admits, a smell (an unused import, a name match where an id was meant). The `label` is 8 words or fewer and the `why` is a sentence or two. Attach each to the step where a reviewer meets it.
- **What stopped happening.** For every removed or changed line, say what the old code did that the new code doesn't, and whether anyone relied on it: a log field or stack trace no longer written, a path that used to stay quiet and now errors, a case that used to be counted and now isn't. These behaviour changes are the risks reviewers miss most, because the new code reads correctly on its own. Each one a reader could be surprised by becomes a spotlight.
- **What the PR is for.** If the body says why the change exists (a bug someone hit, a number someone wants), check the change actually delivers it. If it doesn't, or only partly, that is a spotlight. If the body describes the old behaviour, check that against the code at the PR's base: descriptions go stale (`examples/hono-4915.story.json`: the body's "before" described an older release).
- Read the PR body for what the author says is untested or unverified, and turn that into a spotlight.
