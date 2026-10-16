import { useCallback, useEffect, useRef, useState } from 'react'
import { FileDiff as PierreFileDiff, getSingularPatch } from '@pierre/diffs'

import { SketchNotes, type Target } from '@/components/sketch-notes'
import { InlineNote } from '@/components/inline-note'
import { TextHighlight, type TextBox } from '@/components/text-highlight'
import type { Hunk } from '@/data/types'
import type { NotesMode } from '@/lib/flags'
import type { Theme } from '@/lib/theme'
import { cn } from '@/lib/utils'
import type { CodeTheme } from '@/lib/tuning'

const isTest = (file: string) => /\.(spec|test)\.[jt]sx?$/.test(file)

// The file header sits on its own tint so it reads apart from the code below it.
const HEADER_CSS = `
  [data-diffs-header], [data-diffs-header][data-sticky] {
    background-color: var(--file-header); border-bottom: 1px solid var(--file-header-rule); cursor: pointer; user-select: none;
  }
  [data-diffs-header]:hover { background-color: var(--file-header-hover); }
  .chev { display: inline-block; width: 12px; color: var(--chev); font-size: 11px; }
  /* Hovering a note: every row but its line blurs and fades (rows and gutter cells of a line share data-line-index). */
  [data-line-type], [data-separator] { transition: filter 180ms ease, opacity 180ms ease; }
  [data-dim] { filter: blur(2px); opacity: 0.4; }
  @media (prefers-reduced-motion: reduce) { [data-dim] { filter: none; } }`

// The header's "Viewed" checkbox, after the +/− counts (Pierre slots it into the header). Checking it collapses the
// file and marks it done; unchecking opens it again.
const viewedBox = (on: boolean) => {
  const b = document.createElement('button')
  b.type = 'button'
  b.className = 'viewed-box'
  b.dataset.viewed = ''
  b.setAttribute('role', 'checkbox')
  b.setAttribute('aria-checked', String(on))
  b.innerHTML = `<span class="box">${on ? '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6.2 5 8.6l4.5-5"/></svg>' : ''}</span>Viewed`
  return b
}

const chevron = (shut: boolean) => {
  const s = document.createElement('span')
  s.className = 'chev'
  s.textContent = shut ? '▸' : '▾'
  return s
}

// Where a note's arrow lands for a new-side line: just outside the card's right edge, level with the line, so no
// stroke ever crosses the code. Relative to `box`; null while the line is not on screen.
function lineEdge(card: HTMLElement, box: DOMRect, line: number): Target | null {
  const root = [...card.querySelectorAll('*')].find((n) => n.shadowRoot)?.shadowRoot
  const row = [...(root?.querySelectorAll<HTMLElement>(`[data-line="${line}"]`) ?? [])].find(
    (r) => !r.dataset.lineType?.includes('deletion') && r.hasAttribute('data-line-type'),
  )
  const r = row?.getBoundingClientRect()
  if (!r?.height) return null
  // A wrapped line is several rows tall; point at its first row.
  return { x: card.getBoundingClientRect().right + 4 - box.left, y: r.top + Math.min(r.height / 2, 10) - box.top }
}

// Blur every code row of the card except `line` (or clear it when `line` is null).
function focusLine(card: HTMLElement, line: number | null) {
  const root = [...card.querySelectorAll('*')].find((n) => n.shadowRoot)?.shadowRoot
  if (!root) return
  const keep = line === null ? null : root.querySelector<HTMLElement>(`[data-line="${line}"]:not([data-line-type*="deletion"])`)
  const index = keep?.dataset.lineIndex
  root.querySelectorAll<HTMLElement>('[data-line-type], [data-separator]').forEach((r) => {
    r.toggleAttribute('data-dim', line !== null && r.dataset.lineIndex !== index)
  })
}

// Where the text `at` sits on a new-side line, relative to `box` (null when it is not rendered).
// The boxes of the text `at` on a new-side line, one per row it wraps across, relative to `box`.
function textBoxes(card: HTMLElement, box: DOMRect, line: number, at: string): TextBox[] {
  const root = [...card.querySelectorAll('*')].find((n) => n.shadowRoot)?.shadowRoot
  const row = root?.querySelector<HTMLElement>(`[data-line="${line}"]:not([data-line-type*="deletion"])`)
  const range = row && textRange(row, at)
  if (!range) return []
  // One rect per highlighted span; join the ones that sit on the same visual row.
  const rows: TextBox[] = []
  for (const r of range.getClientRects()) {
    if (!r.width) continue
    const b = { left: r.left - box.left, right: r.right - box.left, top: r.top - box.top, bottom: r.bottom - box.top }
    const same = rows.find((o) => Math.abs(o.top - b.top) < 4)
    if (same) Object.assign(same, { left: Math.min(same.left, b.left), right: Math.max(same.right, b.right) })
    else rows.push(b)
  }
  return rows
}

const smoothScroll = () => !matchMedia('(prefers-reduced-motion: reduce)').matches

// Slide a code scroller to `left` and resolve once it has come to rest (immediately if it is already there).
function scrollCode(scroller: HTMLElement, left: number): Promise<void> {
  const target = Math.max(0, Math.min(left, scroller.scrollWidth - scroller.clientWidth))
  if (Math.abs(scroller.scrollLeft - target) < 1) return Promise.resolve()
  if (!smoothScroll()) {
    scroller.scrollLeft = target
    return Promise.resolve()
  }
  return new Promise((done) => {
    const finish = () => {
      clearTimeout(timer)
      scroller.removeEventListener('scrollend', finish)
      done()
    }
    const timer = setTimeout(finish, 500)
    scroller.addEventListener('scrollend', finish)
    scroller.scrollTo({ left: target, behavior: 'smooth' })
  })
}

const scrollers = (card: HTMLElement) =>
  [...([...card.querySelectorAll('*')].find((n) => n.shadowRoot)?.shadowRoot?.querySelectorAll<HTMLElement>('[data-code]') ?? [])]

// Slide every code block of the card back to its leftmost position.
const scrollHome = (card: HTMLElement) => Promise.all(scrollers(card).map((s) => scrollCode(s, 0))).then(() => {})

// Slide the code so the text `at` on `line` is in sight, measured from the leftmost position: if it already shows
// there, the code goes (or stays) home; otherwise it moves just far enough to clear the card's right edge.
function scrollToText(card: HTMLElement, line: number, at: string): Promise<void> {
  const root = [...card.querySelectorAll('*')].find((n) => n.shadowRoot)?.shadowRoot
  const row = root?.querySelector<HTMLElement>(`[data-line="${line}"]:not([data-line-type*="deletion"])`)
  const scroller = row?.closest<HTMLElement>('[data-code]')
  const text = row && textRect(row, at)
  if (!scroller || !text) return Promise.resolve()
  const box = scroller.getBoundingClientRect()
  const right = text.right - box.left + scroller.scrollLeft // where the text ends when the code is at its leftmost
  const visible = scroller.clientWidth - 16
  return scrollCode(scroller, right > visible ? right - visible + 24 : 0)
}

// The on-screen box of the text `at` within a code row.
const textRect = (row: HTMLElement, at: string) => textRange(row, at)?.getBoundingClientRect() ?? null

// A DOM range over the text `at` within a code row (highlighting splits code into many spans).
function textRange(row: HTMLElement, at: string): Range | null {
  const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  let text = ''
  while (walker.nextNode()) {
    nodes.push(walker.currentNode as Text)
    text += (walker.currentNode as Text).data
  }
  const start = text.indexOf(at)
  if (start < 0) return null
  const range = document.createRange()
  let seen = 0
  for (const n of nodes) {
    const len = n.data.length
    if (start >= seen && start <= seen + len) range.setStart(n, start - seen)
    if (start + at.length >= seen && start + at.length <= seen + len) {
      range.setEnd(n, start + at.length - seen)
      break
    }
    seen += len
  }
  return range
}

// Bring a code row to the middle of the page's scroller, but never past its step's own edges: the step's guide (with
// the note list) is pinned only while the step fills the screen, so scrolling beyond would slide the list away from
// the pointer. A row near a step's start or end lands near the top or bottom instead of the middle.
function scrollToRow(card: HTMLElement, row: Element) {
  const main = card.closest('main')
  const step = card.closest('.step')
  if (!main || !step) return
  const view = main.getBoundingClientRect()
  const at = (el: Element) => el.getBoundingClientRect().top - view.top + main.scrollTop // in scroller coordinates
  const r = row.getBoundingClientRect()
  const start = at(step)
  const end = start + step.getBoundingClientRect().height - main.clientHeight
  const top = Math.min(Math.max(at(row) + r.height / 2 - main.clientHeight / 2, start), Math.max(start, end))
  main.scrollTo({ top, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
}

// One file of a step, rendered by @pierre/diffs, with its line notes drawn in the margin. Test files without notes
// start collapsed to their header; clicking the header opens or closes the file.
type Props = {
  hunk: Hunk
  theme: Theme
  codeTheme: CodeTheme
  noteLayout: string
  mode: NotesMode
  // List mode only: which of this file's notes the list has focused (reveal counts clicks, to scroll its line into view),
  // (its note is then also written at the text in the code).
  listFocus: { note: number; reveal: number } | null
  viewed: boolean // ticked in the header: the file is collapsed and counts as done
  onViewed: (viewed: boolean) => void
}

export function FileDiff({ hunk, theme, codeTheme, noteLayout, mode, listFocus, viewed: viewedProp, onViewed }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const diffRef = useRef<{ setThemeType: (t: Theme) => void } | null>(null)
  const themeRef = useRef(theme)
  const [targets, setTargets] = useState<(Target | null)[]>([])
  const [cardWidth, setCardWidth] = useState(0)
  const [mark, setMark] = useState<TextBox[]>([])
  const viewedRef = useRef(viewedProp)
  const onViewedRef = useRef(onViewed)
  useEffect(() => {
    onViewedRef.current = onViewed
  }, [onViewed])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let viewed = viewedRef.current
    let collapsed = viewed || ((isTest(hunk.file) || !!hunk.isDeleted) && hunk.notes.length === 0)
    const options = (): ConstructorParameters<typeof PierreFileDiff>[0] => ({
      theme: { light: codeTheme.light, dark: codeTheme.dark },
      themeType: themeRef.current,
      diffStyle: 'unified',
      diffIndicators: 'bars',
      hunkSeparators: 'simple',
      lineDiffType: 'word',
      overflow: 'wrap', // long lines fold onto the next row; nothing scrolls sideways
      stickyHeader: true,
      collapsed,
      unsafeCSS: HEADER_CSS,
      renderHeaderPrefix: () => chevron(collapsed),
      renderHeaderMetadata: () => viewedBox(viewed),
    })
    const diff = new PierreFileDiff(options())
    diffRef.current = diff
    diff.render({ fileDiff: getSingularPatch(hunk.patch), containerWrapper: el })

    // Re-read where each noted line ends whenever the file block changes size (render, highlight, collapse).
    const measure = () => {
      if (!hunk.notes.length || !boxRef.current) return
      const box = boxRef.current.getBoundingClientRect()
      setCardWidth(el.offsetWidth)
      setTargets(hunk.notes.map((n) => (collapsed ? null : lineEdge(el, box, n.line))))
    }
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    document.fonts.ready.then(measure)

    const onClick = (e: MouseEvent) => {
      const path = e.composedPath()
      if (path.some((n) => n instanceof Element && n.hasAttribute('data-viewed'))) {
        viewed = !viewed
        collapsed = viewed
        viewedRef.current = viewed
        onViewedRef.current(viewed)
        diff.setOptions(options())
        diff.rerender()
        return
      }
      if (!path.some((n) => n instanceof Element && n.hasAttribute('data-diffs-header'))) return
      collapsed = !collapsed
      diff.setOptions(options())
      diff.rerender()
    }
    el.addEventListener('click', onClick)
    return () => {
      ro.disconnect()
      el.removeEventListener('click', onClick)
      diff.cleanUp()
      el.replaceChildren()
    }
  }, [hunk, codeTheme.light, codeTheme.dark])

  // Follow light / dark: the diff swaps its syntax theme in place.
  useEffect(() => {
    themeRef.current = theme
    diffRef.current?.setThemeType(theme)
  }, [theme])

  // Hovering a note: keep its line sharp, blur the rest, slide the code sideways if the text is out of sight, then
  // highlight the exact text once the code is at rest. Leaving clears it and slides the code back to its leftmost.
  const hover = useRef(0)
  const onFocus = useCallback(
    async (i: number | null) => {
      const el = ref.current
      if (!el || !boxRef.current) return
      const token = ++hover.current
      setMark([])
      focusLine(el, i === null ? null : hunk.notes[i].line)
      if (i === null) return scrollHome(el)
      const note = hunk.notes[i]
      await scrollToText(el, note.line, note.at)
      if (token !== hover.current) return // the pointer already moved on
      setMark(textBoxes(el, boxRef.current.getBoundingClientRect(), note.line, note.at))
    },
    [hunk],
  )

  // List mode: the list on the left drives the same focus, and brings the line into view: on hover only if it is
  // not already comfortably on screen (so moving down the list doesn't bounce the page), on click always centred.
  useEffect(() => {
    if (mode === 'list') onFocus(listFocus?.note ?? null)
  }, [mode, listFocus?.note, onFocus])
  useEffect(() => {
    if (mode !== 'list' || !listFocus || !ref.current) return
    const root = [...ref.current.querySelectorAll('*')].find((n) => n.shadowRoot)?.shadowRoot
    const row = root?.querySelector(`[data-line="${hunk.notes[listFocus.note].line}"]:not([data-line-type*="deletion"])`)
    if (!row) return
    const r = row.getBoundingClientRect()
    const comfortable = r.top > 120 && r.bottom < innerHeight - 120
    if (listFocus.reveal || !comfortable) scrollToRow(ref.current, row)
  }, [mode, listFocus?.note, listFocus?.reveal]) // eslint-disable-line react-hooks/exhaustive-deps

  // Margin mode: every file keeps the same margin, so cards line up whether or not a file has notes. List mode: the
  // card takes the full width.
  return (
    <div
      ref={boxRef}
      className={cn(
        'relative mb-4 grid',
        mode === 'margin' ? 'grid-cols-[minmax(0,1fr)_270px]' : 'grid-cols-1',
      )}
    >
      {/* overflow: clip (not hidden) rounds the corners without making the card a scroll container, so the diff's
          sticky file header sticks to the page while its file scrolls past. */}
      <div ref={ref} className="min-w-0 overflow-clip rounded-[10px] border bg-background" />
      {mode === 'margin' && hunk.notes.length > 0 && (
        <SketchNotes notes={hunk.notes} targets={targets} marginLeft={cardWidth} layout={noteLayout} onFocus={onFocus} />
      )}
      {mark.length > 0 && (
        // Clipped to the card, so a highlight never spills over the margin.
        <div className="pointer-events-none absolute inset-y-0 left-0 overflow-hidden" style={{ width: cardWidth }}>
          {mark.map((b) => (
            <TextHighlight key={`${b.top}-${b.left}`} box={b} />
          ))}
          {mode === 'list' && listFocus && (
            <InlineNote key={listFocus.note} text={hunk.notes[listFocus.note].text} box={mark[0]} width={cardWidth} />
          )}
        </div>
      )}
    </div>
  )
}
