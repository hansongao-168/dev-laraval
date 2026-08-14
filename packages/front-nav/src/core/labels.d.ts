import type { NavItem } from './types.js';

/**
 * Translator contract.
 *
 * Any i18n library can be adapted to this shape. Examples:
 *   - i18next:    const t = (k) => i18next.t(k)
 *   - vue-i18n:   const t = (k) => i18n.global.t(k)
 *   - FormatJS:   const t = (k) => intl.formatMessage({ id: k })
 *
 * The function MUST return a string. Returning the input key (or empty
 * string) is treated as "no translation" and the caller will fall back
 * to the backend-provided `label`.
 */
export type Translator = (key: string) => string;

/**
 * Walk a nav tree, replacing each item's `label` with the translation of
 * `labelKey` when available. Returns a NEW tree; the input is not mutated.
 *
 * Behaviour:
 *   - Item without `labelKey`  ⇒ unchanged.
 *   - Item with `labelKey` whose translator returns the key itself (or empty
 *     string) ⇒ falls back to `label`.
 *   - Children are processed recursively.
 */
export declare function resolveLabels(items: NavItem[], translate: Translator): NavItem[];

/**
 * Convenience: process a single item.
 */
export declare function resolveLabel(item: NavItem, translate: Translator): NavItem;
