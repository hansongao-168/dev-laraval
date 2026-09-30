'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import type { PageDocument, ResolvedPage, BlockTypeInfo, CapabilityInfo } from '@erp/front-experience/core';
import { flattenSlots, isThemeOverlayBlock, stripThemeOverlayBlocks } from '@erp/front-experience/core';
import { PageRenderer } from '@/components/front-experience/page-renderer';
import { DocumentSlotsEditor } from './document-slots-editor';
import { ThemeOverlaysEditor } from './theme-overlays-editor';

type ThemeOption = {
  code?: string;
  skinCode?: string;
  label?: unknown;
  pageOverlays?: Record<string, unknown>;
};

type Props = {
  initialPage: ResolvedPage;
  blockTypes: BlockTypeInfo[];
  capabilities: CapabilityInfo[];
  shells: Array<{ key: string; slots: Array<{ key: string }> }>;
};

function apiBase(): string {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    process.env.API_BASE_URL ??
    'http://localhost:8000'
  );
}

function themeLabel(theme: ThemeOption): string {
  const label = theme.label;
  if (label && typeof label === 'object' && label !== null) {
    const map = label as Record<string, unknown>;
    if (typeof map.zh_CN === 'string') {
      return map.zh_CN;
    }
    if (typeof map.en === 'string') {
      return map.en;
    }
  }
  return String(theme.code ?? '');
}

export function FrontStudioClient({ initialPage, blockTypes, capabilities, shells }: Props) {
  const [slug, setSlug] = useState(initialPage.document.page.slug);
  const [channel, setChannel] = useState('all');
  const [theme, setTheme] = useState('');
  const [skin, setSkin] = useState('');
  const [at, setAt] = useState('');
  const [page, setPage] = useState(initialPage);
  const [themes, setThemes] = useState<ThemeOption[]>([]);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const overlayBlocks = useMemo(
    () => flattenSlots(page.document.shell.slots).filter((row) => isThemeOverlayBlock(row.block)),
    [page.document],
  );

  const documentYamlPreview = useMemo(
    () => JSON.stringify(page.document, null, 2),
    [page.document],
  );

  useEffect(() => {
    fetch(`${apiBase()}/api/v1/front-templates/themes`, {
      headers: { Accept: 'application/json' },
      credentials: 'include',
    })
      .then(async (res) => {
        if (!res.ok) {
          return;
        }
        const json = (await res.json()) as { data?: ThemeOption[] };
        setThemes(Array.isArray(json.data) ? json.data : []);
      })
      .catch(() => undefined);
  }, []);

  function setDocument(document: PageDocument) {
    setPage((current) => ({ ...current, document }));
    setDirty(true);
    setStatus(null);
  }

  function reload() {
    startTransition(async () => {
      setError(null);
      setStatus(null);
      const params = new URLSearchParams({ channel });
      if (at) params.set('at', at);
      if (theme) params.set('theme', theme);
      if (skin) params.set('skin', skin);

      try {
        const res = await fetch(
          `${apiBase()}/api/v1/front-pages/${encodeURIComponent(slug)}?${params}`,
          { headers: { Accept: 'application/json' }, credentials: 'include' },
        );
        const json = await res.json();
        if (!res.ok) {
          setError(json.message ?? `HTTP ${res.status}`);
          return;
        }
        setPage(json.data);
        setDirty(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load page');
      }
    });
  }

  function downloadDocument() {
    const blob = new Blob([JSON.stringify(stripThemeOverlayBlocks(page.document), null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${page.document.page.slug}.${channel}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function writeToRepo() {
    startTransition(async () => {
      setError(null);
      setStatus(null);

      try {
        const document = stripThemeOverlayBlocks(page.document);
        const res = await fetch(
          `${apiBase()}/api/v1/front-pages/${encodeURIComponent(slug)}`,
          {
            method: 'PUT',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              channel,
              document,
            }),
          },
        );
        const json = await res.json();
        if (!res.ok) {
          setError(json.message ?? `HTTP ${res.status}`);
          return;
        }
        setDirty(false);
        const stripped = overlayBlocks.length;
        setStatus(
          `Wrote ${json.data?.relative ?? 'page YAML'}${
            stripped > 0 ? ` (stripped ${stripped} theme overlay block${stripped === 1 ? '' : 's'})` : ''
          } — commit via Git`,
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to write page');
      }
    });
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[340px_1fr]">
      <aside className="space-y-4 rounded border border-slate-200 bg-white p-4 text-sm">
        <h2 className="font-semibold text-slate-900">Controls</h2>
        <label className="block space-y-1">
          <span className="text-xs text-slate-500">slug</span>
          <input
            className="w-full rounded border border-slate-300 px-2 py-1.5"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-slate-500">channel</span>
          <select
            className="w-full rounded border border-slate-300 px-2 py-1.5"
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
          >
            <option value="all">all</option>
            <option value="web">web</option>
            <option value="miniapp">miniapp</option>
            <option value="mobile">mobile</option>
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-slate-500">theme preview</span>
          <select
            className="w-full rounded border border-slate-300 px-2 py-1.5"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
          >
            <option value="">(schedule / none)</option>
            {themes.map((item) => (
              <option key={String(item.code)} value={String(item.code ?? '')}>
                {themeLabel(item)}
                {item.pageOverlays ? ' · overlays' : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-slate-500">skin preview</span>
          <input
            className="w-full rounded border border-slate-300 px-2 py-1.5"
            placeholder="classic"
            value={skin}
            onChange={(e) => setSkin(e.target.value)}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-slate-500">at (ISO)</span>
          <input
            className="w-full rounded border border-slate-300 px-2 py-1.5"
            placeholder="2026-10-02T10:00:00+08:00"
            value={at}
            onChange={(e) => setAt(e.target.value)}
          />
        </label>
        {overlayBlocks.length > 0 ? (
          <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <p className="font-medium">
              {overlayBlocks.length} theme overlay block{overlayBlocks.length === 1 ? '' : 's'} in
              preview
            </p>
            <ul className="mt-1 space-y-0.5">
              {overlayBlocks.map(({ slot, block }) => (
                <li key={`${slot}-${block.id}`}>
                  <code>{slot}</code> · {block.id}
                </li>
              ))}
            </ul>
            <p className="mt-1 text-[11px] text-amber-800/80">
              Overlays come from theme YAML and are stripped on Download / Write to repo.
            </p>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={reload}
            disabled={pending}
            className="rounded bg-teal-700 px-3 py-1.5 text-white hover:bg-teal-800 disabled:opacity-50"
          >
            {pending ? 'Working…' : 'Reload'}
          </button>
          <button
            type="button"
            onClick={downloadDocument}
            className="rounded border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
          >
            Download JSON
          </button>
          <button
            type="button"
            onClick={writeToRepo}
            disabled={pending}
            className="rounded border border-teal-700 px-3 py-1.5 text-teal-800 hover:bg-teal-50 disabled:opacity-50"
          >
            Write to repo
          </button>
        </div>
        {dirty ? (
          <p className="text-amber-700">Unsaved slot edits — write to repo or download.</p>
        ) : null}
        {error ? <p className="text-rose-600">{error}</p> : null}
        {status ? <p className="text-teal-700">{status}</p> : null}
        <p className="text-[11px] leading-relaxed text-slate-500">
          Local/dev Studio only. Production PUT always returns 404. Not an Admin panel.
        </p>

        <div className="border-t border-slate-100 pt-4">
          <h3 className="mb-2 font-medium text-slate-800">Palette</h3>
          <ul className="max-h-40 space-y-1 overflow-auto text-xs text-slate-600">
            {blockTypes.map((t) => (
              <li key={t.type}>
                <code>{t.type}</code> — {t.label}
              </li>
            ))}
          </ul>
        </div>

        <ThemeOverlaysEditor
          themeCode={theme}
          blockTypes={blockTypes}
          onSaved={(saved) => {
            setThemes((current) =>
              current.map((item) =>
                item.code === saved.code
                  ? { ...item, pageOverlays: saved.pageOverlays }
                  : item,
              ),
            );
          }}
        />
      </aside>

      <div className="space-y-6">
        <section className="rounded border border-slate-200 bg-white p-4">
          <DocumentSlotsEditor
            document={page.document}
            blockTypes={blockTypes}
            capabilities={capabilities}
            shells={shells}
            onChange={setDocument}
          />
        </section>
        <section className="rounded border border-slate-200 bg-white p-4">
          <h2 className="mb-4 font-semibold text-slate-900">Preview</h2>
          <PageRenderer page={page} channel={channel === 'all' ? 'web' : channel} />
        </section>
        <section className="rounded border border-slate-200 bg-white p-4">
          <h2 className="mb-2 font-semibold text-slate-900">Document JSON</h2>
          <pre className="max-h-80 overflow-auto rounded bg-slate-950 p-3 text-xs text-slate-100">
            {documentYamlPreview}
          </pre>
        </section>
      </div>
    </div>
  );
}
