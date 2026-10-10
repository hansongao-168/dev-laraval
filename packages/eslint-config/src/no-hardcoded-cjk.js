const CJK = /[\u3400-\u9FFF]/

/**
 * @param {string} value
 * @returns {boolean}
 */
export function hasCjk(value) {
  return CJK.test(value)
}

/**
 * @param {string} filename
 * @returns {boolean}
 */
export function isAllowedCjkPath(filename) {
  const n = filename.replaceAll('\\', '/')
  if (n.includes('/messages/')) {
    return true
  }
  if (n.includes('/tests/') || n.endsWith('.test.mjs') || n.endsWith('.test.ts') || n.endsWith('.test.tsx')) {
    return true
  }
  if (n.endsWith('.d.ts')) {
    return true
  }

  return false
}

/** @type {import('eslint').Rule.RuleModule} */
export const noHardcodedCjkRule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow hardcoded CJK in views; put copy in messages/',
    },
    schema: [],
    messages: {
      hardcoded: 'Move CJK copy into a messages/ catalog and use t(). Found: {{sample}}',
    },
  },
  create(context) {
    const filename = context.filename
    if (isAllowedCjkPath(filename)) {
      return {}
    }

    /**
     * @param {import('estree').Node} node
     * @param {string} value
     */
    function report(node, value) {
      if (!hasCjk(value)) {
        return
      }
      const sample = value.length > 24 ? `${value.slice(0, 24)}…` : value
      context.report({ node, messageId: 'hardcoded', data: { sample } })
    }

    return {
      Literal(node) {
        if (typeof node.value === 'string') {
          report(node, node.value)
        }
      },
      TemplateElement(node) {
        report(node, node.value.cooked ?? node.value.raw ?? '')
      },
      JSXText(node) {
        report(node, node.value)
      },
    }
  },
}
