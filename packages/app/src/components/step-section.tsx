import { useRef, useState } from 'react'

import { FileDiff } from '@/components/file-diff'
import { NoteList, type ListItem } from '@/components/note-list'
import type { Step } from '@/data/types'
import type { NotesMode } from '@/lib/flags'
import type { Theme } from '@/lib/theme'
import type { CodeTheme } from '@/lib/tuning'

const pad = (n: number) => String(n).padStart(2, '0')

// How long the pointer rests on a note (list or code) before the code focuses on it.
const HOVER_DELAY = 200

type Props = {
  step: Step
  total: number
  theme: Theme
  codeTheme: CodeTheme
  noteLayout: string
  mode: NotesMode
}

// One step: the guide on the left stays pinned while its diffs scroll on the right. The guide holds only the
// counter and the title; everything that explains the change is a note on the line it explains.
// The guide's fade is scrubbed by scroll (see .step / .guide in index.css).
export function StepSection({ step, total, theme, codeTheme, noteLayout, mode }: Props) {
  // Files ticked "Viewed" in their headers; the step is reviewed once every file is.
  const [viewed, setViewed] = useState<Set<number>>(new Set())
  const reviewed = step.hunks.length > 0 && viewed.size === step.hunks.length
  // List mode: the step's notes, numbered across its files. `pointer` is the item under the pointer, shown on the list
  // row at once; `focus` is what the code shows (blur, highlight, note at the text, scroll), applied only after the
  // pointer has rested for HOVER_DELAY so sweeping across items triggers nothing. Leaving clears both at once; a click
  // focuses immediately.
  const [pointer, setPointer] = useState<{ hunk: number; note: number } | null>(null)
  const [focus, setFocus] = useState<{ hunk: number; note: number; reveal: number } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const items: ListItem[] = step.hunks.flatMap((h, hunk) => h.notes.map((n, note) => ({ hunk, note, num: 0, file: h.file, line: n.line, text: n.text })))
  items.forEach((i, k) => (i.num = k + 1))
  const hover = (hunk: number, note: number | null) => {
    clearTimeout(timer.current)
    if (note === null) {
      setPointer(null)
      setFocus(null)
      return
    }
    setPointer({ hunk, note })
    timer.current = setTimeout(() => setFocus({ hunk, note, reveal: 0 }), HOVER_DELAY)
  }

  return (
    <section id={`step-${step.n}`} className="step grid grid-cols-[minmax(380px,460px)_minmax(0,1fr)] border-b max-[900px]:grid-cols-1">
      <div className="guide sticky top-0 self-start px-8 pt-7 pb-14 max-[900px]:static">
        <div className="flex gap-1.5 font-mono text-[13px] text-muted-foreground/70">
          <span className="text-muted-foreground">{pad(step.n)}</span>
          <span>/ {pad(total)}</span>
          {reviewed && <span className="ml-2 text-(--stat-add)">✓ reviewed</span>}
        </div>
        <h1 className="mt-2 text-[30px] leading-[1.15] font-medium tracking-[-0.025em]">{step.title}</h1>
        {/* A diagram only when the step has one; most don't (see the schematic skill's fit test). */}
        {step.diagram && <div className="schematic mt-6" dangerouslySetInnerHTML={{ __html: step.diagram }} />}
        {mode === 'list' && items.length > 0 && (
          <p className="mt-7 text-[12.5px] font-medium text-muted-foreground/80">Hover a note to see it in the code</p>
        )}
        {mode === 'list' && (
          <NoteList
            items={items}
            active={pointer ?? focus}
            onHover={(i) => (i ? hover(i.hunk, i.note) : hover(0, null))} // null: left the list — clears the row, the pending timer and the code
            onPick={(i) => {
              clearTimeout(timer.current)
              setFocus({ hunk: i.hunk, note: i.note, reveal: (focus?.reveal ?? 0) + 1 })
            }}
          />
        )}
      </div>
      <div className="diffs min-h-[calc(100vh-56px)] border-l bg-(--panel) px-6 pt-5 pb-24">
        {step.hunks.map((h, hunk) => (
          <FileDiff
            key={h.file + h.patch.length}
            hunk={h}
            theme={theme}
            codeTheme={codeTheme}
            noteLayout={noteLayout}
            mode={mode}
            listFocus={focus?.hunk === hunk ? focus : null}
            viewed={viewed.has(hunk)}
            onViewed={(v) =>
              setViewed((prev) => {
                const next = new Set(prev)
                if (v) next.add(hunk)
                else next.delete(hunk)
                return next
              })
            }
          />
        ))}
      </div>
    </section>
  )
}
