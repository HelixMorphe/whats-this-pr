// The app's built template goes into the npm package, which ships it (packages/cli/template.html).
import { copyFileSync, statSync } from 'node:fs'

const from = 'packages/app/dist-template/template.html'
const to = 'packages/cli/template.html'
copyFileSync(from, to)
console.log(`copied ${from} → ${to} (${(statSync(to).size / 1024 / 1024).toFixed(2)} MB)`)
