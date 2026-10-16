import { useLayoutEffect, useRef, useState } from 'react'

import type { TextBox } from '@/components/text-highlight'

// While a list item is hovered (list mode), its note is also written in the code just above the exact text, a little
// to its right, with a pen arrow dropping onto it; below the text instead when there is no room above. Shown on every
// hover, so it draws fast (.inline-note in index.css): the arrow first, the words a beat later.

type Props = {
  text: string
  box: TextBox // the exact text (its first row if it wraps), relative to the file block
  width: number // the code card's width; the note stays inside it
}

type Layout = { left: number; top: number; path: string; head: string }

const HEADER = 46 // the file header; notes stay below it
const GAP = 26 // between the note and the line

export function InlineNote({ text, box, width }: Props) {
  const ref = useRef<HTMLParagraphElement>(null)
  const [layout, setLayout] = useState<Layout | null>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const w = el.offsetWidth
    const h = el.offsetHeight
    const cx = (box.left + box.right) / 2
    const clampX = (x: number) => Math.max(12, Math.min(x, width - w - 12))

    const below = box.top - GAP - h < HEADER
    const left = clampX(box.right + 28)
    const top = below ? box.bottom + GAP : box.top - GAP - h
    const fromLeft = left > cx
    const from = { x: fromLeft ? left - 6 : left + w + 6, y: below ? top + 11 : top + h - 9 }
    const tip = { x: cx, y: below ? box.bottom + 2 : box.top - 2 }
    setLayout({ left, top, ...pen(from, tip, below ? 'up' : 'down') })
  }, [text, box, width])

  return (
    <div className="inline-note pointer-events-none absolute inset-0">
      {layout && (
        <svg className="absolute inset-0 size-full overflow-visible" aria-hidden>
          <g fill="none" stroke="var(--ink)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
            <path className="shaft" d={layout.path} pathLength={100} />
            <path className="head" d={layout.head} pathLength={100} />
          </g>
        </svg>
      )}
      <p
        ref={ref}
        className="words absolute w-max max-w-[260px] [font-family:var(--font-note)] text-(length:--note-size,19px) leading-[1.15] [font-weight:var(--note-weight,500)] text-(--ink)"
        style={{ left: layout?.left ?? 0, top: layout?.top ?? 0, visibility: layout ? 'visible' : 'hidden' }}
      >
        {text}
      </p>
    </div>
  )
}

// A pen stroke with an open two-line arrowhead, arriving vertically onto the text from above ('down') or below ('up').
function pen(from: { x: number; y: number }, to: { x: number; y: number }, arrive: 'down' | 'up') {
  const c0 = { x: from.x + (to.x - from.x) * 0.6, y: from.y }
  const c = { x: to.x, y: to.y + (arrive === 'down' ? -1 : 1) * Math.max(14, Math.abs(from.y - to.y) * 0.5) }
  const a = Math.atan2(to.y - c.y, to.x - c.x)
  const wing = (s: number) => `${to.x - 10 * Math.cos(a + s)},${to.y - 10 * Math.sin(a + s)}`
  return {
    path: `M${from.x},${from.y} C${c0.x},${c0.y} ${c.x},${c.y} ${to.x},${to.y}`,
    head: `M${wing(0.5)} L${to.x},${to.y} L${wing(-0.5)}`,
  }
}
