// the controls under a hero's diagram. The `before` switch, if the hero has one, is the
// Before / With this PR tabs, centred. The other inputs are a table, one row each: the label left, the choices as pills
// right (a switch reads Yes / No). A row that doesn't apply stays in place, faded, with an ⓘ that says why.
import { useState } from 'react'
import { motion } from 'motion/react'

import { applies, BEFORE, matches, whens, type HeroInput, type HeroState } from './hero-data'

const SPRING = { type: 'spring', duration: 0.4, bounce: 0.15 } as const
const caps = 'font-mono text-[11px] tracking-[0.08em]'

type Choice = { value: string | boolean; label: string }
const choices = (i: HeroInput): Choice[] =>
  i.kind === 'choice' ? i.options : [{ value: true, label: 'Yes' }, { value: false, label: 'No' }]
const labelOf = (i: HeroInput) => i.label ?? i.id.toUpperCase()
const plain = (t: string) => t.charAt(0) + t.slice(1).toLowerCase()

// Why a row doesn't apply, from the first of its disabledWhen that holds: "Saved impression is Older version".
function whyOff(inputs: HeroInput[], i: HeroInput, s: HeroState) {
  const w = whens(i.disabledWhen).find((w) => matches(w, s))
  if (!w) return ''
  return Object.keys(w)
    .map((k) => {
      const x = inputs.find((y) => y.id === k)
      if (!x) return k
      return `${plain(labelOf(x))} is ${choices(x).find((c) => c.value === s[k])?.label ?? String(s[k])}`
    })
    .join(' and ')
}

export function BeforeTabs({ before, set }: { before: boolean; set: (b: boolean) => void }) {
  return (
    <div className="flex gap-1 rounded-full border p-1 text-[13px]">
      {(
        [
          [true, 'Before this PR'],
          [false, 'With this PR'],
        ] as const
      ).map(([val, label]) => (
        <button
          key={label}
          onClick={() => set(val)}
          aria-pressed={before === val}
          className={`relative rounded-full px-4 py-1.5 transition-colors duration-150 ${before === val ? 'text-background' : 'text-muted-foreground hover:text-foreground'}`}
        >
          {before === val && <motion.span layoutId="before-tab" className="absolute inset-0 rounded-full bg-foreground" transition={SPRING} />}
          <span className="relative">{label}</span>
        </button>
      ))}
    </div>
  )
}

function Pills({ i, value, off, pick }: { i: HeroInput; value: unknown; off: boolean; pick: (v: string | boolean) => void }) {
  return (
    <div
      role="radiogroup"
      aria-label={plain(labelOf(i))}
      className={`flex w-fit gap-1 rounded-full border p-1 text-[12px] transition-opacity duration-200 ${off ? 'opacity-30' : ''}`}
    >
      {choices(i).map((c) => {
        const picked = value === c.value
        return (
          <button
            key={String(c.value)}
            role="radio"
            aria-checked={picked}
            disabled={off}
            onClick={() => pick(c.value)}
            className={`relative rounded-full px-3 py-1 transition-colors duration-150 disabled:cursor-default ${picked ? 'text-background' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {picked && <motion.span layoutId={`pill-${i.id}`} className="absolute inset-0 rounded-full bg-foreground" transition={SPRING} />}
            <span className="relative whitespace-nowrap">{c.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// The ⓘ by a faded row's label: the reason shows on hover, on keyboard focus, and on tap.
function Why({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <span
      className="relative inline-flex"
      onPointerEnter={(e) => e.pointerType === 'mouse' && setOpen(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setOpen(false)}
    >
      <button
        type="button"
        aria-label={`Why: ${text}`}
        aria-expanded={open}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((o) => !o)}
        className="grid size-4 cursor-help place-items-center rounded-full border text-[10px] leading-none text-muted-foreground hover:text-foreground"
      >
        i
      </button>
      {open && (
        <motion.span
          role="tooltip"
          initial={{ opacity: 0, y: 2 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute bottom-full left-0 z-20 mb-2 w-max max-w-[260px] rounded-md bg-foreground px-2.5 py-1.5 text-left text-[12px] text-background shadow-lg"
        >
          {text}
        </motion.span>
      )}
    </span>
  )
}

export function HeroControls({ inputs, state, onChange }: { inputs: HeroInput[]; state: HeroState; onChange: (s: HeroState) => void }) {
  const rows = inputs.filter((i) => i.id !== BEFORE)
  if (!rows.length) return null
  return (
    <div className="mx-auto w-full max-w-[560px] border-t">
      {rows.map((i) => {
        const off = !applies(i, state)
        return (
          <div key={i.id} className="flex min-h-[50px] items-center justify-between gap-6 border-b py-2">
            <span className="flex items-center gap-2 text-left">
              <span className={`${caps} transition-colors duration-200 ${off ? 'text-muted-foreground/40' : 'text-muted-foreground'}`}>{labelOf(i)}</span>
              {off && <Why text={`Not used when ${whyOff(inputs, i, state)}.`} />}
            </span>
            <Pills i={i} value={state[i.id]} off={off} pick={(v) => onChange({ ...state, [i.id]: v })} />
          </div>
        )
      })}
    </div>
  )
}
