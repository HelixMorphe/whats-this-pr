// One page per PR, at /<owner>/<repo>/<number>; `/` shows the first. Each page is two data files: the PR
// (<base>.json) and its hero (<base>.hero.json). These six are the open-source reference pages.
import type { HeroData } from '@/hero/hero-data'
import caddy8168Data from './caddy-8168.json'
import caddy8168Hero from './caddy-8168.hero.json'
import hono4915Data from './hono-4915.json'
import hono4915Hero from './hono-4915.hero.json'
import undici5683Data from './undici-5683.json'
import undici5683Hero from './undici-5683.hero.json'
import starlette3435Data from './starlette-3435.json'
import starlette3435Hero from './starlette-3435.hero.json'
import uvicorn3195Data from './uvicorn-3195.json'
import uvicorn3195Hero from './uvicorn-3195.hero.json'
import gin4805Data from './gin-4805.json'
import gin4805Hero from './gin-4805.hero.json'
import type { PullRequest } from './types'

export type Page = { pr: PullRequest; hero: HeroData }

// JSON widens its literals ("ab" to string), so each hero is cast: nothing checks its shape at compile time.
export const PAGES: Page[] = [
  { pr: caddy8168Data as unknown as PullRequest, hero: caddy8168Hero as unknown as HeroData },
  { pr: hono4915Data as unknown as PullRequest, hero: hono4915Hero as unknown as HeroData },
  { pr: undici5683Data as unknown as PullRequest, hero: undici5683Hero as unknown as HeroData },
  { pr: starlette3435Data as unknown as PullRequest, hero: starlette3435Hero as unknown as HeroData },
  { pr: uvicorn3195Data as unknown as PullRequest, hero: uvicorn3195Hero as unknown as HeroData },
  { pr: gin4805Data as unknown as PullRequest, hero: gin4805Hero as unknown as HeroData },
]

export const pathOf = (p: Page) => `/${p.pr.repo}/${p.pr.number}`
// An artifact build fixes the page at build time (VITE_PAGE, see scripts/build-artifact.mjs): an artifact can't route by path.
const here = () => import.meta.env.VITE_PAGE ?? location.pathname.replace(/\/$/, '')
export const currentPage = () => PAGES.find((p) => here() === pathOf(p)) ?? PAGES[0]
