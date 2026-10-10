import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appDir = path.resolve(__dirname, '../src/app')
const srcDir = path.resolve(__dirname, '../src')

const forbidden = ['(desktop)', '(tablet)', '(mobile)']
const required = ['(storefront)', '(account)', '(auth)']
const pageMax = 15
const documentPageMax = 20
const documentPages = new Set([path.join(appDir, '(storefront)/page.tsx')])

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

if (fs.existsSync(path.join(appDir, 'page.tsx'))) {
  errors.push('Remove apps/web/src/app/page.tsx — `/` must live under (storefront)/page.tsx only')
}

const repoRoot = path.resolve(__dirname, '../../..')
for (const name of ['auth', 'users', 'storefront']) {
  if (!fs.existsSync(path.join(repoRoot, 'modules', name, 'package.json'))) {
    errors.push(`Required module missing: modules/${name}`)
  }
}

const forbiddenBusinessFiles = [
  path.join(srcDir, 'components/page-renderer.tsx'),
  path.join(srcDir, 'lib/customer.ts'),
]
for (const file of forbiddenBusinessFiles) {
  if (fs.existsSync(file)) {
    errors.push(`Business implementation must leave the shell: ${path.relative(repoRoot, file)}`)
  }
}

/** @param {string} dir */
function walkPages(dir) {
  /** @type {string[]} */
  const pages = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      pages.push(...walkPages(full))
      continue
    }
    if (entry.name === 'page.tsx') {
      pages.push(full)
    }
  }
  return pages
}

for (const file of walkPages(appDir)) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).length
  const limit = documentPages.has(file) ? documentPageMax : pageMax
  if (lines > limit) {
    errors.push(`Shell page too thick (${lines}/${limit} lines): ${path.relative(repoRoot, file)}`)
  }
}

if (errors.length > 0) {
  console.error('assert-site-zones failed:\n' + errors.map((e) => ` - ${e}`).join('\n'))
  process.exit(1)
}

console.log('assert-site-zones: OK')
