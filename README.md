# What's this PR?

Turn a pull request into a guided review page: one self-contained HTML file a reviewer opens instead of starting at line 1 of the diff.

- **The behaviour, before and after.** An interactive sequence diagram of what the PR changes. Flip **Before this PR / With this PR**, pick the case (cache hit or miss, flag on or off, header present or not), and see which calls happen, what they carry, and how each case ends. Red only where a call actually fails.
- **The diff, in reading order.** The PR cut into steps a reviewer can follow, cause before effect, with short notes pinned to the lines that matter.
- **The risks.** Spotlights on what a reviewer has to judge: behaviour nobody ran, a change users will notice, what the old code did that now stops.
- **What to skip.** Lockfiles, generated code and docs listed, not shown.

It is a [Claude Code](https://claude.com/claude-code) skill plus an npm package. The agent reads the PR and the code around it and writes two data files; the package turns them into the page. The agent never writes HTML, so every page looks and works the same, and a checker validates the data first.

## Examples

Pages for real pull requests, written by the skill (`pnpm examples` builds them into `dist/examples/`):

| PR | What the page shows |
|---|---|
| [caddyserver/caddy#8168](https://github.com/caddyserver/caddy/pull/8168) | Before: a retry rule that only tested the request retried a backend's 200 into a 502. With: the 200 comes back. |
| [honojs/hono#4915](https://github.com/honojs/hono/pull/4915) | Before: with `vary` set, nothing was cached (the PR body's "before" described an older release). With: one entry per header value. |
| [nodejs/undici#5683](https://github.com/nodejs/undici/pull/5683) | Before: `retryAfter: false` was ignored, so a 60 s `Retry-After` waited the 30 s cap. With: the normal 500 ms backoff. |
| [Kludex/starlette#3435](https://github.com/Kludex/starlette/pull/3435) | A new feature, HTTP 103 Early Hints, through the middleware and the endpoint types. No before: there wasn't one. |
| [Kludex/uvicorn#3195](https://github.com/Kludex/uvicorn/pull/3195) | The access log shows `/one%2Ftwo` as sent, not `/one/two`. No red: every call succeeds; only the logged value changes. |
| [gin-gonic/gin#4805](https://github.com/gin-gonic/gin/pull/4805) | Before: `c.HTML` with no templates panicked. With: an empty 200 and a logged error, which the page flags as quieter, not safer. |

## Use it in Claude Code

```text
/plugin marketplace add HelixMorphe/whats-this-pr
/plugin install whats-this-pr@whats-this-pr
```

Then ask: *"What's this PR? https://github.com/owner/repo/pull/123"*. The skill needs the [GitHub CLI](https://cli.github.com) (`gh`, signed in) and Node.js 20 or later. It reads the PR, writes the page, and hands you the file (or publishes it, where the agent can publish pages). It never comments on or changes the PR.

## Use the package on its own

```sh
npx whats-this-pr story story.json pr.diff -o pr.json   # the PR told as data → pr.json
npx whats-this-pr check pr.json hero.json               # is the data right for this template?
npx whats-this-pr make  pr.json hero.json -o page.html  # the page
```

The data formats are documented in the skill's references: [`story.md`](plugins/whats-this-pr/skills/whats-this-pr/references/story.md) and [`hero.md`](plugins/whats-this-pr/skills/whats-this-pr/references/hero.md).

## This repository

```text
packages/app      the template's source: a React app that renders a page from its two data blocks
packages/cli      the npm package: the built template and the story / check / make commands
plugins/          the Claude Code plugin: the skill, its references and its examples
examples/         each example's pr.diff, for the tests and `pnpm examples`
```

```sh
pnpm install
pnpm dev        # the app with the example pages, at /<owner>/<repo>/<number>
pnpm build      # builds the template into packages/cli
pnpm test       # every example through story → check → make
pnpm examples   # every example's page, into dist/examples/
```

## Licence

MIT. The template bundles third-party libraries and fonts under their own licences; see [NOTICE](NOTICE).
