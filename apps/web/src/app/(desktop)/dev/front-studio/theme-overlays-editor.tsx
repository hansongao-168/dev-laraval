'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import type { BlockTypeInfo } from '@erp/front-experience/core';
import { ShareButton } from '@/components/front-experience/share-button';
import {
  DEFAULT_SHARE_TOAST_DWELL_MS,
  normalizeShareToastDwellMs,
} from '@/lib/front-experience/share-payload.mjs';
import { resolveSeoImage } from '@/lib/front-experience/seo-image.mjs';
import {
  DEFAULT_OVERLAY_PLACEHOLDERS,
  LAST_IMPORTED_OVERLAYS_STORAGE_KEY,
  OVERLAY_PLACEHOLDER_CHOICES_STORAGE_KEY,
  OVERLAY_PLACEHOLDERS_STORAGE_KEY,
  absoluteSharePreviewUrl,
  applyRememberedPlaceholderChoice,
  buildOverlaysFromRows,
  describeBundleThemeMismatch,
  describeLastImportedOverlays,
  describeLastImportedOverlaysAge,
  diffOverlayPlaceholders,
  exportStudioPlaceholderBundle,
  flattenOverlays,
  forgetPlaceholderConflictChoice,
  groupOverlayRows,
  importStudioPlaceholderBundle,
  looksLikeStudioBundleJson,
  mergeOverlayPlaceholders,
  missingOverlayPlaceholders,
  moveOverlayRow,
  normalizeOverlayPlaceholders,
  overlayPlaceholdersDiffer,
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
  type OverlayPlaceholder,
  type OverlayRow,
  type PageOverlays,
  type PlaceholderConflictChoice,
} from './theme-overlays';

type ThemeDoc = {
  code?: string;
  skinCode?: string;
  label?: unknown;
  pageOverlays?: PageOverlays;
  overlayPlaceholders?: OverlayPlaceholder[];
};

const SLOT_OPTIONS = ['header', 'main', 'footer', 'floating'] as const;
const SHARE_TOAST_DWELL_STORAGE_KEY = 'front-studio.share-toast-dwell-ms';
const SHARE_PREVIEW_LOCALE_STORAGE_KEY = 'front-studio.share-preview-locale';
const SHARE_PREVIEW_SLUG_STORAGE_KEY = 'front-studio.share-preview-slug';
const SHARE_PREVIEW_LOCALES = ['default', 'zh_CN', 'en'] as const;
const SHARE_PREVIEW_SLUGS = ['home', 'help', 'article'] as const;
const SHARE_PREVIEW_SEO_BY_SLUG = {
  home: {
    image: '/brand/home-share.png',
    images: {
      zh_CN: '/brand/home-share.zh_CN.png',
      en: '/brand/home-share.en.png',
    },
  },
  help: {
    image: '/brand/help-share.png',
    images: {
      zh_CN: '/brand/help-share.zh_CN.png',
      en: '/brand/help-share.en.png',
    },
  },
  article: {
    image: '/brand/article-share.png',
    images: {
      zh_CN: '/brand/article-share.zh_CN.png',
      en: '/brand/article-share.en.png',
    },
  },
} as const;

function apiBase(): string {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    process.env.API_BASE_URL ??
    'http://localhost:8000'
  );
}

function newKey(): string {
  return `row-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function emptyAnnouncement(id: string, text: string): OverlayRow {
  return {
    key: newKey(),
    slug: 'home',
    slot: 'main',
    position: 'prepend',
    id,
    type: 'shell.announcement',
    text,
  };
}

export function ThemeOverlaysEditor({
  themeCode,
  blockTypes,
  onSaved,
}: {
  themeCode: string;
  blockTypes: BlockTypeInfo[];
  onSaved?: (theme: ThemeDoc) => void;
}) {
  const [mode, setMode] = useState<'form' | 'json'>('form');
  const [rows, setRows] = useState<OverlayRow[]>([]);
  const [overlaysJson, setOverlaysJson] = useState('{}');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [placeholderDefaults, setPlaceholderDefaults] = useState<OverlayPlaceholder[]>([
    ...DEFAULT_OVERLAY_PLACEHOLDERS,
  ]);
  const [draftSlug, setDraftSlug] = useState('home');
  const [draftSlot, setDraftSlot] = useState<string>('main');
  const [placeholderConflict, setPlaceholderConflict] = useState<{
    themeCode: string;
    local: OverlayPlaceholder[];
    theme: OverlayPlaceholder[];
  } | null>(null);
  const [themePlaceholders, setThemePlaceholders] = useState<OverlayPlaceholder[] | null>(null);
  const [rememberedChoice, setRememberedChoice] = useState<PlaceholderConflictChoice | null>(null);
  const [choicesStatus, setChoicesStatus] = useState<string | null>(null);
  const [choicesWarning, setChoicesWarning] = useState<string | null>(null);
  const [toastDwellMs, setToastDwellMs] = useState(DEFAULT_SHARE_TOAST_DWELL_MS);
  const [toastDwellDraft, setToastDwellDraft] = useState(String(DEFAULT_SHARE_TOAST_DWELL_MS));
  const [deferredOverlays, setDeferredOverlays] = useState<{
    pageOverlays: PageOverlays;
    themeCode?: string;
    stashedAt?: string;
  } | null>(null);
  const [sharePreviewLocale, setSharePreviewLocale] = useState<string>('zh_CN');
  const [sharePreviewSlug, setSharePreviewSlug] = useState<string>('home');
  const [sharePreviewBroken, setSharePreviewBroken] = useState(false);
  const [importDropActive, setImportDropActive] = useState(false);
  const [importDropMode, setImportDropMode] = useState<'merge' | 'replace'>('merge');
  const [pasteDraft, setPasteDraft] = useState('');
  const [copyUrlStatus, setCopyUrlStatus] = useState<string | null>(null);

  const typeOptions = useMemo(() => {
    const types = blockTypes.map((item) => item.type);
    if (!types.includes('shell.announcement')) {
      types.unshift('shell.announcement');
    }
    if (!types.includes('content.rich-text')) {
      types.push('content.rich-text');
    }
    return types;
  }, [blockTypes]);

  const groups = useMemo(() => groupOverlayRows(rows), [rows]);
  const placeholders = useMemo(
    () => missingOverlayPlaceholders(rows, placeholderDefaults),
    [rows, placeholderDefaults],
  );
  const sharePreviewImage = useMemo(() => {
    const seo =
      SHARE_PREVIEW_SEO_BY_SLUG[
        sharePreviewSlug as keyof typeof SHARE_PREVIEW_SEO_BY_SLUG
      ] ?? SHARE_PREVIEW_SEO_BY_SLUG.home;
    const locale = sharePreviewLocale === 'default' ? null : sharePreviewLocale;
    const resolved = resolveSeoImage(seo, locale) ?? seo.image;
    if (sharePreviewBroken) {
      return sharePreviewFallbackImage(sharePreviewSlug);
    }
    return resolved;
  }, [sharePreviewBroken, sharePreviewLocale, sharePreviewSlug]);
  const deferredAge = useMemo(
    () => describeLastImportedOverlaysAge(deferredOverlays),
    [deferredOverlays],
  );

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(OVERLAY_PLACEHOLDERS_STORAGE_KEY);
      setPlaceholderDefaults(readOverlayPlaceholdersFromStorage(raw));
    } catch {
      setPlaceholderDefaults([...DEFAULT_OVERLAY_PLACEHOLDERS]);
    }

    try {
      const dwellRaw = window.localStorage.getItem(SHARE_TOAST_DWELL_STORAGE_KEY);
      const dwell = normalizeShareToastDwellMs(dwellRaw ?? DEFAULT_SHARE_TOAST_DWELL_MS);
      setToastDwellMs(dwell);
      setToastDwellDraft(String(dwell));
    } catch {
      setToastDwellMs(DEFAULT_SHARE_TOAST_DWELL_MS);
      setToastDwellDraft(String(DEFAULT_SHARE_TOAST_DWELL_MS));
    }

    try {
      const deferredRaw = window.localStorage.getItem(LAST_IMPORTED_OVERLAYS_STORAGE_KEY);
      const loaded = readLastImportedOverlays(deferredRaw);
      const pruned = pruneStaleLastImportedOverlays(loaded);
      if (pruned.cleared) {
        window.localStorage.removeItem(LAST_IMPORTED_OVERLAYS_STORAGE_KEY);
        setDeferredOverlays(null);
        setChoicesStatus(
          `Cleared stale deferred overlays (${pruned.age?.label ?? 'expired'})`,
        );
      } else {
        setDeferredOverlays(pruned.stash);
      }
    } catch {
      setDeferredOverlays(null);
    }

    try {
      const localeRaw = window.localStorage.getItem(SHARE_PREVIEW_LOCALE_STORAGE_KEY);
      if (
        localeRaw &&
        (SHARE_PREVIEW_LOCALES as readonly string[]).includes(localeRaw)
      ) {
        setSharePreviewLocale(localeRaw);
      }
    } catch {
      // keep default
    }

    try {
      const slugRaw = window.localStorage.getItem(SHARE_PREVIEW_SLUG_STORAGE_KEY);
      if (slugRaw && (SHARE_PREVIEW_SLUGS as readonly string[]).includes(slugRaw)) {
        setSharePreviewSlug(slugRaw);
      }
    } catch {
      // keep default
    }
  }, []);

  function persistSharePreviewLocale(next: string) {
    const locale = (SHARE_PREVIEW_LOCALES as readonly string[]).includes(next)
      ? next
      : 'zh_CN';
    setSharePreviewLocale(locale);
    setSharePreviewBroken(false);
    try {
      window.localStorage.setItem(SHARE_PREVIEW_LOCALE_STORAGE_KEY, locale);
    } catch {
      // ignore
    }
  }

  function persistSharePreviewSlug(next: string) {
    const slug = (SHARE_PREVIEW_SLUGS as readonly string[]).includes(next) ? next : 'home';
    setSharePreviewSlug(slug);
    setSharePreviewBroken(false);
    try {
      window.localStorage.setItem(SHARE_PREVIEW_SLUG_STORAGE_KEY, slug);
    } catch {
      // ignore
    }
  }

  function clearDeferredOverlays() {
    setDeferredOverlays(null);
    try {
      window.localStorage.removeItem(LAST_IMPORTED_OVERLAYS_STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  function stashDeferredOverlays(pageOverlays: PageOverlays, bundleThemeCode?: string) {
    const serialized = serializeLastImportedOverlays(pageOverlays, bundleThemeCode);
    if (!serialized) {
      return;
    }
    const next = readLastImportedOverlays(serialized);
    setDeferredOverlays(next);
    try {
      window.localStorage.setItem(LAST_IMPORTED_OVERLAYS_STORAGE_KEY, serialized);
    } catch {
      // ignore
    }
  }

  function applyDeferredOverlays(mode: 'replace' | 'merge' = 'replace') {
    if (!deferredOverlays?.pageOverlays) {
      return;
    }
    const mismatch = describeBundleThemeMismatch(themeCode, deferredOverlays.themeCode);
    if (mismatch) {
      const confirmed = window.confirm(
        `${mismatch}.\n\n${mode === 'merge' ? 'Merge' : 'Replace with'} stashed overlays draft in the active theme editor anyway?`,
      );
      if (!confirmed) {
        return;
      }
    }
    const nextOverlays = resolveDeferredOverlaysApply(
      buildOverlaysFromRows(rows),
      deferredOverlays.pageOverlays,
      mode,
    );
    if (!nextOverlays) {
      return;
    }
    syncJsonFromRows(flattenOverlays(nextOverlays));
    const summary = describeLastImportedOverlays(deferredOverlays);
    clearDeferredOverlays();
    setChoicesWarning(mismatch);
    setChoicesStatus(
      summary
        ? `Applied deferred overlays (${mode}): ${summary}`
        : `Applied deferred overlays (${mode})`,
    );
  }

  function persistToastDwell(next: number) {
    const dwell = normalizeShareToastDwellMs(next);
    setToastDwellMs(dwell);
    setToastDwellDraft(String(dwell));
    try {
      window.localStorage.setItem(SHARE_TOAST_DWELL_STORAGE_KEY, String(dwell));
    } catch {
      // ignore
    }
  }

  function persistPlaceholders(next: OverlayPlaceholder[]) {
    setPlaceholderDefaults(next);
    try {
      window.localStorage.setItem(OVERLAY_PLACEHOLDERS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore quota / private mode
    }
  }

  function rememberConflictChoice(
    code: string,
    choice: PlaceholderConflictChoice,
    nextThemePlaceholders: OverlayPlaceholder[],
  ) {
    try {
      const current = readPlaceholderConflictChoices(
        window.localStorage.getItem(OVERLAY_PLACEHOLDER_CHOICES_STORAGE_KEY),
      );
      const next = rememberPlaceholderConflictChoice(
        current,
        code,
        choice,
        nextThemePlaceholders,
      );
      window.localStorage.setItem(OVERLAY_PLACEHOLDER_CHOICES_STORAGE_KEY, JSON.stringify(next));
      setRememberedChoice(choice);
    } catch {
      // ignore
    }
  }

  function forgetSavedChoice() {
    try {
      const current = readPlaceholderConflictChoices(
        window.localStorage.getItem(OVERLAY_PLACEHOLDER_CHOICES_STORAGE_KEY),
      );
      const next = forgetPlaceholderConflictChoice(current, themeCode);
      window.localStorage.setItem(OVERLAY_PLACEHOLDER_CHOICES_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
    setRememberedChoice(null);
    setChoicesStatus(`Forgot saved choice for ${themeCode}`);

    if (
      themePlaceholders &&
      overlayPlaceholdersDiffer(placeholderDefaults, themePlaceholders)
    ) {
      setPlaceholderConflict({
        themeCode,
        local: placeholderDefaults,
        theme: themePlaceholders,
      });
    } else {
      setPlaceholderConflict(null);
    }
  }

  function buildExportBundlePayload() {
    const current = readPlaceholderConflictChoices(
      window.localStorage.getItem(OVERLAY_PLACEHOLDER_CHOICES_STORAGE_KEY),
    );
    const pageOverlays = buildOverlaysFromRows(rows);
    const payload = exportStudioPlaceholderBundle({
      choices: current,
      placeholders: placeholderDefaults,
      themeCode,
      pageOverlays: Object.keys(pageOverlays).length > 0 ? pageOverlays : null,
    });
    return {
      payload,
      choiceCount: Object.keys(current).length,
      placeholderCount: placeholderDefaults.length,
      overlayCount: Object.keys(pageOverlays).length,
    };
  }

  async function copyTextToClipboard(text: string) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const input = document.createElement('textarea');
    input.value = text;
    input.setAttribute('readonly', '');
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
  }

  function exportChoices() {
    try {
      const { payload, choiceCount, placeholderCount, overlayCount } =
        buildExportBundlePayload();
      const blob = new Blob([payload], { type: 'application/json' });
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = href;
      anchor.download = 'front-studio-placeholder-bundle.json';
      anchor.click();
      URL.revokeObjectURL(href);
      setChoicesWarning(null);
      setChoicesStatus(
        `Exported bundle: ${choiceCount} choice(s), ${placeholderCount} placeholder(s), ${overlayCount} overlay page(s)`,
      );
    } catch (e) {
      setChoicesStatus(e instanceof Error ? e.message : 'Export failed');
      setChoicesWarning(null);
    }
  }

  async function copyExportBundle() {
    try {
      const { payload, choiceCount, placeholderCount, overlayCount } =
        buildExportBundlePayload();
      await copyTextToClipboard(payload);
      setChoicesWarning(null);
      setChoicesStatus(
        `Copied bundle JSON: ${choiceCount} choice(s), ${placeholderCount} placeholder(s), ${overlayCount} overlay page(s)`,
      );
    } catch (e) {
      setChoicesStatus(e instanceof Error ? e.message : 'Copy export failed');
      setChoicesWarning(null);
    }
  }

  function importChoicesPayload(raw: string, mode: 'merge' | 'replace') {
    try {
      const existingChoices = readPlaceholderConflictChoices(
        window.localStorage.getItem(OVERLAY_PLACEHOLDER_CHOICES_STORAGE_KEY),
      );
      const currentOverlays = buildOverlaysFromRows(rows);
      const result = importStudioPlaceholderBundle(
        raw,
        {
          choices: existingChoices,
          placeholders: placeholderDefaults,
          pageOverlays: Object.keys(currentOverlays).length > 0 ? currentOverlays : null,
        },
        mode,
      );
      if (!result.ok) {
        setChoicesStatus(result.error);
        setChoicesWarning(null);
        return;
      }

      const mismatch = describeBundleThemeMismatch(themeCode, result.themeCode);
      let applyOverlaysDraft = Boolean(
        result.pageOverlays && Object.keys(result.pageOverlays).length > 0,
      );
      if (mismatch && applyOverlaysDraft) {
        const confirmed = window.confirm(
          `${mismatch}.\n\nApply overlays draft from the bundle into the active theme editor anyway?`,
        );
        if (!confirmed) {
          applyOverlaysDraft = false;
        }
      }
      setChoicesWarning(mismatch);

      window.localStorage.setItem(
        OVERLAY_PLACEHOLDER_CHOICES_STORAGE_KEY,
        JSON.stringify(result.choices),
      );
      persistPlaceholders(result.placeholders);
      if (applyOverlaysDraft && result.pageOverlays) {
        syncJsonFromRows(flattenOverlays(result.pageOverlays));
        clearDeferredOverlays();
      } else if (
        result.pageOverlays &&
        Object.keys(result.pageOverlays).length > 0 &&
        !applyOverlaysDraft
      ) {
        stashDeferredOverlays(result.pageOverlays, result.themeCode);
      }
      const memory = result.choices[themeCode] ?? null;
      setRememberedChoice(memory?.choice ?? null);
      const overlayPages =
        applyOverlaysDraft && result.pageOverlays
          ? Object.keys(result.pageOverlays).length
          : 0;
      setChoicesStatus(
        summarizeStudioBundleImport(result, {
          mode,
          appliedOverlayPages: overlayPages,
          overlaysSkipped: Boolean(mismatch && !applyOverlaysDraft),
        }),
      );
      setPasteDraft('');

      if (themePlaceholders && memory) {
        const applied = applyRememberedPlaceholderChoice(
          result.placeholders,
          themePlaceholders,
          memory,
        );
        if (applied) {
          persistPlaceholders(applied);
          setPlaceholderConflict(null);
        }
      }
    } catch (e) {
      setChoicesStatus(e instanceof Error ? e.message : 'Import failed');
      setChoicesWarning(null);
    }
  }

  function importChoices(file: File | null, mode: 'merge' | 'replace') {
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      importChoicesPayload(String(reader.result ?? ''), mode);
    };
    reader.onerror = () => setChoicesStatus('Import failed to read file');
    reader.readAsText(file);
  }

  function importPastedBundle() {
    if (!looksLikeStudioBundleJson(pasteDraft)) {
      setChoicesStatus('Paste a valid Studio bundle JSON first');
      setChoicesWarning(null);
      return;
    }
    importChoicesPayload(pasteDraft, importDropMode);
  }

  async function copySharePreviewUrl() {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : '';
    const url = absoluteSharePreviewUrl(sharePreviewImage, origin);
    if (!url) {
      setCopyUrlStatus('No image URL to copy');
      return;
    }

    try {
      await copyTextToClipboard(url);
      setCopyUrlStatus(`Copied ${url}`);
    } catch (e) {
      setCopyUrlStatus(e instanceof Error ? e.message : 'Copy failed');
    }
  }

  function openSharePreviewImage() {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : '';
    const url = absoluteSharePreviewUrl(sharePreviewImage, origin);
    if (!url) {
      setCopyUrlStatus('No image URL to open');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
    setCopyUrlStatus(`Opened ${url}`);
  }

  async function downloadSharePreviewImage() {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : '';
    const url = absoluteSharePreviewUrl(sharePreviewImage, origin);
    if (!url) {
      setCopyUrlStatus('No image URL to download');
      return;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Download failed (${response.status})`);
      }
      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const pathPart = sharePreviewImage.split('/').pop() || 'share-preview.png';
      anchor.href = href;
      anchor.download = pathPart;
      anchor.click();
      URL.revokeObjectURL(href);
      setCopyUrlStatus(`Downloaded ${pathPart}`);
    } catch (e) {
      setCopyUrlStatus(e instanceof Error ? e.message : 'Download failed');
    }
  }

  function resolveConflict(choice: PlaceholderConflictChoice) {
    if (!placeholderConflict) {
      return;
    }

    const resolved =
      choice === 'theme'
        ? placeholderConflict.theme
        : choice === 'merge'
          ? mergeOverlayPlaceholders(placeholderConflict.local, placeholderConflict.theme)
          : placeholderConflict.local;

    persistPlaceholders(resolved);
    rememberConflictChoice(placeholderConflict.themeCode, choice, placeholderConflict.theme);
    setPlaceholderConflict(null);
  }

  function applyOverlays(overlays: PageOverlays) {
    const nextRows = flattenOverlays(overlays);
    setRows(nextRows);
    setOverlaysJson(JSON.stringify(overlays, null, 2));
  }

  useEffect(() => {
    if (!themeCode) {
      setRows([]);
      setOverlaysJson('{}');
      return;
    }

    startTransition(async () => {
      setError(null);
      setStatus(null);
      try {
        const res = await fetch(
          `${apiBase()}/api/v1/front-templates/themes/${encodeURIComponent(themeCode)}`,
          { headers: { Accept: 'application/json' }, credentials: 'include' },
        );
        const json = await res.json();
        if (!res.ok) {
          setError(json.message ?? `HTTP ${res.status}`);
          return;
        }
        applyOverlays(((json.data as ThemeDoc)?.pageOverlays ?? {}) as PageOverlays);
        const fromTheme = (json.data as ThemeDoc)?.overlayPlaceholders;
        if (Array.isArray(fromTheme) && fromTheme.length > 0) {
          const nextThemePlaceholders = normalizeOverlayPlaceholders(fromTheme);
          setThemePlaceholders(nextThemePlaceholders);
          setPlaceholderDefaults((current) => {
            if (!overlayPlaceholdersDiffer(current, nextThemePlaceholders)) {
              setPlaceholderConflict(null);
              setRememberedChoice(null);
              try {
                window.localStorage.setItem(
                  OVERLAY_PLACEHOLDERS_STORAGE_KEY,
                  JSON.stringify(nextThemePlaceholders),
                );
              } catch {
                // ignore
              }
              return nextThemePlaceholders;
            }

            let memory = null;
            try {
              memory =
                readPlaceholderConflictChoices(
                  window.localStorage.getItem(OVERLAY_PLACEHOLDER_CHOICES_STORAGE_KEY),
                )[themeCode] ?? null;
            } catch {
              memory = null;
            }

            const remembered = applyRememberedPlaceholderChoice(
              current,
              nextThemePlaceholders,
              memory,
            );
            if (remembered) {
              setPlaceholderConflict(null);
              setRememberedChoice(memory?.choice ?? null);
              try {
                window.localStorage.setItem(
                  OVERLAY_PLACEHOLDERS_STORAGE_KEY,
                  JSON.stringify(remembered),
                );
              } catch {
                // ignore
              }
              return remembered;
            }

            setRememberedChoice(null);
            setPlaceholderConflict({
              themeCode,
              local: current,
              theme: nextThemePlaceholders,
            });
            return current;
          });
        } else {
          setThemePlaceholders(null);
          setRememberedChoice(null);
          setPlaceholderConflict(null);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load theme');
      }
    });
  }, [themeCode]);

  function syncJsonFromRows(nextRows: OverlayRow[]) {
    setRows(nextRows);
    setOverlaysJson(JSON.stringify(buildOverlaysFromRows(nextRows), null, 2));
    setStatus(null);
  }

  function syncRowsFromJson(raw: string) {
    setOverlaysJson(raw);
    setStatus(null);
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        setRows(flattenOverlays(parsed as PageOverlays));
        setError(null);
      }
    } catch {
      // Keep typing; validate on save.
    }
  }

  function addRow(defaults?: Partial<Pick<OverlayRow, 'slug' | 'slot' | 'position'>>) {
    syncJsonFromRows([
      ...rows,
      {
        ...emptyAnnouncement(
          `${themeCode || 'theme'}-block-${rows.length + 1}`,
          'New seasonal announcement',
        ),
        ...defaults,
      },
    ]);
  }

  function updateRow(key: string, patch: Partial<OverlayRow>) {
    syncJsonFromRows(rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function removeRow(key: string) {
    syncJsonFromRows(rows.filter((row) => row.key !== key));
  }

  function moveRow(key: string, direction: -1 | 1) {
    const index = rows.findIndex((row) => row.key === key);
    if (index < 0) {
      return;
    }
    const target = index + direction;
    if (target < 0 || target >= rows.length) {
      return;
    }
    syncJsonFromRows(moveOverlayRow(rows, key, direction < 0 ? target : target + 1));
  }

  function dropAt(index: number) {
    if (!draggingKey) {
      return;
    }
    syncJsonFromRows(moveOverlayRow(rows, draggingKey, index));
    setDraggingKey(null);
    setDropIndex(null);
  }

  function seedHomeAnnouncement() {
    syncJsonFromRows([
      emptyAnnouncement(
        `${themeCode}-announce`,
        typeOptions.includes('shell.announcement')
          ? `${themeCode} seasonal announcement`
          : 'Seasonal announcement',
      ),
    ]);
  }

  function resolveOverlaysForSave(): PageOverlays | null {
    if (mode === 'form') {
      const built = buildOverlaysFromRows(rows);
      return Object.keys(built).length === 0 ? null : built;
    }

    const parsed = JSON.parse(overlaysJson) as unknown;
    if (parsed === null) {
      return null;
    }
    if (typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('pageOverlays must be a JSON object');
    }
    return parsed as PageOverlays;
  }

  function save() {
    startTransition(async () => {
      setError(null);
      setStatus(null);

      let pageOverlays: PageOverlays | null;
      try {
        pageOverlays = resolveOverlaysForSave();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Invalid overlays');
        return;
      }

      try {
        const res = await fetch(
          `${apiBase()}/api/v1/front-templates/themes/${encodeURIComponent(themeCode)}/page-overlays`,
          {
            method: 'PUT',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              pageOverlays,
              overlayPlaceholders: placeholderDefaults,
            }),
          },
        );
        const json = await res.json();
        if (!res.ok) {
          setError(json.message ?? `HTTP ${res.status}`);
          return;
        }
        const theme = json.data?.theme as ThemeDoc | undefined;
        applyOverlays((theme?.pageOverlays ?? {}) as PageOverlays);
        if (theme && Array.isArray(theme.overlayPlaceholders)) {
          persistPlaceholders(normalizeOverlayPlaceholders(theme.overlayPlaceholders));
        }
        setStatus(`Wrote ${json.data?.relative ?? 'theme YAML'} — commit via Git`);
        if (theme) {
          onSaved?.(theme);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to write theme overlays');
      }
    });
  }

  if (!themeCode) {
    return (
      <p className="text-xs text-slate-500">
        Select a theme preview to edit its <code>pageOverlays</code>.
      </p>
    );
  }

  return (
    <div className="space-y-3 border-t border-slate-100 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium text-slate-800">Theme pageOverlays</h3>
        <code className="text-[11px] text-slate-500">{themeCode}.yaml</code>
      </div>
      <p className="text-[11px] leading-relaxed text-slate-500">
        Structured editor for <code>pageOverlays.&#123;slug&#125;.&#123;slot&#125;.prepend|append</code>,
        grouped by slug/slot. Writes theme YAML only.
      </p>

      {placeholderConflict ? (
        <div className="space-y-2 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          <p className="font-medium">
            Placeholder list differs from theme <code>{placeholderConflict.themeCode}</code>
          </p>
          <p className="text-[11px] text-amber-900/80">
            Local only:{' '}
            {diffOverlayPlaceholders(placeholderConflict.local, placeholderConflict.theme)
              .onlyLocal.map((item) => `${item.slug}.${item.slot}`)
              .join(', ') || '—'}
            ; Theme only:{' '}
            {diffOverlayPlaceholders(placeholderConflict.local, placeholderConflict.theme)
              .onlyRemote.map((item) => `${item.slug}.${item.slot}`)
              .join(', ') || '—'}
            . Choice is remembered for this theme until YAML placeholders change.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded border border-amber-500 bg-white px-2 py-1 hover:bg-amber-100"
              onClick={() => resolveConflict('theme')}
            >
              Use theme
            </button>
            <button
              type="button"
              className="rounded border border-amber-500 bg-white px-2 py-1 hover:bg-amber-100"
              onClick={() => resolveConflict('local')}
            >
              Keep local
            </button>
            <button
              type="button"
              className="rounded border border-amber-500 bg-white px-2 py-1 hover:bg-amber-100"
              onClick={() => resolveConflict('merge')}
            >
              Merge
            </button>
            <button
              type="button"
              className="rounded border border-slate-300 bg-white px-2 py-1 text-slate-600 hover:bg-slate-50"
              onClick={forgetSavedChoice}
            >
              Forget choice
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex gap-1 rounded border border-slate-200 p-0.5 text-xs">
        <button
          type="button"
          className={`flex-1 rounded px-2 py-1 ${mode === 'form' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
          onClick={() => {
            setMode('form');
            syncJsonFromRows(rows);
          }}
        >
          Form
        </button>
        <button
          type="button"
          className={`flex-1 rounded px-2 py-1 ${mode === 'json' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
          onClick={() => {
            setMode('json');
            setOverlaysJson(JSON.stringify(buildOverlaysFromRows(rows), null, 2));
          }}
        >
          JSON
        </button>
      </div>

      {mode === 'form' ? (
        <div className="space-y-3">
          {groups.map((group) => (
              <section key={group.key} className="space-y-2">
                <div className="flex items-center gap-2 border-b border-amber-100 pb-1">
                  <h4 className="font-mono text-[11px] font-semibold text-amber-950">
                    {group.slug.trim() || '(empty)'}.{group.slot.trim() || '(empty)'}
                  </h4>
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-900">
                    {group.rows.length}
                  </span>
                  <button
                    type="button"
                    className="ml-auto rounded border border-amber-300 bg-white px-2 py-0.5 text-[10px] text-amber-900 hover:bg-amber-50"
                    onClick={() =>
                      addRow({
                        slug: group.slug.trim() || 'home',
                        slot: group.slot.trim() || 'main',
                      })
                    }
                  >
                    Add here
                  </button>
                </div>
                {group.rows.map((row, groupIndex) => {
                  const index = group.indices[groupIndex] ?? rows.findIndex((item) => item.key === row.key);
                  return (
                    <div key={row.key}>
                      {dropIndex === index ? (
                        <div className="mb-2 h-1 rounded bg-amber-500" />
                      ) : null}
                      <div
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.setData('text/plain', row.key);
                          event.dataTransfer.effectAllowed = 'move';
                          setDraggingKey(row.key);
                        }}
                        onDragEnd={() => {
                          setDraggingKey(null);
                          setDropIndex(null);
                        }}
                        onDragOver={(event) => {
                          if (!draggingKey) {
                            return;
                          }
                          event.preventDefault();
                          const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
                          const before = event.clientY < rect.top + rect.height / 2;
                          setDropIndex(before ? index : index + 1);
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
                          const before = event.clientY < rect.top + rect.height / 2;
                          dropAt(before ? index : index + 1);
                        }}
                        className={`space-y-2 rounded border border-amber-200 bg-amber-50/60 p-2 text-xs ${
                          draggingKey === row.key ? 'opacity-50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="cursor-grab select-none text-slate-400 active:cursor-grabbing"
                            aria-hidden
                          >
                            ∷
                          </span>
                          <span className="text-[10px] uppercase tracking-wide text-amber-800/80">
                            drag to reorder
                          </span>
                          <div className="ml-auto flex gap-1">
                            <button
                              type="button"
                              className="rounded border border-slate-200 bg-white px-2 py-0.5 hover:bg-slate-50 disabled:opacity-40"
                              disabled={index === 0}
                              onClick={() => moveRow(row.key, -1)}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              className="rounded border border-slate-200 bg-white px-2 py-0.5 hover:bg-slate-50 disabled:opacity-40"
                              disabled={index === rows.length - 1}
                              onClick={() => moveRow(row.key, 1)}
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              className="rounded border border-rose-200 bg-white px-2 py-0.5 text-rose-700 hover:bg-rose-50"
                              onClick={() => removeRow(row.key)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <label className="space-y-1">
                            <span className="text-[10px] uppercase tracking-wide text-slate-500">slug</span>
                            <input
                              className="w-full rounded border border-slate-300 bg-white px-2 py-1"
                              value={row.slug}
                              onChange={(event) => updateRow(row.key, { slug: event.target.value })}
                            />
                          </label>
                          <label className="space-y-1">
                            <span className="text-[10px] uppercase tracking-wide text-slate-500">slot</span>
                            <select
                              className="w-full rounded border border-slate-300 bg-white px-2 py-1"
                              value={row.slot}
                              onChange={(event) => updateRow(row.key, { slot: event.target.value })}
                            >
                              {SLOT_OPTIONS.map((slot) => (
                                <option key={slot} value={slot}>
                                  {slot}
                                </option>
                              ))}
                              {!SLOT_OPTIONS.includes(row.slot as (typeof SLOT_OPTIONS)[number]) ? (
                                <option value={row.slot}>{row.slot}</option>
                              ) : null}
                            </select>
                          </label>
                          <label className="space-y-1">
                            <span className="text-[10px] uppercase tracking-wide text-slate-500">
                              position
                            </span>
                            <select
                              className="w-full rounded border border-slate-300 bg-white px-2 py-1"
                              value={row.position}
                              onChange={(event) =>
                                updateRow(row.key, {
                                  position: event.target.value === 'append' ? 'append' : 'prepend',
                                })
                              }
                            >
                              <option value="prepend">prepend</option>
                              <option value="append">append</option>
                            </select>
                          </label>
                          <label className="space-y-1">
                            <span className="text-[10px] uppercase tracking-wide text-slate-500">type</span>
                            <select
                              className="w-full rounded border border-slate-300 bg-white px-2 py-1"
                              value={row.type}
                              onChange={(event) => updateRow(row.key, { type: event.target.value })}
                            >
                              {typeOptions.map((type) => (
                                <option key={type} value={type}>
                                  {type}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <label className="block space-y-1">
                          <span className="text-[10px] uppercase tracking-wide text-slate-500">id</span>
                          <input
                            className="w-full rounded border border-slate-300 bg-white px-2 py-1 font-mono"
                            value={row.id}
                            onChange={(event) => updateRow(row.key, { id: event.target.value })}
                          />
                        </label>
                        <label className="block space-y-1">
                          <span className="text-[10px] uppercase tracking-wide text-slate-500">
                            text / message
                          </span>
                          <input
                            className="w-full rounded border border-slate-300 bg-white px-2 py-1"
                            value={row.text}
                            onChange={(event) => updateRow(row.key, { text: event.target.value })}
                            placeholder="Announcement text"
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </section>
            ))}
          {placeholders.map((item) => (
            <section
              key={`placeholder-${item.slug}-${item.slot}`}
              className="space-y-2 rounded border border-dashed border-slate-200 bg-slate-50/70 p-2"
            >
              <div className="flex items-center gap-2">
                <h4 className="font-mono text-[11px] font-semibold text-slate-600">
                  {item.slug}.{item.slot}
                </h4>
                <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-600">
                  empty
                </span>
                <button
                  type="button"
                  className="ml-auto rounded border border-slate-300 bg-white px-2 py-0.5 text-[10px] text-slate-700 hover:bg-white"
                  onClick={() => addRow({ slug: item.slug, slot: item.slot })}
                >
                  Add here
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                No overlays for this slug/slot yet. Add a seasonal block to start.
              </p>
            </section>
          ))}
          {rows.length > 0 && dropIndex === rows.length ? (
            <div className="h-1 rounded bg-amber-500" />
          ) : null}
        </div>
      ) : (
        <textarea
          className="h-48 w-full rounded border border-slate-300 bg-slate-50 px-2 py-1.5 font-mono text-[11px] text-slate-800"
          value={overlaysJson}
          onChange={(event) => syncRowsFromJson(event.target.value)}
          spellCheck={false}
        />
      )}

      <div className="space-y-2 rounded border border-slate-200 bg-slate-50/80 p-2 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-medium text-slate-700">Empty-group placeholders</p>
          <div className="flex flex-wrap gap-1">
            {rememberedChoice ? (
              <button
                type="button"
                className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[10px] text-slate-600 hover:bg-white"
                onClick={forgetSavedChoice}
              >
                Forget {rememberedChoice} choice
              </button>
            ) : null}
            <button
              type="button"
              className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[10px] text-slate-600 hover:bg-white"
              onClick={() => persistPlaceholders([...DEFAULT_OVERLAY_PLACEHOLDERS])}
            >
              Reset defaults
            </button>
            <button
              type="button"
              className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[10px] text-slate-600 hover:bg-white"
              onClick={exportChoices}
            >
              Export bundle
            </button>
            <button
              type="button"
              className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[10px] text-slate-600 hover:bg-white"
              onClick={() => {
                void copyExportBundle();
              }}
            >
              Copy bundle JSON
            </button>
            <label className="cursor-pointer rounded border border-slate-300 bg-white px-2 py-0.5 text-[10px] text-slate-600 hover:bg-white">
              Import merge
              <input
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(event) => {
                  importChoices(event.target.files?.[0] ?? null, 'merge');
                  event.currentTarget.value = '';
                }}
              />
            </label>
            <label className="cursor-pointer rounded border border-slate-300 bg-white px-2 py-0.5 text-[10px] text-slate-600 hover:bg-white">
              Import replace
              <input
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(event) => {
                  importChoices(event.target.files?.[0] ?? null, 'replace');
                  event.currentTarget.value = '';
                }}
              />
            </label>
            {deferredOverlays ? (
              <>
                <button
                  type="button"
                  className="rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] text-amber-900 hover:bg-amber-100"
                  onClick={() => applyDeferredOverlays('replace')}
                >
                  Apply last import
                </button>
                <button
                  type="button"
                  className="rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] text-amber-900 hover:bg-amber-100"
                  onClick={() => applyDeferredOverlays('merge')}
                >
                  Merge last import
                </button>
                <button
                  type="button"
                  className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[10px] text-slate-600 hover:bg-slate-50"
                  onClick={() => {
                    clearDeferredOverlays();
                    setChoicesStatus('Cleared deferred overlays');
                  }}
                >
                  Forget last import
                </button>
              </>
            ) : null}
          </div>
        </div>
        <p className="text-[11px] text-slate-500">
          Browser cache + written to theme YAML as <code>overlayPlaceholders</code> on Save.
          Missing slug/slot pairs show as dashed empty groups above.
          Bundle export includes conflict choices, placeholder list, and current overlays draft.
        </p>
        {choicesWarning ? <p className="text-[11px] text-amber-800">{choicesWarning}</p> : null}
        {deferredOverlays ? (
          <p className={`text-[11px] ${deferredAge?.stale ? 'text-rose-700' : 'text-amber-800'}`}>
            Deferred overlays ready: {describeLastImportedOverlays(deferredOverlays)}
            {deferredAge
              ? ` · ${deferredAge.label}${deferredAge.stale ? ' (stale — re-import recommended)' : ''}`
              : ''}
            .
          </p>
        ) : null}
        {choicesStatus ? <p className="text-[11px] text-teal-700">{choicesStatus}</p> : null}

        <div
          className={`space-y-2 rounded border border-dashed p-3 text-[11px] ${
            importDropActive
              ? 'border-amber-400 bg-amber-50 text-amber-900'
              : 'border-slate-300 bg-white text-slate-600'
          }`}
          onDragEnter={(event) => {
            event.preventDefault();
            setImportDropActive(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setImportDropActive(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setImportDropActive(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setImportDropActive(false);
            const file = pickDroppedImportFile(event.dataTransfer.files);
            if (file) {
              importChoices(file, importDropMode);
              return;
            }
            const text = event.dataTransfer.getData('text/plain');
            if (looksLikeStudioBundleJson(text)) {
              importChoicesPayload(text, importDropMode);
              return;
            }
            setChoicesStatus('Drop a .json bundle or pasteable JSON text to import');
          }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span>Drop or paste bundle JSON here</span>
            <label className="flex items-center gap-1">
              <span className="text-[10px] uppercase tracking-wide text-slate-500">mode</span>
              <select
                className="rounded border border-slate-300 bg-white px-1.5 py-0.5"
                value={importDropMode}
                onChange={(event) =>
                  setImportDropMode(event.target.value === 'replace' ? 'replace' : 'merge')
                }
              >
                <option value="merge">merge</option>
                <option value="replace">replace</option>
              </select>
            </label>
          </div>
          <textarea
            className="h-20 w-full rounded border border-slate-300 bg-white px-2 py-1 font-mono text-[10px] text-slate-800"
            value={pasteDraft}
            onChange={(event) => setPasteDraft(event.target.value)}
            placeholder='{"kind":"front-studio.overlay-placeholder-bundle",...}'
            spellCheck={false}
          />
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[10px] text-slate-700 hover:bg-slate-50"
              onClick={importPastedBundle}
            >
              Import pasted JSON
            </button>
            <button
              type="button"
              className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[10px] text-slate-600 hover:bg-slate-50"
              onClick={() => setPasteDraft('')}
            >
              Clear paste
            </button>
          </div>
        </div>

        <div className="space-y-2 rounded border border-slate-200 bg-white p-2">
          <p className="font-medium text-slate-700">Share toast dwell preview</p>
          <p className="text-[11px] text-slate-500">
            Controls auto-dismiss for storefront ShareButton preview (`0` = manual close only).
            Saved in this browser; override with <code>NEXT_PUBLIC_SHARE_TOAST_DWELL_MS</code>.
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="space-y-1">
              <span className="text-[10px] uppercase tracking-wide text-slate-500">dwell ms</span>
              <input
                type="number"
                min={0}
                max={60000}
                step={100}
                className="w-28 rounded border border-slate-300 bg-white px-2 py-1"
                value={toastDwellDraft}
                onChange={(event) => setToastDwellDraft(event.target.value)}
                onBlur={() => persistToastDwell(Number(toastDwellDraft))}
              />
            </label>
            <button
              type="button"
              className="rounded border border-slate-300 bg-white px-2 py-1 text-[10px] text-slate-700 hover:bg-slate-50"
              onClick={() => persistToastDwell(Number(toastDwellDraft))}
            >
              Apply
            </button>
            <button
              type="button"
              className="rounded border border-slate-300 bg-white px-2 py-1 text-[10px] text-slate-700 hover:bg-slate-50"
              onClick={() => persistToastDwell(DEFAULT_SHARE_TOAST_DWELL_MS)}
            >
              Reset 3200
            </button>
            <label className="space-y-1">
              <span className="text-[10px] uppercase tracking-wide text-slate-500">
                share page
              </span>
              <select
                className="rounded border border-slate-300 bg-white px-2 py-1"
                value={sharePreviewSlug}
                onChange={(event) => persistSharePreviewSlug(event.target.value)}
              >
                {SHARE_PREVIEW_SLUGS.map((slug) => (
                  <option key={slug} value={slug}>
                    {slug}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[10px] uppercase tracking-wide text-slate-500">
                share locale
              </span>
              <select
                className="rounded border border-slate-300 bg-white px-2 py-1"
                value={sharePreviewLocale}
                onChange={(event) => persistSharePreviewLocale(event.target.value)}
              >
                {SHARE_PREVIEW_LOCALES.map((locale) => (
                  <option key={locale} value={locale}>
                    {locale}
                  </option>
                ))}
              </select>
            </label>
            <ShareButton
              title={`${themeCode || 'theme'} ${sharePreviewSlug} share preview`}
              text={`Front Studio toast dwell preview (${sharePreviewSlug}/${sharePreviewLocale})`}
              image={sharePreviewImage}
              toastDwellMs={toastDwellMs}
            />
            <button
              type="button"
              className="rounded border border-slate-300 bg-white px-2 py-1 text-[10px] text-slate-700 hover:bg-slate-50"
              onClick={() => {
                void copySharePreviewUrl();
              }}
            >
              Copy image URL
            </button>
            <button
              type="button"
              className="rounded border border-slate-300 bg-white px-2 py-1 text-[10px] text-slate-700 hover:bg-slate-50"
              onClick={openSharePreviewImage}
            >
              Open image
            </button>
            <button
              type="button"
              className="rounded border border-slate-300 bg-white px-2 py-1 text-[10px] text-slate-700 hover:bg-slate-50"
              onClick={() => {
                void downloadSharePreviewImage();
              }}
            >
              Download image
            </button>
          </div>
          <p className="font-mono text-[10px] text-slate-500">
            {sharePreviewImage}
            {sharePreviewBroken ? ' (fallback)' : ''}
          </p>
          {copyUrlStatus ? (
            <p className="text-[10px] text-teal-700">{copyUrlStatus}</p>
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={`${sharePreviewSlug}-${sharePreviewLocale}-${sharePreviewBroken ? 'fb' : 'ok'}`}
            src={sharePreviewImage}
            alt={`${sharePreviewSlug} share card (${sharePreviewLocale})`}
            className="h-24 w-auto max-w-full rounded border border-slate-200 bg-slate-50 object-contain"
            onError={() => {
              if (!sharePreviewBroken) {
                setSharePreviewBroken(true);
              }
            }}
          />
        </div>
        <ul className="space-y-1">
          {placeholderDefaults.map((item) => (
            <li
              key={`default-${item.slug}-${item.slot}`}
              className="flex items-center gap-2 rounded border border-slate-200 bg-white px-2 py-1"
            >
              <code className="font-mono text-[11px] text-slate-700">
                {item.slug}.{item.slot}
              </code>
              <button
                type="button"
                className="ml-auto rounded border border-rose-200 px-2 py-0.5 text-[10px] text-rose-700 hover:bg-rose-50"
                onClick={() =>
                  persistPlaceholders(removeOverlayPlaceholder(placeholderDefaults, item.slug, item.slot))
                }
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-end gap-2">
          <label className="space-y-1">
            <span className="text-[10px] uppercase tracking-wide text-slate-500">slug</span>
            <input
              className="w-28 rounded border border-slate-300 bg-white px-2 py-1"
              value={draftSlug}
              onChange={(event) => setDraftSlug(event.target.value)}
              placeholder="home"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] uppercase tracking-wide text-slate-500">slot</span>
            <select
              className="rounded border border-slate-300 bg-white px-2 py-1"
              value={draftSlot}
              onChange={(event) => setDraftSlot(event.target.value)}
            >
              {SLOT_OPTIONS.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
              {!SLOT_OPTIONS.includes(draftSlot as (typeof SLOT_OPTIONS)[number]) ? (
                <option value={draftSlot}>{draftSlot}</option>
              ) : null}
            </select>
          </label>
          <button
            type="button"
            className="rounded border border-slate-300 bg-white px-2 py-1 text-slate-700 hover:bg-slate-50"
            onClick={() => {
              persistPlaceholders(
                upsertOverlayPlaceholder(placeholderDefaults, {
                  slug: draftSlug,
                  slot: draftSlot,
                }),
              );
            }}
          >
            Add placeholder
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={addRow}
          className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
        >
          Add block
        </button>
        <button
          type="button"
          onClick={seedHomeAnnouncement}
          className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
        >
          Seed home.main
        </button>
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded border border-amber-600 px-2 py-1 text-xs text-amber-900 hover:bg-amber-50 disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Write overlays'}
        </button>
      </div>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      {status ? <p className="text-xs text-teal-700">{status}</p> : null}
    </div>
  );
}
