/**
 * Replace each item's `label` with the translation of its `labelKey`.
 * Pure: returns a NEW array; the input is not mutated.
 *
 * Falls back to the original `label` when the translator returns the
 * key unchanged (or empty string), which is the conventional i18next
 * "missing key" signal.
 */
export function resolveLabels(items, translate) {
  return items.map((item) => resolveLabel(item, translate));
}

export function resolveLabel(item, translate) {
  let label = item.label;
  if (item.labelKey) {
    const translated = translate(item.labelKey);
    if (translated && translated !== item.labelKey) {
      label = translated;
    }
  }
  return {
    ...item,
    label,
    children: Array.isArray(item.children) ? resolveLabels(item.children, translate) : [],
  };
}
