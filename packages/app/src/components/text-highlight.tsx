// While a note is hovered, a highlighter swipe over the exact text it is about. Yellow, multiplied, in light mode so the
// code reads through it; a neutral translucent white in dark (--highlight in index.css); wipes in from the left (.text-highlight).

// The exact text's box, relative to the file block.
export type TextBox = { left: number; right: number; top: number; bottom: number }

export function TextHighlight({ box }: { box: TextBox }) {
  return (
    <div
      className="text-highlight pointer-events-none absolute rounded-[3px] bg-(--highlight) [mix-blend-mode:var(--highlight-blend)]"
      style={{ left: box.left - 3, top: box.top - 1, width: box.right - box.left + 6, height: box.bottom - box.top + 2 }}
    />
  )
}
