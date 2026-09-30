/**
 * Re-export shared SEO image helpers from @erp/front-experience.
 * Kept as a local entry for apps/web tests and Next imports.
 */
export {
  absoluteAssetUrl,
  normalizeSeoLocale,
  readPageSeo,
  resolvePageShareImage,
  resolveSeoImage,
} from '@erp/front-experience/core';
