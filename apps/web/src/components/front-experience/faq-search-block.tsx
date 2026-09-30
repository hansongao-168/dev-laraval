'use client';

import { FormEvent, useEffect, useMemo, useRef, useState, useTransition } from 'react';
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

function FaqResults({
  title,
  items,
}: {
  title: string;
  items: Array<Record<string, unknown>>;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">暂无 FAQ</p>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <details
              key={String(item.id ?? index)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-3"
            >
              <summary className="cursor-pointer text-sm font-semibold text-slate-900">
                {String(item.question ?? 'Question')}
              </summary>
              {item.answer ? (
                <p className="mt-2 text-sm text-slate-600">{String(item.answer)}</p>
              ) : null}
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

export function FaqSearchBlock({ block }: BlockComponentProps) {
  const initialQ = typeof block.props?.q === 'string' ? block.props.q : '';
  const initialTitle = typeof block.props?.title === 'string' ? block.props.title : '搜索 FAQ';
  const initialItems = useMemo(() => asItems(block.props?.items), [block.props?.items]);
  const initialPage =
    typeof block.props?.page === 'number'
      ? block.props.page
      : Number.parseInt(String(block.props?.page ?? '1'), 10) || 1;
  const initialHasMore = Boolean(block.props?.hasMore);

  const [q, setQ] = useState(initialQ);
  const [title, setTitle] = useState(initialTitle);
  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipInitialDebounce = useRef(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  function fetchFaqPage(keyword: string, nextPage: number, append: boolean) {
    startTransition(async () => {
      setError(null);

      try {
        const params = new URLSearchParams({ channel: 'web' });
        if (keyword !== '') {
          params.set('q', keyword);
        }
        if (nextPage > 1) {
          params.set('faqPage', String(nextPage));
        }

        const articlePage = new URL(window.location.href).searchParams.get('page');
        if (articlePage) {
          params.set('page', articlePage);
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
        const search = main.find((item) => item.type === 'mall.faq-search');
        const nextItems = asItems(search?.props?.items);
        const nextTitle =
          typeof search?.props?.title === 'string' ? search.props.title : initialTitle;
        const nextHasMore = Boolean(search?.props?.hasMore);
        const resolvedPage =
          typeof search?.props?.page === 'number'
            ? search.props.page
            : Number.parseInt(String(search?.props?.page ?? nextPage), 10) || nextPage;

        setItems((current) => (append ? mergeById(current, nextItems) : nextItems));
        setTitle(nextTitle);
        setHasMore(nextHasMore);
        setPage(resolvedPage);

        const url = new URL(window.location.href);
        if (keyword === '') {
          url.searchParams.delete('q');
        } else {
          url.searchParams.set('q', keyword);
        }
        if (resolvedPage <= 1) {
          url.searchParams.delete('faqPage');
        } else {
          url.searchParams.set('faqPage', String(resolvedPage));
        }
        window.history.replaceState({}, '', url.toString());
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : '搜索失败');
      }
    });
  }

  function runSearch(keyword: string) {
    fetchFaqPage(keyword, 1, false);
  }

  function loadMore() {
    if (!hasMore || pending) {
      return;
    }
    fetchFaqPage(q.trim(), page + 1, true);
  }

  useEffect(() => {
    if (skipInitialDebounce.current) {
      skipInitialDebounce.current = false;
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      runSearch(q.trim());
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce on q only
  }, [q]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, page, pending, q]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    runSearch(q.trim());
  }

  return (
    <div className="space-y-3">
      <form onSubmit={onSubmit} className="flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="搜索问题或答案"
          className="min-w-[16rem] flex-1 rounded border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-[var(--color-primary,#0F766E)] px-4 py-2 text-sm text-white disabled:opacity-60"
        >
          {pending ? '搜索中…' : '搜索'}
        </button>
      </form>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <FaqResults title={title} items={items} />
      {hasMore ? (
        <div ref={sentinelRef} className="flex justify-center py-2">
          <button
            type="button"
            disabled={pending}
            onClick={loadMore}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            {pending ? '加载中…' : '加载更多 FAQ'}
          </button>
        </div>
      ) : items.length > 0 ? (
        <p className="text-center text-xs text-slate-400">已加载全部 FAQ</p>
      ) : null}
    </div>
  );
}
