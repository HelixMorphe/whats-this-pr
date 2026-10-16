// a hero's sequence diagram as React SVG, so each message can be lit and dimmed.
// Same vocabulary as the schematic kit: monospace, square boxes, dotted lifelines, open arrowheads, ink / dim.
// The diagram itself (participants, messages, the alt frame) is data, from each PR's hero (hero-data.ts).
import { motion } from 'motion/react'

import type { Status } from './hero-data'

export type Tone = 'ink' | 'dim' | 'off' | 'hide' // hide: a call this case doesn't make on the tab shown

export type Message = { id: string; from: number; to: number; y: number; text: string; reply?: boolean; labelX?: number }
export type SeqSpec = {
  view: { w: number; h: number }
  top: number // participants' boxes
  end: number // where the lifelines stop
  participants: { x: number; name: string }[]
  messages: Message[]
  frame?: { x: number; y: number; w: number; h: number; kind: string; branches: { label: string; y?: number }[] } // later branches: a divider at y
  label: string // for screen readers: what the diagram shows
}

const color = (t: Tone) => (t === 'ink' ? 'var(--sx-ink)' : 'var(--sx-dim)')
// A lit message whose outcome is the point (status ok / error) is green or red; everything else stays ink and grey.
const outcome = (s?: Status) => (s === 'ok' ? 'var(--sx-ok)' : s === 'error' ? 'var(--sx-err)' : undefined)
const opacity = (t: Tone) => (t === 'hide' ? 0 : t === 'off' ? 0.22 : 1)
const SPRING = { type: 'spring', duration: 0.5, bounce: 0 } as const
// The entrance, once, everything at the same time: boxes and frame fade in while every line draws out of its sender,
// then arrowheads and labels appear. After that a change of case only crossfades tones; nothing redraws.
const EASE_OUT = [0.19, 1, 0.22, 1] as const
const fadeIn = (delay = 0) => ({ initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.35, delay, ease: EASE_OUT } })
const caps = { letterSpacing: '0.08em' }
const tabWidth = (s: string) => s.length * 11.5 * 0.68 + 20

type Props = {
  spec: SeqSpec
  tones?: Record<string, Tone> // per message id; default dim
  labels?: Record<string, string> // per message id, replacing its text
  hot?: string[] // participants drawn ink
  frameTone?: Tone
  status?: Record<string, Status> // per message id: how that call ended
}

export function Sequence({ spec, tones = {}, labels = {}, hot = [], frameTone = 'dim', status = {} }: Props) {
  const f = spec.frame
  return (
    <svg viewBox={`0 0 ${spec.view.w} ${spec.view.h}`} width="100%" fontFamily="var(--sx-font)" role="img" aria-label={spec.label}>
      {spec.participants.map((p) => {
        const t: Tone = hot.includes(p.name) ? 'ink' : 'dim'
        return (
          <motion.g key={p.name} {...fadeIn()}>
            <line
              x1={p.x}
              y1={spec.top + 56}
              x2={p.x}
              y2={spec.end}
              stroke="var(--sx-dim)"
              strokeWidth={1.25}
              strokeDasharray="1 4"
              strokeLinecap="round"
            />
            <rect
              x={p.x - 85}
              y={spec.top}
              width={170}
              height={56}
              fill="var(--sx-paper)"
              stroke={color(t)}
              strokeWidth={t === 'ink' ? 1.75 : 1.25}
              style={{ transition: 'stroke 200ms ease' }}
            />
            <text x={p.x} y={spec.top + 28} fontSize={13} textAnchor="middle" dominantBaseline="central" fill={color(t)} style={caps}>
              {p.name}
            </text>
          </motion.g>
        )
      })}
      {f && (
        <motion.g {...fadeIn(0.15)}>
          <motion.g initial={false} animate={{ opacity: opacity(frameTone) }} transition={SPRING}>
            <rect
              x={f.x}
              y={f.y}
              width={f.w}
              height={f.h}
              fill="none"
              stroke="var(--sx-dim)"
              strokeWidth={1.25}
              strokeDasharray="1 4"
              strokeLinecap="round"
            />
            <rect x={f.x} y={f.y} width={tabWidth(f.kind)} height={22} fill="var(--sx-paper)" stroke="var(--sx-dim)" strokeWidth={1.25} />
            <text x={f.x + 10} y={f.y + 11} fontSize={11.5} dominantBaseline="central" fill="var(--sx-dim)" style={caps}>
              {f.kind.toUpperCase()}
            </text>
            {f.branches.map((b, i) =>
              i === 0 ? (
                <text
                  key={b.label}
                  x={f.x + tabWidth(f.kind) + 10}
                  y={f.y + 11}
                  fontSize={11.5}
                  dominantBaseline="central"
                  fill="var(--sx-dim)"
                  style={caps}
                >
                  {b.label.toUpperCase()}
                </text>
              ) : (
                <g key={b.label}>
                  <line
                    x1={f.x}
                    y1={b.y}
                    x2={f.x + f.w}
                    y2={b.y}
                    stroke="var(--sx-dim)"
                    strokeWidth={1.25}
                    strokeDasharray="1 4"
                    strokeLinecap="round"
                  />
                  <text x={f.x + 10} y={b.y! + 14} fontSize={11.5} dominantBaseline="central" fill="var(--sx-dim)" style={caps}>
                    {b.label.toUpperCase()}
                  </text>
                </g>
              ),
            )}
          </motion.g>
        </motion.g>
      )}
      {spec.messages.map((m) => {
        const t = tones[m.id] ?? 'dim'
        const dir = Math.sign(m.to - m.from)
        const d = `M${m.from},${m.y} L${m.to},${m.y}`
        const headD = `M${m.to - dir * 7},${m.y - 4.5} L${m.to},${m.y} L${m.to - dir * 7},${m.y + 4.5}`
        const c = (t === 'ink' && outcome(status[m.id])) || color(t)
        return (
          <motion.g key={m.id} initial={false} animate={{ opacity: opacity(t) }} transition={SPRING}>
            <motion.path
              d={d}
              fill="none"
              stroke={c}
              strokeWidth={t === 'ink' ? 1.6 : 1.25}
              strokeLinecap="round"
              strokeDasharray={m.reply ? '1 4' : undefined}
              // Drawn in by scaling from the sender's end (pathLength would overwrite the reply's dots). The origin goes in
              // `initial`: Motion resets an SVG transformOrigin set in `style` to the centre.
              initial={{ scaleX: 0, transformOrigin: dir > 0 ? 'left center' : 'right center' }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.6, delay: 0.1, ease: EASE_OUT }}
              style={{ transition: 'stroke 200ms ease' }}
            />
            <motion.path
              d={headD}
              fill="none"
              stroke={c}
              strokeWidth={1.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transition: 'stroke 200ms ease' }}
              {...fadeIn(0.4)}
            />
            <motion.text
              x={m.labelX ?? (m.from + m.to) / 2}
              y={m.y - 14}
              fontSize={13}
              textAnchor="middle"
              dominantBaseline="central"
              fill={c}
              style={{ transition: 'fill 200ms ease' }}
              {...fadeIn(0.3)}
            >
              {labels[m.id] ?? m.text}
            </motion.text>
          </motion.g>
        )
      })}
    </svg>
  )
}
