import { useEffect } from 'react'

import type { Theme } from '@/lib/theme'

// The page's look, fixed (these were DialKit's defaults while it was being tuned). Note size, weight, width, ink and
// the hover highlight reach the page as CSS variables (--note-size, --note-weight, --note-width, --ink, --highlight);
// the code theme pair goes to every diff.
const LOOK = {
  code: { light: 'pierre-light', dark: 'pierre-dark' },
  notes: { size: 19, weight: 500, width: 220, inkLight: '#1f1f1f', inkDark: '#e5e5e5' },
  // The hover highlight on a note's exact text. Light mode multiplies it over the code; dark lays it on top.
  highlight: { light: '#ffd84d', lightOpacity: 0.7, dark: '#ffffff33', darkOpacity: 1 },
}

export type CodeTheme = { light: string; dark: string }

export function useTuning(theme: Theme) {
  useEffect(() => {
    const s = document.documentElement.style
    s.setProperty('--note-size', `${LOOK.notes.size}px`)
    s.setProperty('--note-weight', String(LOOK.notes.weight))
    s.setProperty('--note-width', `${LOOK.notes.width}px`)
    s.setProperty('--ink', theme === 'dark' ? LOOK.notes.inkDark : LOOK.notes.inkLight)
    const [colour, opacity] = theme === 'dark' ? [LOOK.highlight.dark, LOOK.highlight.darkOpacity] : [LOOK.highlight.light, LOOK.highlight.lightOpacity]
    s.setProperty('--highlight', `color-mix(in srgb, ${colour} ${Math.round(opacity * 100)}%, transparent)`)
  }, [theme])

  return {
    codeTheme: LOOK.code as CodeTheme,
    // Changes whenever a note's box may change size, so notes re-stack.
    noteLayout: `${LOOK.notes.size}/${LOOK.notes.weight}/${LOOK.notes.width}`,
  }
}
