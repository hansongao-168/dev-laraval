export type Messages = Record<string, string>

export type Translator = (key: string, vars?: Record<string, string | number>) => string

export function createTranslator(messages: Messages): Translator {
  return function t(key, vars) {
    let out = messages[key] ?? key

    if (vars) {
      for (const [name, value] of Object.entries(vars)) {
        out = out.split(`{${name}}`).join(String(value))
      }
    }

    return out
  }
}

export function mergeMessages(...dicts: Messages[]): Messages {
  return Object.assign({}, ...dicts)
}
