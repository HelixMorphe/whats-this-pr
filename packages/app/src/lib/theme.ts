import { useEffect, useState } from 'react'

// Light or dark. Follows the system until the viewer picks one with the toggle; the pick is remembered in this
// browser (a convenience only: storage can be unavailable, so every access is guarded). index.html applies the same
// choice before the first paint, so dark mode never flashes white.
export type Theme = 'light' | 'dark'

const KEY = 'theme'
const stored = (): Theme | null => {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : null
  } catch {
    return null
  }
}
const dark = () => matchMedia('(prefers-color-scheme: dark)')
// Published as a Claude artifact, the viewer's own theme pick is stamped on the root as data-theme; it stands in for
// the system setting (a pick made with this page's toggle still wins).
const stamped = (): Theme | null => {
  const v = document.documentElement.dataset.theme
  return v === 'light' || v === 'dark' ? v : null
}
const system = (): Theme => stamped() ?? (dark().matches ? 'dark' : 'light')

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => stored() ?? system())

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.style.colorScheme = theme
  }, [theme])

  // While nothing is picked, keep following the system (or the viewer's stamp, which can change while the page is open).
  useEffect(() => {
    const mq = dark()
    const follow = () => stored() ?? setTheme(system())
    mq.addEventListener('change', follow)
    const mo = new MutationObserver(follow)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => {
      mq.removeEventListener('change', follow)
      mo.disconnect()
    }
  }, [])

  const toggle = () =>
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem(KEY, next)
      } catch {
        // not remembered; still switches for this visit
      }
      return next
    })

  return { theme, toggle }
}
