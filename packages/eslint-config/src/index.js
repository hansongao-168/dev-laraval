import tseslint from 'typescript-eslint'
import { boundariesRule } from './boundaries.js'
import { noHardcodedCjkRule } from './no-hardcoded-cjk.js'
import { thinPageRule } from './thin-page.js'

const plugin = {
  meta: {
    name: '@erp/eslint-config',
  },
  rules: {
    boundaries: boundariesRule,
    'thin-page': thinPageRule,
    'no-hardcoded-cjk': noHardcodedCjkRule,
  },
}

const files = [
  'apps/web/**/*.{js,mjs,cjs,ts,tsx}',
  'apps/mobile/**/*.{js,mjs,cjs,ts,tsx}',
  'apps/miniapp/**/*.{js,mjs,cjs,ts,tsx}',
  'packages/**/*.{js,mjs,cjs,ts,tsx}',
  'modules/**/*.{js,mjs,cjs,ts,tsx}',
]

/** @type {import('eslint').Linter.Config[]} */
const config = [
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/build/**',
      '**/*.d.ts',
    ],
  },
  {
    files,
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      erp: plugin,
    },
    rules: {
      'erp/boundaries': 'error',
    },
  },
  {
    files: ['apps/web/src/app/**/page.tsx'],
    plugins: {
      erp: plugin,
    },
    rules: {
      'erp/thin-page': [
        'error',
        {
          max: 15,
          documentMax: 20,
          documentPatterns: ['/app/(storefront)/page.tsx'],
        },
      ],
    },
  },
  {
    files: [
      'modules/**/*.{ts,tsx}',
      'packages/front-experience/**/*.{ts,tsx}',
      'packages/ui/**/*.{ts,tsx}',
      'apps/web/src/**/*.{ts,tsx}',
      'apps/mobile/src/**/*.{ts,tsx}',
      'apps/miniapp/src/**/*.{ts,tsx}',
    ],
    ignores: ['**/messages/**', '**/tests/**'],
    plugins: {
      erp: plugin,
    },
    rules: {
      'erp/no-hardcoded-cjk': 'error',
    },
  },
]

export default config
export { plugin, boundariesRule, thinPageRule, noHardcodedCjkRule }
