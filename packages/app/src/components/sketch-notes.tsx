import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'

import { cn } from '@/lib/utils'
import type { Note } from '@/data/types'

// Where a note's arrow lands: just outside the code card, level with its line, relative to the file block.
export type Target = { x: number; y: number }

type Placed = { top: number; path: string; head: string }

const MARGIN_GAP = 40 // between the code card and the note column: room for the short arrow
const STAGGER = 90 // ms between one note's entrance and the next

type Props = {
  notes: Note[]
  targets: (Target | null)[]
  marginLeft: number
  layout: string // changes when the notes' size, weight or width does, so they re-stack
  onFocus: (note: number | null) => void
}

// Hand-drawn margin notes: each note says one thing, is written in the margin beside the code, and a short curved
// arrow runs from the note to the card's edge at its line; nothing is drawn over the code. Notes never overlap; a
// note pushed down still points at its own line.
// Motion (see .sketch in index.css): the first time the file scrolls into view, each arrow is drawn from the note to
// the code and then its words appear, one note after another. Hovering a note keeps its line sharp and blurs the rest.
export function SketchNotes({ notes, targets, marginLeft, layout, onFocus }: Props) {
  const wrap = useRef<HTMLDivElement>(null)
  const refs = useRef<(HTMLParagraphElement | null)[]>([])
  const [placed, setPlaced] = useState<(Placed | null)[]>([])
  const [seen, setSeen] = useState(false)
  const [active, setActive] = useState<number | null>(null)

  useLayoutEffect(() => {
    let floor = 0
    setPlaced(
      notes.map((_, i) => {
        const t = targets[i]
        const h = refs.current[i]?.offsetHeight ?? 0
        if (!t) return null
        const top = Math.max(t.y - 11, floor)
        floor = top + h + 16
        return arrow({ x: marginLeft + MARGIN_GAP - 8, y: top + 13 }, t, top)
      }),
    )
  }, [notes, targets, marginLeft, layout])

  // Play the entrance once, as the file arrives (a little before it is fully in view); never again on scroll-up.
  useEffect(() => {
    const el = wrap.current
    if (!el || seen) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        setSeen(true)
        io.disconnect()
      },
      { rootMargin: '0px 0px -15% 0px', threshold: 0 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [seen])

  const focus = (i: number | null) => {
    setActive(i)
    onFocus(i)
  }
  const ready = seen && placed.some(Boolean)

  return (
    <div ref={wrap} className={cn('sketch pointer-events-none absolute inset-0', ready && 'in', active !== null && 'focusing')}>
      <svg className="absolute inset-0 size-full overflow-visible" aria-hidden>
        {placed.map((p, i) =>
          p ? (
            <g
              key={i}
              className={cn('arrow', active === i && 'active')}
              style={{ '--d': `${i * STAGGER}ms` } as CSSProperties}
              fill="none"
              stroke="var(--ink)"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path className="shaft" d={p.path} pathLength={100} />
              <path className="head" d={p.head} pathLength={100} />
            </g>
          ) : null,
        )}
      </svg>
      {notes.map((n, i) => (
        <p
          key={i}
          ref={(e) => {
            refs.current[i] = e
          }}
          title={n.at}
          onMouseEnter={() => focus(i)}
          onMouseLeave={() => focus(null)}
          className={cn(
            'note pointer-events-auto absolute w-(--note-width,220px) cursor-default [font-family:var(--font-note)] text-(length:--note-size,19px) leading-[1.15] [font-weight:var(--note-weight,500)] text-(--ink)',
            active === i && 'active',
          )}
          style={
            {
              left: marginLeft + MARGIN_GAP,
              top: placed[i]?.top ?? 0,
              visibility: placed[i] ? 'visible' : 'hidden',
              '--d': `${i * STAGGER}ms`,
            } as CSSProperties
          }
        >
          <span>{n.text}</span>
        </p>
      ))}
    </div>
  )
}

// A curve that leaves the note heading left, bends, and arrives at the code travelling level, with an open
// two-stroke arrowhead, like a pen stroke.
function arrow(from: Target, to: Target, top: number): Placed {
  const dx = Math.max(from.x - to.x, 24)
  const dy = to.y - from.y
  const c0 = { x: from.x - dx * 0.15, y: from.y + dy * 0.75 + 6 }
  const c = { x: to.x + dx * 0.45, y: to.y }
  const path = `M${from.x},${from.y} C${c0.x},${c0.y} ${c.x},${c.y} ${to.x},${to.y}`
  const a = Math.atan2(to.y - c.y, to.x - c.x)
  const wing = (s: number) => `${to.x - 11 * Math.cos(a + s)},${to.y - 11 * Math.sin(a + s)}`
  return { top, path, head: `M${wing(0.5)} L${to.x},${to.y} L${wing(-0.5)}` }
}
