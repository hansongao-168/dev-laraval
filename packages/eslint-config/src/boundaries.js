import path from 'node:path'

/**
 * @typedef {'app' | 'module' | 'ui' | 'devices' | 'api-client' | 'front-nav' | 'front-experience' | 'i18n' | 'config' | 'eslint-config' | 'package' | 'next' | 'npm'} Layer
 */

/**
 * @param {string} filename
 * @returns {{ layer: Layer, moduleId: string | null }}
 */
export function classifyFile(filename) {
  const n = filename.replaceAll('\\', '/')
  const moduleMatch = n.match(/\/modules\/([^/]+)(?:\/|$)/)
  if (n.includes('/apps/')) {
    return { layer: 'app', moduleId: null }
  }
  if (moduleMatch) {
    return { layer: 'module', moduleId: moduleMatch[1] }
  }
  if (n.includes('/packages/config/') || n.endsWith('/packages/config')) {
    return { layer: 'config', moduleId: null }
  }
  if (n.includes('/packages/api-client/') || n.endsWith('/packages/api-client')) {
    return { layer: 'api-client', moduleId: null }
  }
  if (n.includes('/packages/ui/') || n.endsWith('/packages/ui')) {
    return { layer: 'ui', moduleId: null }
  }
  if (n.includes('/packages/devices/') || n.endsWith('/packages/devices')) {
    return { layer: 'devices', moduleId: null }
  }
  if (n.includes('/packages/front-nav/') || n.endsWith('/packages/front-nav')) {
    return { layer: 'front-nav', moduleId: null }
  }
  if (n.includes('/packages/front-experience/') || n.endsWith('/packages/front-experience')) {
    return { layer: 'front-experience', moduleId: null }
  }
  if (n.includes('/packages/i18n/') || n.endsWith('/packages/i18n')) {
    return { layer: 'i18n', moduleId: null }
  }
  if (n.includes('/packages/eslint-config/') || n.endsWith('/packages/eslint-config')) {
    return { layer: 'eslint-config', moduleId: null }
  }
  if (n.includes('/packages/')) {
    return { layer: 'package', moduleId: null }
  }

  return { layer: 'npm', moduleId: null }
}

/**
 * @param {string} spec
 * @param {string} fromFile
 * @returns {{ layer: Layer, moduleId: string | null }}
 */
export function classifyImport(spec, fromFile) {
  if (spec === 'next' || spec.startsWith('next/')) {
    return { layer: 'next', moduleId: null }
  }
  if (spec.startsWith('@erp/module-')) {
    const rest = spec.slice('@erp/module-'.length)
    const moduleId = rest.split('/')[0] ?? rest

    return { layer: 'module', moduleId }
  }
  if (spec === '@erp/config' || spec.startsWith('@erp/config/')) {
    return { layer: 'config', moduleId: null }
  }
  if (spec === '@erp/api-client' || spec.startsWith('@erp/api-client/')) {
    return { layer: 'api-client', moduleId: null }
  }
  if (spec === '@erp/ui' || spec.startsWith('@erp/ui/')) {
    return { layer: 'ui', moduleId: null }
  }
  if (spec === '@erp/devices' || spec.startsWith('@erp/devices/')) {
    return { layer: 'devices', moduleId: null }
  }
  if (spec === '@erp/front-nav' || spec.startsWith('@erp/front-nav/')) {
    return { layer: 'front-nav', moduleId: null }
  }
  if (spec === '@erp/front-experience' || spec.startsWith('@erp/front-experience/')) {
    return { layer: 'front-experience', moduleId: null }
  }
  if (spec === '@erp/i18n' || spec.startsWith('@erp/i18n/')) {
    return { layer: 'i18n', moduleId: null }
  }
  if (spec === '@erp/eslint-config' || spec.startsWith('@erp/eslint-config/')) {
    return { layer: 'eslint-config', moduleId: null }
  }
  if (spec.startsWith('.')) {
    const resolved = path.resolve(path.dirname(fromFile), spec)

    return classifyFile(`${resolved}/`)
  }

  return { layer: 'npm', moduleId: null }
}

/** @type {Record<string, Set<string>>} */
const ALLOW = {
  app: new Set(['app', 'module', 'ui', 'devices', 'config', 'api-client', 'front-nav', 'front-experience', 'i18n', 'eslint-config', 'package', 'npm', 'next']),
  module: new Set(['ui', 'devices', 'config', 'api-client', 'front-nav', 'front-experience', 'i18n', 'npm']),
  ui: new Set(['ui', 'config', 'api-client', 'i18n', 'npm']),
  devices: new Set(['devices', 'config', 'npm']),
  'api-client': new Set(['api-client', 'config', 'npm']),
  'front-nav': new Set(['front-nav', 'config', 'npm']),
  'front-experience': new Set(['front-experience', 'i18n', 'npm']),
  i18n: new Set(['i18n', 'npm']),
  config: new Set(['config', 'npm']),
  'eslint-config': new Set(['eslint-config', 'npm']),
  package: new Set(['package', 'config', 'npm']),
}

/**
 * @param {string} fromFile
 * @param {string} spec
 * @returns {string | null}
 */
export function forbiddenReason(fromFile, spec) {
  const from = classifyFile(fromFile)
  const imported = classifyImport(spec, fromFile)

  if (from.layer === 'module' && imported.layer === 'module') {
    if (from.moduleId === imported.moduleId) {
      return null
    }

    return `modules/${from.moduleId} cannot import modules/${imported.moduleId}`
  }

  const allowed = ALLOW[from.layer]
  if (!allowed) {
    return null
  }
  if (allowed.has(imported.layer)) {
    return null
  }

  return `${from.layer} cannot import ${imported.layer} (${spec})`
}

/** @type {import('eslint').Rule.RuleModule} */
export const boundariesRule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce apps → modules → packages dependency direction',
    },
    schema: [],
    messages: {
      forbidden: '{{reason}}',
    },
  },
  create(context) {
    const filename = context.filename

    /**
     * @param {import('estree').Literal | import('estree').Expression | null | undefined} source
     */
    function checkSource(source) {
      if (!source || source.type !== 'Literal' || typeof source.value !== 'string') {
        return
      }
      const reason = forbiddenReason(filename, source.value)
      if (reason) {
        context.report({ node: source, messageId: 'forbidden', data: { reason } })
      }
    }

    return {
      ImportDeclaration(node) {
        checkSource(node.source)
      },
      ExportNamedDeclaration(node) {
        checkSource(node.source)
      },
      ExportAllDeclaration(node) {
        checkSource(node.source)
      },
    }
  },
}
