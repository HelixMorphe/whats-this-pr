// The files a reviewer only needs to know about, after the steps: grouped (moves, lockfiles, docs), each group
// collapsed to one line with its reason; open it to see the files. Never shown as diffs.
import { ChevronRight } from 'lucide-react'

import type { MechanicalGroup } from '@/data/types'

export function MechanicalSection({ groups }: { groups: MechanicalGroup[] }) {
  const total = groups.reduce((n, g) => n + g.files.length, 0)
  return (
    <section className="grid grid-cols-[minmax(380px,460px)_minmax(0,1fr)] border-b max-[900px]:grid-cols-1">
      <div className="px-8 pt-7 pb-14">
        <div className="font-mono text-[13px] text-muted-foreground/70">also in this PR</div>
        <h1 className="mt-2 text-[30px] leading-[1.15] font-medium tracking-[-0.025em]">{total} files you don’t need to read</h1>
      </div>
      <div className="bg-(--panel) px-6 pt-7 pb-14">
        {groups.map((g) => (
          <details key={g.kind} className="group border-b py-3 last:border-b-0">
            <summary className="flex cursor-pointer list-none items-baseline gap-3 text-[14.5px] [&::-webkit-details-marker]:hidden">
              <ChevronRight className="size-3.5 shrink-0 translate-y-0.5 text-muted-foreground transition-transform duration-150 group-open:rotate-90" />
              <span className="font-medium">{g.kind}</span>
              <span className="font-mono text-[12.5px] text-muted-foreground">{g.files.length}</span>
              <span className="text-muted-foreground">{g.why}</span>
            </summary>
            <ul className="mt-3 space-y-1 pl-6.5 font-mono text-[12.5px]">
              {g.files.map((f) => (
                <li key={f.file} className="flex gap-3">
                  <span className="min-w-0 truncate">
                    {f.from && <span className="text-muted-foreground">{f.from} → </span>}
                    {f.file}
                  </span>
                  <span className="ml-auto shrink-0 text-muted-foreground">
                    {f.add > 0 && <span className="text-(--stat-add)">+{f.add}</span>} {f.del > 0 && <span className="text-(--stat-del)">−{f.del}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </section>
  )
}
