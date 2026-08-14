/**
 * `@erp/front-nav` — public re-exports.
 *
 * Two flavours:
 *
 *   import { fetchNav, resolveLabels } from '@erp/front-nav'
 *     → core, framework-agnostic. Use in any JS environment.
 *
 *   import { useFrontNav } from '@erp/front-nav/react'
 *     → React 19 hook with built-in caching + i18n glue.
 */
export * from './core/index.js';
