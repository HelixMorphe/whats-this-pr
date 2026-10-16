// a hero's sequence diagram, played by its inputs. Change an input below the diagram; the
// messages the matching rules show light up, and the rest fall back.
import { useMemo, useState } from 'react'
import { MotionConfig } from 'motion/react'

import { BeforeTabs, HeroControls } from './controls'
import { BEFORE, play, toSpec, type HeroData } from './hero-data'
import { Sequence, type Tone } from './sequence'

export function SequenceScenarios({ hero }: { hero: HeroData }) {
  const [state, setState] = useState(hero.initial)
  const spec = useMemo(() => toSpec(hero.diagram), [hero])
  const hasBefore = hero.inputs.some((i) => i.id === BEFORE)
  const before = state[BEFORE] === true
  const r = play(hero, state)
  // A call is ink when this case makes it and faint otherwise, the same on both tabs. On the Before tab, a call this
  // case only makes with the PR is hidden: it didn't happen yet. So a case the PR doesn't change looks the same twice.
  const gained = before ? play(hero, { ...state, [BEFORE]: false }).show : new Set<string>()
  const tones: Record<string, Tone> = Object.fromEntries(spec.messages.map((m) => [m.id, r.show.has(m.id) ? 'ink' : gained.has(m.id) ? 'hide' : 'off']))
  const hot = hero.diagram.participants.filter((p) => r.hot.has(p.id)).map((p) => p.name)
  // Reduced motion: Motion keeps opacity and colour, drops the movement.
  return (
    <MotionConfig reducedMotion="user">
      <Sequence spec={spec} tones={tones} labels={r.labels} hot={hot} frameTone={r.frame} status={r.status} />
      {hasBefore && (
        <div className="mt-6 flex justify-center">
          <BeforeTabs before={before} set={(b) => setState({ ...state, [BEFORE]: b })} />
        </div>
      )}
      <div className="mt-8">
        <HeroControls inputs={hero.inputs} state={state} onChange={setState} />
      </div>
    </MotionConfig>
  )
}
