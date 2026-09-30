import type { BlockComponentProps, BlockRegistry } from '@erp/front-experience/core';
import { ArticleListBlock } from './article-list-block';
import { FaqSearchBlock } from './faq-search-block';

function partContent(skin: BlockComponentProps['skin'], partKey?: unknown) {
  if (typeof partKey !== 'string') {
    return null;
  }

  const part = skin.parts?.[partKey]?.value as { content?: Record<string, unknown> } | null;
  return part?.content ?? part ?? null;
}

function asItems(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is Record<string, unknown> => typeof item === 'object' && item !== null,
  );
}

function NavBarBlock({ block }: BlockComponentProps) {
  const location = String(block.props?.navLocation ?? 'header');

  return (
    <div className="rounded border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
      <span className="font-medium text-slate-900">Nav</span>
      <span className="ml-2 text-slate-500">location={location}</span>
    </div>
  );
}

function RichTextBlock({ block, skin }: BlockComponentProps) {
  const content = partContent(skin, block.props?.partKey) as Record<string, unknown> | null;
  const note = content && typeof content.note === 'string' ? content.note : null;
  const message = content && typeof content.message === 'string' ? content.message : null;
  const tagline = content && typeof content.tagline === 'string' ? content.tagline : null;

  return (
    <div className="rounded border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700">
      {note ?? message ?? tagline ?? JSON.stringify(content ?? block.props ?? {})}
    </div>
  );
}

function AnnouncementBlock({ block }: BlockComponentProps) {
  return (
    <div className="bg-amber-50 px-4 py-2 text-center text-sm text-amber-900">
      {String(block.props?.text ?? 'Announcement')}
    </div>
  );
}

function UnknownBlock({ block }: BlockComponentProps) {
  return (
    <div className="rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      Unknown block: <code>{block.type}</code>
    </div>
  );
}

function FabBlock({ block }: BlockComponentProps) {
  return (
    <div className="fixed bottom-6 right-6 rounded-full bg-[var(--color-primary,#0F766E)] px-4 py-3 text-sm text-white shadow">
      {String(block.props?.label ?? 'FAB')}
    </div>
  );
}

function LinkRowBlock({ block }: BlockComponentProps) {
  const links = Array.isArray(block.props?.links) ? block.props?.links : [];

  return (
    <div className="flex flex-wrap gap-3 text-sm text-slate-600">
      {(links as unknown[]).map((link, index) => (
        <span key={index} className="underline">
          {typeof link === 'object' && link && 'label' in link
            ? String((link as { label: unknown }).label)
            : String(link)}
        </span>
      ))}
    </div>
  );
}

function BannerCarouselBlock({ block, skin }: BlockComponentProps) {
  const content = partContent(skin, block.props?.partKey) as Record<string, unknown> | null;
  const items = asItems(block.props?.items ?? content?.items);

  if (items.length === 0) {
    return (
      <div className="rounded bg-slate-100 px-4 py-8 text-center text-sm text-slate-500">
        No banners ({String(block.props?.source ?? 'none')})
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((item, index) => {
        const title = String(item.title ?? 'Banner');
        const href = typeof item.href === 'string' && item.href !== '' ? item.href : null;
        const imageUrl =
          typeof item.imageUrl === 'string' && item.imageUrl !== ''
            ? item.imageUrl
            : typeof item.image_url === 'string' && item.image_url !== ''
              ? item.image_url
              : null;

        const body = (
          <>
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={title}
                className="h-36 w-full object-cover"
              />
            ) : null}
            <div className={imageUrl ? 'px-5 py-4' : 'px-5 py-8'}>
              <div className="text-lg font-semibold">{title}</div>
              {item.subtitle ? (
                <div className="mt-1 text-sm text-white/85">{String(item.subtitle)}</div>
              ) : null}
            </div>
          </>
        );

        const className =
          'overflow-hidden rounded-lg bg-[var(--color-primary,#0F766E)] text-white shadow-sm';

        if (href) {
          return (
            <a key={index} href={href} className={`${className} block hover:opacity-95`}>
              {body}
            </a>
          );
        }

        return (
          <div key={index} className={className}>
            {body}
          </div>
        );
      })}
    </div>
  );
}

function ProductGridBlock({ block, skin }: BlockComponentProps) {
  const content = partContent(skin, block.props?.partKey) as Record<string, unknown> | null;
  const title =
    (typeof block.props?.title === 'string' && block.props.title) ||
    (typeof content?.title === 'string' && content.title) ||
    `Collection: ${String(block.props?.collection ?? 'hot')}`;
  const limit = Number(block.props?.limit ?? 8);
  const items = asItems(block.props?.items ?? content?.items).slice(
    0,
    Number.isFinite(limit) ? limit : 8,
  );

  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">No products</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {items.map((item, index) => (
            <div
              key={String(item.sku ?? index)}
              className="rounded-lg border border-slate-200 bg-white p-3 text-sm"
            >
              <div className="font-medium text-slate-900">{String(item.name ?? 'Product')}</div>
              <div className="mt-1 text-[var(--color-primary,#0F766E)]">
                {String(item.price ?? '')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryNavBlock({ block, skin }: BlockComponentProps) {
  const content = partContent(skin, block.props?.partKey) as Record<string, unknown> | null;
  const items = asItems(block.props?.items ?? content?.items);

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, index) => (
        <span
          key={index}
          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700"
        >
          {String(item.label ?? item.name ?? 'Category')}
        </span>
      ))}
    </div>
  );
}

function ArticleDetailBlock({ block }: BlockComponentProps) {
  const article =
    block.props?.article && typeof block.props.article === 'object'
      ? (block.props.article as Record<string, unknown>)
      : null;

  if (!article) {
    return (
      <div className="rounded bg-slate-100 px-4 py-8 text-center text-sm text-slate-500">
        文章不存在或未发布
      </div>
    );
  }

  return (
    <article className="space-y-3 rounded-lg border border-slate-200 bg-white px-5 py-6">
      <h2 className="text-xl font-semibold text-slate-900">{String(article.title ?? '')}</h2>
      {article.category ? (
        <p className="text-xs uppercase tracking-wide text-slate-500">{String(article.category)}</p>
      ) : null}
      <div className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
        {String(article.content ?? '')}
      </div>
    </article>
  );
}

function FaqListBlock({ block }: BlockComponentProps) {
  const title = typeof block.props?.title === 'string' ? block.props.title : '常见问题';
  const items = asItems(block.props?.items);

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

export const webBlockRegistry: BlockRegistry = {
  'shell.nav-bar': NavBarBlock,
  'shell.announcement': AnnouncementBlock,
  'shell.link-row': LinkRowBlock,
  'shell.fab': FabBlock,
  'content.rich-text': RichTextBlock,
  'shell.unknown-block': UnknownBlock,
  'mall.banner-carousel': BannerCarouselBlock,
  'mall.product-grid': ProductGridBlock,
  'mall.category-nav': CategoryNavBlock,
  'mall.article-list': ArticleListBlock,
  'mall.article-detail': ArticleDetailBlock,
  'mall.faq-list': FaqListBlock,
  'mall.faq-search': FaqSearchBlock,
};
