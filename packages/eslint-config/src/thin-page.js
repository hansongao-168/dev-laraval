/**
 * @param {string} source
 * @returns {number}
 */
export function countPageLines(source) {
  if (source.length === 0) {
    return 0
  }

  return source.replace(/\r\n/g, '\n').split('\n').length
}

/**
 * @param {string} filename
 * @param {string[]} patterns
 * @returns {boolean}
 */
export function matchesAny(filename, patterns) {
  const normalized = filename.replaceAll('\\', '/')

  return patterns.some((pattern) => {
    const needle = pattern.replaceAll('\\', '/')
    return normalized.endsWith(needle) || normalized.includes(needle)
  })
}

/** @type {import('eslint').Rule.RuleModule} */
export const thinPageRule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Keep App Router page.tsx files as thin shell composers',
    },
    schema: [
      {
        type: 'object',
        properties: {
          max: { type: 'integer', minimum: 1 },
          documentMax: { type: 'integer', minimum: 1 },
          documentPatterns: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      tooThick:
        'page.tsx has {{lines}} lines (max {{max}}). Keep shell pages as thin composers; Document pages may use a higher whitelist.',
    },
  },
  create(context) {
    const options = context.options[0] ?? {}
    const max = options.max ?? 15
    const documentMax = options.documentMax ?? 20
    const documentPatterns = options.documentPatterns ?? ['/app/(storefront)/page.tsx']
    const filename = context.filename.replaceAll('\\', '/')

    if (!filename.endsWith('/page.tsx') || !filename.includes('/apps/web/src/app/')) {
      return {}
    }

    return {
      Program(node) {
        const source = context.sourceCode.getText(node)
        const lines = countPageLines(source)
        const limit = matchesAny(filename, documentPatterns) ? documentMax : max

        if (lines > limit) {
          context.report({
            node,
            messageId: 'tooThick',
            data: { lines: String(lines), max: String(limit) },
          })
        }
      },
    }
  },
}
