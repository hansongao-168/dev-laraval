export function asRecords(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.filter((item) => item !== null && typeof item === 'object') as Record<string, unknown>[]
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    if (Array.isArray(record.data)) {
      return asRecords(record.data)
    }
    if (Array.isArray(record.items)) {
      return asRecords(record.items)
    }
  }

  return []
}

export function stringProp(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim() !== '') {
      return value
    }
  }

  return ''
}
