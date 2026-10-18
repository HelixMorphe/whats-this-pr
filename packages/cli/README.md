# whats-this-pr

Turn a pull request's data into a guided review page: one self-contained HTML file with an interactive before/after diagram of the behaviour the PR changes, the diff cut into ordered steps with notes, the risks to check, and the files nobody needs to read.

The write-up, with a live example: **[santhosh.fyi/projects/whats-this-pr](https://santhosh.fyi/projects/whats-this-pr)**.

This package is the page template and the three commands that fill it. It is driven by the **What's this PR?** Claude Code skill, which reads the PR and writes the data; you can also write the data yourself.

```sh
npx whats-this-pr story story.json pr.diff -o pr.json   # the PR told as data → pr.json
npx whats-this-pr check pr.json hero.json               # errors fail (exit 1); warnings are for a look
npx whats-this-pr make  pr.json hero.json -o page.html  # the page
```

- **`story`** cuts `pr.diff` (from `gh pr diff`) into the steps `story.json` names, pins each note to its line by the line's text, counts the lines, and fails unless every hunk lands in exactly one step or a skippable group.
- **`check`** validates `pr.json` and `hero.json` against what this version of the template reads: the shape, every rule pointing at something that exists, every combination of the hero's inputs showing something, the colours, and the diagram's geometry.
- **`make`** writes the page. Nothing is fetched at view time: scripts, styles, syntax grammars and fonts are all inside the file.

Pin the version you write data for (`npx whats-this-pr@0.1 …`): the data shape can change between minor versions before 1.0.

The library is importable too: `import { story, check, make } from 'whats-this-pr'`, and the diff helpers from `whats-this-pr/diff`.

Formats, examples and the skill: https://github.com/HelixMorphe/whats-this-pr

MIT. The template bundles third-party libraries and fonts under their own licences; see NOTICE.
