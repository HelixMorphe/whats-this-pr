---
name: whats-this-pr
description: Turn a GitHub pull request into a guided review page, one self-contained HTML file. The page opens with an interactive sequence diagram of the behaviour the PR changes, with Before / With this PR tabs and a row per condition, then the diff cut into ordered steps with notes on the lines that matter, the risks to check, and the files nobody needs to read. Use when asked to explain a PR, make a review page or walkthrough for a PR, or answer "what's this PR?" for a PR link or number.
---

# What's this PR?

A page is a fixed template plus two data files you write:

- **`story.json`**, the story: the PR cut into steps, which hunks each step shows, notes, spotlights, and the skippable files. `whats-this-pr story` turns it into `pr.json`.
- **`hero.json`**, the hero: a sequence diagram of the behaviour the PR changes, its controls (Before / With this PR tabs, then a row per condition), and the rules for what each case shows.

The template is the whole review app, built once with no PR in it and shipped in the `whats-this-pr` npm package with the commands below. You never write HTML, so every page looks and behaves the same, and everything particular to a PR is data. Run the commands with `npx -y whats-this-pr@0.1 …`: the version is pinned so these instructions and the template always agree.

`<skill>` below is this skill's folder. Work in a fresh folder outside any repository, named `<repo>-<number>` (a scratchpad if you have one, otherwise the system's temp folder), and write every file there, nowhere else. Nothing there gets committed.

**Read only.** Everything you learn about the PR comes through the GitHub API, as in step 1: the PR, its diff, and any file at any commit. Never clone or check out the repository, install its dependencies, or run its code or tests, not even to confirm a behaviour: a pull request can come from anyone, and running it runs their code on this machine. When a claim could only be settled by running the code, mark it unchecked, on the page and in your report.

## Steps

1. **Read the PR.**
   ```sh
   gh api repos/<owner>/<repo>/pulls/<n> --jq '{title, body, url: .html_url, author: .user.login, base: .base.sha, head: .head.sha}'
   gh pr diff <n> -R <owner>/<repo> > pr.diff
   ```
   Use `gh api` (REST): some sandboxes block GitHub's GraphQL API, which `gh pr view` uses. Read the whole diff and the body. Then read every changed function in full at the PR's head, not only its hunks: `gh api "repos/<owner>/<repo>/contents/<path>?ref=<head sha>" --jq .content | base64 -d`. Read the same files at the base sha for what the code did before. The best spotlights come from there: what a changed line now does on paths the diff doesn't show, and what each removed or changed line used to do that now stops (`references/story.md`, "What stopped happening"). Done when you can say, in one sentence, what changes for the person who meets the change, and you have checked each claim in the PR body against the code you read, or marked it unchecked.

2. **Write the story.** Write `story.json` following `references/story.md`, starting from the example in `examples/` closest in shape, then run:
   ```sh
   npx -y whats-this-pr@0.1 story story.json pr.diff -o pr.json
   ```
   Done when it writes `pr.json`: every hunk is placed and every note found its line.

3. **Write the hero.** First write each case the controls produce as one sentence: what is asked, what comes back, what that answer means, and how the case ends ("Cache miss: the store answers undefined, so the middleware calls the handler and stores its 200"). Then write `hero.json` from those sentences, following `references/hero.md` and starting from the example in `examples/` closest in shape. Every answer a sentence names is a message, and every failure a sentence names is red. Done when each case's sentence can be read straight off its diagram, the hero has a `before` switch drawing the old behaviour when the PR changes an outcome, every change the PR names has a case, and you have checked that each case can actually happen (guards, flags and auth in front of it).

4. **Check.**
   ```sh
   npx -y whats-this-pr@0.1 check pr.json hero.json
   ```
   Fix every `ERROR`, and read every `warn`: fix it, or know why it stands. Done when it reports 0 errors.

5. **Make the page.**
   ```sh
   npx -y whats-this-pr@0.1 make pr.json hero.json -o <repo>-<number>.html
   ```

6. **Look once**, if a Chrome or Chromium is installed (`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` on macOS, `google-chrome` or `chromium` on Linux). Without one, skip this step and say so in your report; `check` is the check then.
   ```sh
   <chrome> --headless=new --hide-scrollbars --force-prefers-reduced-motion \
     --virtual-time-budget=6000 --window-size=1280,1400 --screenshot=page.png "file://$PWD/<repo>-<number>.html"
   ```
   `--force-prefers-reduced-motion` matters: without it the shot can catch the entrance mid-way, with labels not yet drawn. The shot shows the hero in its opening case and step 1; `check` covers the other cases and steps. Read the PNG. Look for labels touching each other or a lifeline, text leaving its box, a row whose choices spill past the table, and a hero that doesn't open on the case the PR is about. If you fix something, re-run steps 4–6 once to see the fix, then move on.

7. **Hand it over.** If you can publish an HTML page somewhere the person can open (for example a Claude artifact), publish `<repo>-<number>.html` there with a one-sentence description naming the PR and what it changes, and give the link. Otherwise give the file's path; it opens in any browser. Then report what you could not verify: cases you didn't open, and claims you took from the PR body without checking the code. Leave the work folder holding only the files above (`pr.diff`, `story.json`, `pr.json`, `hero.json`, the page and its screenshot), so the page can be updated later; delete anything else you made.

Leave GitHub as it is: no comments, reviews or labels on the PR.

## Updating a page

Edit `story.json` or `hero.json`, then re-run steps 2 (if the story changed) and 4–7. Publish to the same place, so the link stays the same.
