import { cn } from '@/lib/utils'

// A step's notes, listed on the left under its title (list mode): numbered, each led by its number in Geist Mono.
// Hovering an item focuses its line in the code (line sharp, rest blurred, exact text highlighted, its note written
// at the text) and brings the line into view; clicking centres it.

export type ListItem = { hunk: number; note: number; num: number; file: string; line: number; text: string }

type Props = {
  items: ListItem[]
  active: { hunk: number; note: number } | null
  onHover: (item: ListItem | null) => void
  onPick: (item: ListItem) => void
}

export function NoteList(props: Props) {
  if (!props.items.length) return null
  // The pointer is tracked by position, not per-item enter/leave: an item becomes active only once the pointer is
  // a few pixels inside it, and near a border the active item stays as it is. So the active item can never flip
  // between two neighbours, and scrolling (which moves nothing under a still pointer here) never changes it. Items
  // have no CSS :hover look of their own; their background follows the active item, so the row, its number and the
  // code change together.
  const onMove = (e: React.MouseEvent<HTMLElement>) => {
    for (const b of e.currentTarget.querySelectorAll<HTMLElement>('[data-k]')) {
      const r = b.getBoundingClientRect()
      if (e.clientY < r.top + 3 || e.clientY > r.bottom - 3 || e.clientX < r.left || e.clientX > r.right) continue
      const item = props.items[+b.dataset.k!]
      if (props.active?.hunk !== item.hunk || props.active.note !== item.note) props.onHover(item)
      return
    }
  }
  return (
    <div onMouseMove={onMove} onMouseLeave={() => props.onHover(null)}>
      <Items {...props} />
    </div>
  )
}

function Items({ items, active, onHover, onPick }: Props) {
  const isActive = (i: ListItem) => active?.hunk === i.hunk && active.note === i.note
  const handlers = (i: ListItem) => ({
    'data-k': items.indexOf(i),
    onFocus: () => onHover(i), // keyboard
    onBlur: () => onHover(null),
    onClick: () => onPick(i),
  })
  // While one item is active the others step back, so the list echoes the blur on the code (instant: it tracks the
  // pointer). By colour, never opacity: a faded item is painted above its neighbours, and where two items share a
  // sub-pixel row the faded one would catch the pointer, swapping which item is active on every frame (a flicker).
  const dim = (i: ListItem) => active && !isActive(i) && 'text-muted-foreground/50'

  // A plain numbered list: each item led by its number and a dot in Geist Mono, matching the text's size. The list
  // sits flush with the title: the items' padding (which holds the active background) hangs outside it.
  return (
    // No gap between items: crossing one would leave every item for a moment and flicker the focus on the code.
    <ol className="-mx-2 mt-2">
      {items.map((i) => (
        <li key={`${i.hunk}-${i.note}`}>
          <button
            {...handlers(i)}
            className={cn('flex w-full cursor-pointer items-baseline gap-1.5 rounded-md px-2 py-1.5 text-left text-[14.5px] leading-snug text-muted-foreground', isActive(i) && 'bg-muted text-foreground', dim(i))}
          >
            <span className={cn('min-w-[2ch] shrink-0 font-mono text-[14.5px] text-muted-foreground/70', isActive(i) && 'text-foreground', dim(i))}>
              {i.num}.
            </span>
            {i.text}
          </button>
        </li>
      ))}
    </ol>
  )
}
