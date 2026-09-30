'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import type { BlockComponentProps } from '@erp/front-experience/core';

function asItems(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is Record<string, unknown> => typeof item === 'object' && item !== null,
  );
}

function apiBase(): string {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    process.env.API_BASE_URL ??
    'http://localhost:8000'
  );
}

function mergeById(
  current: Array<Record<string, unknown>>,
  incoming: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> {
  const seen = new Set(current.map((item) => String(item.id ?? '')));
  const next = [...current];

  for (const item of incoming) {
    const key = String(item.id ?? '');
    if (key !== '' && seen.has(key)) {
      continue;
    }
    if (key !== '') {
      seen.add(key);
    }
    next.push(item);
  }

  return next;
}

export function ArticleListBlock({ block }: BlockComponentProps) {
  const initialTitle = typeof block.props?.title === 'string' ? block.props.title : '帮助文章';
  const initialItems = useMemo(() => asItems(block.props?.items), [block.props?.items]);
  const initialPage =
    typeof block.props?.page === 'number'
      ? block.props.page
      : Number.parseInt(String(block.props?.page ?? '1'), 10) || 1;
  const initialHasMore = Boolean(block.props?.hasMore);

  const [title, setTitle] = useState(initialTitle);
  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  function loadMore() {
    if (!hasMore || pending) {
      return;
    }

    const nextPage = page + 1;

    startTransition(async () => {
      setError(null);

      try {
        const params = new URLSearchParams({ channel: 'web', page: String(nextPage) });
        const current = new URL(window.location.href);
        const q = current.searchParams.get('q');
        const faqPage = current.searchParams.get('faqPage');
        if (q) {
          params.set('q', q);
        }
        if (faqPage) {
          params.set('faqPage', faqPage);
        }

        const response = await fetch(
          `${apiBase()}/api/v1/front-pages/help?${params.toString()}`,
          { headers: { Accept: 'application/json' } },
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload = (await response.json()) as {
          data?: {
            document?: {
              shell?: { slots?: Record<string, Array<{ type: string; props?: Record<string, unknown> }>> };
            };
          };
        };

        const main = payload.data?.document?.shell?.slots?.main ?? [];
        const list = main.find((item) => item.type === 'mall.article-list');
        const nextItems = asItems(list?.props?.items);
        const nextTitle =
          typeof list?.props?.title === 'string' ? list.props.title : initialTitle;
        const nextHasMore = Boolean(list?.props?.hasMore);
        const resolvedPage =
          typeof list?.props?.page === 'number'
            ? list.props.page
            : Number.parseInt(String(list?.props?.page ?? nextPage), 10) || nextPage;

        setItems((currentItems) => mergeById(currentItems, nextItems));
        setTitle(nextTitle);
        setHasMore(nextHasMore);
        setPage(resolvedPage);

        const url = new URL(window.location.href);
        url.searchParams.set('page', String(resolvedPage));
        window.history.replaceState({}, '', url.toString());
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : '加载失败');
      }
    });
  }

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMore();
        }
      },
      { rootMargin: '120px' },
    );

    observer.observe(node);

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- observe when paging state changes
  }, [hasMore, page, pending]);

  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">暂无文章</p>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => {
            const heading = (
              <h4 className="text-sm font-semibold text-slate-900">
                {String(item.title ?? 'Article')}
              </h4>
            );

            return (
              <article
                key={String(item.id ?? index)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-3"
              >
                {typeof item.href === 'string' && item.href !== '' ? (
                  <a href={item.href} className="hover:underline">
                    {heading}
                  </a>
                ) : (
                  heading
                )}
                {item.excerpt ? (
                  <p className="mt-1 text-sm text-slate-600">{String(item.excerpt)}</p>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {hasMore ? (
        <div ref={sentinelRef} className="flex justify-center py-2">
          <button
            type="button"
            disabled={pending}
            onClick={loadMore}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            {pending ? '加载中…' : '加载更多文章'}
          </button>
        </div>
      ) : items.length > 0 ? (
        <p className="text-center text-xs text-slate-400">已加载全部文章</p>
      ) : null}
    </div>
  );
}
