import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appDir = path.resolve(__dirname, '../src/app')

const forbidden = ['(desktop)', '(tablet)', '(mobile)']
const required = ['(storefront)', '(account)', '(auth)']

const errors = []

for (const name of forbidden) {
  if (fs.existsSync(path.join(appDir, name))) {
    errors.push(`Forbidden route group still present: ${name}`)
  }
}

for (const name of required) {
  if (!fs.existsSync(path.join(appDir, name))) {
    errors.push(`Required route group missing: ${name}`)
  }
}

// Root app/page.tsx would conflict with (storefront)/page.tsx on URL `/`
if (fs.existsSync(path.join(appDir, 'page.tsx'))) {
  errors.push('Remove apps/web/src/app/page.tsx — `/` must live under (storefront)/page.tsx only')
}

if (errors.length > 0) {
  console.error('assert-site-zones failed:\n' + errors.map((e) => ` - ${e}`).join('\n'))
  process.exit(1)
}

console.log('assert-site-zones: OK')
