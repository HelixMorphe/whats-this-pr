// The artifact template's page: no PR is built in. scripts/make-page.mjs writes the PR and its hero into the published
// file as two JSON blocks, read here once the document has parsed (the inlined app is a module script, so deferred).
import type { PullRequest } from '@/data/types'
import type { HeroData } from '@/hero/hero-data'

const read = <T,>(id: string) => JSON.parse(document.getElementById(id)?.textContent ?? 'null') as T

export const PAGES = [{ pr: read<PullRequest>('pr-data'), hero: read<HeroData>('pr-hero') }]
export const pathOf = () => `/${PAGES[0].pr.repo}/${PAGES[0].pr.number}`
export const currentPage = () => PAGES[0]
