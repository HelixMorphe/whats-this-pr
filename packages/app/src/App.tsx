import { ArrowUpRight, Moon, Sun } from 'lucide-react'

import { MechanicalSection } from '@/components/mechanical-section'
import { StepSection } from '@/components/step-section'
import { Button } from '@/components/ui/button'
import { currentPage } from '@/data/pages'
import { notesMode } from '@/lib/flags'
import { useTheme } from '@/lib/theme'
import { useTuning } from '@/lib/tuning'
import { Hero } from '@/hero/hero'

const { pr: PR, hero } = currentPage()

// The guided diff: one section per step of the PR; the left explains the step, the right is only its diffs.
// One page per PR (data/pages.ts), each from a real diff cut by a scripts/build-*.mjs. Nothing persists yet.
export default function App() {
  const { theme, toggle: toggleTheme } = useTheme()
  const { codeTheme, noteLayout } = useTuning(theme)

  return (
    <div className="grid h-dvh grid-rows-[auto_1fr] bg-background text-foreground">
      <header className="flex items-center gap-2.5 overflow-hidden border-b px-6 py-4 text-sm whitespace-nowrap text-muted-foreground">
        {/* Where the page came from, as the link to the PR, then the PR's own title. */}
        <a
          href={PR.url ?? `https://github.com/${PR.repo}/pull/${PR.number}`}
          target="_blank"
          rel="noreferrer"
          className="flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[12.5px] text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {PR.repo} #{PR.number}
          <ArrowUpRight className="size-3.5" />
        </a>
        <span className="truncate font-medium text-foreground">{PR.title}</span>
        <span className="font-mono text-[12.5px] text-(--stat-add)">+{PR.add}</span>
        <span className="font-mono text-[12.5px] text-(--stat-del)">−{PR.del}</span>
        <Button
          variant="ghost"
          size="icon-sm"
          className="-my-1 ml-auto text-muted-foreground"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun /> : <Moon />}
        </Button>
      </header>
      <main className="min-h-0 overflow-y-auto">
        <Hero hero={hero} />
        {PR.steps.map((step) => (
          <StepSection
            key={step.n}
            step={step}
            total={PR.steps.length}
            theme={theme}
            codeTheme={codeTheme}
            noteLayout={noteLayout}
            mode={notesMode}
          />
        ))}
        {PR.mechanical.length > 0 && <MechanicalSection groups={PR.mechanical} />}
      </main>
    </div>
  )
}
