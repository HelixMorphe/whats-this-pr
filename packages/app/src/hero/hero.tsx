// the summary at the top of a PR's page: the title centred, then its sequence diagram with
// the inputs under it (interactive.tsx). Each PR's hero is data: src/data/<base>.hero.json (hero-data.ts).
import type { HeroData } from './hero-data'
import { SequenceScenarios } from './interactive'

export function Hero({ hero }: { hero: HeroData }) {
  return (
    <section className="flex min-h-[60dvh] flex-col items-center justify-center border-b px-10 py-10 text-center">
      <h1 className="max-w-[30ch] text-[40px] leading-[1.08] font-medium tracking-[-0.035em] text-balance">{hero.title}</h1>
      <div className="mt-10 w-full max-w-[760px]">
        <SequenceScenarios hero={hero} />
      </div>
    </section>
  )
}
