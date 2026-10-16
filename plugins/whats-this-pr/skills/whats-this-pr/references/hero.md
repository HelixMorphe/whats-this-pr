# The hero: hero.json

The hero opens the page: a one-sentence title, then a sequence diagram of the behaviour the PR changes. Under it, **Before this PR / With this PR** tabs (when the PR changes an outcome), then a table of up to four controls, one row each. A reviewer flips the tabs and the rows and sees each case: which calls happen, what they carry, and how each ends. The look and the motion are fixed by the template. `hero.json` decides everything else, as data: the diagram, the controls, and rules that say what each combination of controls shows.

## Pick what to draw

1. Name the behaviour the PR changes, as calls between parts: who asks whom, what comes back, what decides between paths. Draw the answer that decides each path, even when it's empty: a cache that returns `undefined` is why the request goes on to the database.
2. Name the conditions that decide it. These become the inputs, each a row of the table: a **choice** for 2–4 named cases ("Accepted / Rejected / Config missing"), a **switch** for yes/no ("FLAG", "SERVER ADVERTISES 103"). One to three rows is best; four at most. A condition that only matters in some cases is its own row with `disabledWhen` (below), not folded into another.
3. Cut to 3–5 participants and at most ~8 messages: the rows around the change.
4. **Show the before.** When the PR fixes a bug or changes an outcome, add the `before` switch ("The before tabs", below), so the reader can flip to how it used to work. Without it the diagram shows only the new world, and the change itself is invisible (`examples/caddy-8168.hero.json`: before the PR, a retry rule that only tested the request retried a backend's 200 until the client got a red 502; with it, the first 200 comes back).
5. **Cover every behaviour the PR names.** When the title or body names two changes ("attribution swap + crash guard"), each one gets a case, or a second input. A hero that draws only one half leaves the other to the steps alone.
6. **Check each case can happen.** Before drawing a path, read what stands in front of it (guards, middleware, feature flags, auth) and confirm a request in that case actually reaches it. If the outcome depends on a flag or setting, say so in the label ("201 · if RBAC is off") or make the setting an input. A case that can't happen as drawn misleads more than a missing case.

## Format

```json
{
  "version": 1,
  "title": "With retryAfter: false, the server no longer sets the retry wait",
  "diagram": {
    "view": { "w": 1000, "h": 560 },
    "top": 30,
    "end": 530,
    "label": "Sequence: … (what a screen reader hears)",
    "participants": [{ "id": "handler", "x": 500, "name": "RETRY HANDLER" }],
    "messages": [{ "id": "busy", "from": "server", "to": "handler", "y": 250, "text": "429 · retry-after: 60", "reply": true }],
    "frame": { "x": 70, "y": 300, "w": 870, "h": 160, "kind": "alt", "branches": [{ "label": "header used" }, { "label": "backoff", "y": 385 }] }
  },
  "inputs": [
    { "id": "header", "kind": "choice", "label": "RETRY-AFTER HEADER", "options": [{ "value": "60", "label": "60 seconds" }, { "value": "none", "label": "None" }] },
    { "id": "opt", "kind": "choice", "label": "RETRYAFTER OPTION", "options": [{ "value": "false", "label": "false" }, { "value": "true", "label": "Default (true)" }], "disabledWhen": { "header": "none" } },
    { "id": "before", "kind": "switch", "label": "BEFORE THIS PR" }
  ],
  "initial": { "header": "60", "opt": "false", "before": false },
  "rules": [
    { "show": ["get", "attempt", "busy"], "hot": ["handler"], "status": { "busy": "error" } },
    { "when": { "header": "60", "opt": "false", "before": false }, "labels": { "retry": "retry · waits 500 ms" } }
  ]
}
```

- **`participants`**: `id` (yours, lowercase), `x` (centre), `name` (UPPERCASE role, at most ~16 characters).
- **`messages`**: `from`/`to` are participant ids, `y` its row, `text` its lowercase label. `reply: true` draws it dotted. `labelX` moves its label sideways.
- **`frame`** (optional): an `alt` box around the rows the inputs choose between (`opt` for one optional block). The first branch is labelled in the tab; each later branch has the `y` of its dotted divider.
- **`inputs`**: each is a row of the table: its `label` (UPPERCASE, required) on the left, its choices as pills on the right. A choice's `options` are `{ value, label }`; a switch reads Yes / No. Option labels and input labels name each case in the words a reader recognizes, not the code's: "No templates loaded", not "Nil renderer" or `HTMLRender == nil`; "Times out", not "TIMEOUT_MS". The diagram's message labels are where real values belong.
- **`disabledWhen`** (any input but `before`): a `when`, or a list of them; the row doesn't apply while any of them matches. It stays in place, faded, with an ⓘ that says why, written from the `when` that matched and the labels: "Not used when Retry-after header is None." So name inputs and options so that sentence reads well. Use it for a condition that only matters in some cases (undici's retryAfter option only matters when the server sends a Retry-After header; what's already in a cache only matters on the tab where the cache exists).
- **`initial`**: every input's starting value. Start on the case the PR is about.

## The before tabs

An input with id `before` is drawn as **Before this PR / With this PR** tabs above the table, not as a row: `{ "id": "before", "kind": "switch", "label": "BEFORE THIS PR" }`, with `"before": false` in `initial`, so the page opens on the PR. It can't be disabled.

- Rules with `when: { "before": true }` draw how it used to work; rules with `when: { "before": false }` draw only what the PR brings. A rule with no `before` in its `when` holds on both tabs.
- Put a call the PR adds (a lookup it introduced) in a `before: false` rule. On the Before tab, a call that the case makes only with the PR is hidden, since it didn't happen yet. Every other call that isn't part of the case stays faint on both tabs, so a case the PR doesn't change looks the same on both.
- Red still means something **failed**: an error reply, an exception, a rejection, a 4xx or 5xx (gin's old panic, before #4805). An old outcome that was wrong but went through without complaint, a value logged or stored in the wrong form, a wait taken from the wrong setting, gets no colour: its label carries the difference (uvicorn's access log reads `GET /one/two` on Before and `GET /one%2Ftwo` on With this PR). Red there reads as "this call failed", which is not what happened.
- Draw the before from the code at the PR's base, not from the PR's description of it: what the removed lines did, and what ran in front of them. `whats-this-pr check` warns when no case differs between the tabs.

## Rules

Every rule whose `when` matches the current inputs adds to what the diagram shows, in order:

- **`when`**: `{ inputId: value }`, or a list of values; all of its keys must match. A rule with no `when` always applies.
- **`show`**: message ids drawn lit, accumulating across rules; every other message falls back faint.
- **`labels`**: a message's text for this case; a later rule replaces an earlier one.
- **`hot`**: participant ids drawn lit, accumulating: the part the PR changes.
- **`status`**: what a call's answer meant, drawn green (`ok`) or red (`error`). Put `error` on the reply or call that **failed** in this case: a rejection, an exception, an unreadable or missing answer, a timeout. Put `ok` on the answer that **succeeded and decided** the case. Leave it off everything else, including the call the PR is about when that call merely happens (a log line, a write), and an answer that is neither a success nor a failure for the reader: a correct "not found", an empty result, a cached "not found" that leads to a 404. Green there reads as "all good" while the reader sees an error page; no colour is the honest choice. Every case that fails somewhere needs one red message. A message that's green in every case is noise; remove its status.

  | Case | Wrong | Right |
  |---|---|---|
  | Cache entry won't parse | `status: { logMiss: "ok" }`: the log line is green | `labels: { cached: "unparseable body" }, status: { cached: "error" }`: the cache's reply is red |
  | Cache miss | no reply drawn from the cache | the cache's reply drawn, labelled `undefined`: the reason it goes on to the handler |
- **`frame`**: `ink`, `dim` (default) or `off`. `off` doesn't hide the frame: it draws it faint (about a fifth as strong), for cases that never reach the branch.

Write one rule for what every case shares, then one rule per input value that changes something. Independent inputs stay independent rules, so cases multiply without rules multiplying (`examples/starlette-3435.hero.json`: 2 × 2 × 2 cases from 7 rules).

## Words

- **`title`**: one plain sentence, under ~70 characters, saying what changes for the person who meets the change: the customer, the API caller, the person reading the logs or the dashboard. Use their words, not the code's: "Access logs now show the path exactly as the client sent it", not "The access log formatter uses raw_path". Not the PR's title.
- **Labels** are lowercase and at most ~4 words, and they show real values where a value is the point: `401 · body`, `variants=a_0,b_1`, `log · cf_ray: 9f1c…-IAD`. Separate parts with ` · `.

## Layout

- Order participants so the request reads rightwards: the one that starts it on the left, and each other one right of whoever first calls it (`CACHE MIDDLEWARE` before `CACHE STORE` and `ROUTE HANDLER`, which it calls). `whats-this-pr check` warns when a callee sits left of its caller.
- `view.w` is 1000. Give participants' `x` at least 175 apart (boxes are 170 wide), each between 85 and 915. Four participants: about 120 / 380 / 640 / 880. Five: 100 / 300 / 500 / 700 / 900.
- Set `top` to 30. Rows start near `y` 150 and are 50–60 apart; leave about 90 between rows on either side of a frame divider. `end` sits about 40 below the last row, and `view.h` is `end` + 30.
- A label sits 14 above its row, centred between the two ends. If it would cross a lifeline or another label, move it into a clear gap with `labelX`. `whats-this-pr check` reports both.
- The frame spans the branch rows with about 25 to spare on each side, from `x` 70 to 940. Its first branch label sits next to the tab, and later ones at the frame's left edge. A label that crosses a lifeline is hard to read, so keep branch labels short ("flag on", "on a miss") or move the frame's `x`; `whats-this-pr check` warns when one crosses. Never clear one by reordering participants: the left-to-right order is the request's.
- There are no self-calls. A step a participant does alone is shown by what it leads to: leave out the call it skips.

## Examples

| File | Shows |
|---|---|
| `caddy-8168.hero.json` | The before tabs over a bug: on Before, a 200 is retried into a red 502; an `opt` frame for the retries |
| `hono-4915.hero.json` | A cache path (hit / miss with the cache's `undefined` drawn); a row that doesn't apply on the Before tab (`disabledWhen` list) |
| `undici-5683.hero.json` | An option that only matters when a header is present (`disabledWhen`); red on the server's 429, nothing else |
| `starlette-3435.hero.json` | A new feature with no before tabs: three independent rows, 8 cases from 7 rules |
| `uvicorn-3195.hero.json` | A logging change: one row of four cases, and no red anywhere, only labels change between the tabs |
| `gin-4805.hero.json` | An error path: a panic before, an error reply after; an `alt` frame with a branch per status |
