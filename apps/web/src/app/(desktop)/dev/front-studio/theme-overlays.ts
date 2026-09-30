export type OverlayOps = {
  prepend?: Array<Record<string, unknown>>;
  append?: Array<Record<string, unknown>>;
};

export type PageOverlays = Record<string, Record<string, OverlayOps>>;

export type OverlayRow = {
  key: string;
  slug: string;
  slot: string;
  position: 'prepend' | 'append';
  id: string;
  type: string;
  text: string;
};

export type OverlayGroup = {
  key: string;
  slug: string;
  slot: string;
  indices: number[];
  rows: OverlayRow[];
};

export type OverlayPlaceholder = {
  slug: string;
  slot: string;
};

export type PlaceholderConflictChoice = 'theme' | 'local' | 'merge';

export type PlaceholderConflictMemory = {
  choice: PlaceholderConflictChoice;
  themeSignature: string;
};

export {
  DEFAULT_OVERLAY_PLACEHOLDERS,
  DEFERRED_OVERLAYS_STALE_MS,
  LAST_IMPORTED_OVERLAYS_STORAGE_KEY,
  OVERLAY_PLACEHOLDERS_STORAGE_KEY,
  OVERLAY_PLACEHOLDER_CHOICES_STORAGE_KEY,
  absoluteSharePreviewUrl,
  applyRememberedPlaceholderChoice,
  buildOverlaysFromRows,
  describeBundleThemeMismatch,
  describeLastImportedOverlays,
  describeLastImportedOverlaysAge,
  diffOverlayPlaceholders,
  exportPlaceholderConflictChoices,
  exportStudioPlaceholderBundle,
  flattenOverlays,
  forgetPlaceholderConflictChoice,
  groupOverlayRows,
  importPlaceholderConflictChoices,
  importStudioPlaceholderBundle,
  looksLikeStudioBundleJson,
  mergeOverlayPlaceholders,
  mergePageOverlays,
  missingOverlayPlaceholders,
  moveOverlayRow,
  normalizeOverlayPlaceholders,
  overlayPlaceholdersDiffer,
  overlayPlaceholdersSignature,
  parseOverlayPlaceholder,
  pickDroppedImportFile,
  pruneStaleLastImportedOverlays,
  readLastImportedOverlays,
  readOverlayPlaceholdersFromStorage,
  readPlaceholderConflictChoices,
  rememberPlaceholderConflictChoice,
  removeOverlayPlaceholder,
  resolveDeferredOverlaysApply,
  serializeLastImportedOverlays,
  sharePreviewFallbackImage,
  summarizeStudioBundleImport,
  upsertOverlayPlaceholder,
} from './theme-overlays.mjs';
