export type Messages = Record<string, string>

export type Translator = (key: string, vars?: Record<string, string | number>) => string

export declare function createTranslator(messages: Messages): Translator

export declare function mergeMessages(...dicts: Messages[]): Messages
