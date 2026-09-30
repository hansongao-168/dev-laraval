'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_SHARE_TOAST_DWELL_MS,
  composeShareText,
  normalizeShareToastDwellMs,
  shareStatusMessage,
  shareWithOptionalImageFile,
} from '@/lib/front-experience/share-payload.mjs';

export function ShareButton({
  title,
  text,
  url,
  image,
  toastDwellMs,
}: {
  title: string;
  text?: string;
  url?: string;
  /** Absolute or site-relative share card image (locale-resolved). */
  image?: string;
  /** Auto-dismiss delay in ms; 0 keeps toast until closed. */
  toastDwellMs?: number;
}) {
  const [status, setStatus] = useState<'idle' | 'shared' | 'copied' | 'error'>('idle');
  const [sharedFile, setSharedFile] = useState(false);

  const dwellMs = useMemo(() => {
    const fromEnv =
      typeof process !== 'undefined'
        ? process.env.NEXT_PUBLIC_SHARE_TOAST_DWELL_MS
        : undefined;
    return normalizeShareToastDwellMs(
      toastDwellMs ?? fromEnv,
      DEFAULT_SHARE_TOAST_DWELL_MS,
    );
  }, [toastDwellMs]);

  function dismissToast() {
    setStatus('idle');
    setSharedFile(false);
  }

  useEffect(() => {
    if (status === 'idle' || dwellMs === 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      dismissToast();
    }, dwellMs);

    return () => window.clearTimeout(timer);
  }, [status, dwellMs]);

  async function onShare() {
    const shareUrl = url ?? (typeof window !== 'undefined' ? window.location.href : '');
    const body = text ?? title;
    const withImage = composeShareText(body, image);
    const payload: ShareData = {
      title,
      text: withImage,
      url: shareUrl,
    };

    try {
      const result = await shareWithOptionalImageFile(payload, image);
      if (result === 'shared-file' || result === 'shared-link') {
        setSharedFile(result === 'shared-file');
        setStatus('shared');
        return;
      }

      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        const clipboard = [title, withImage, shareUrl].filter(Boolean).join('\n');
        await navigator.clipboard.writeText(clipboard);
        setStatus('copied');
        return;
      }

      setSharedFile(false);
      setStatus('error');
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        dismissToast();
        return;
      }
      setSharedFile(false);
      setStatus('error');
    }
  }

  const toast = shareStatusMessage(status, { sharedFile });
  const label =
    status === 'shared'
      ? '已分享'
      : status === 'copied'
        ? '已复制'
        : status === 'error'
          ? '分享失败'
          : '分享';

  return (
    <span className="relative inline-flex items-center gap-2">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          width={40}
          height={21}
          className="h-[21px] w-10 rounded border border-slate-200 object-cover"
        />
      ) : null}
      <button
        type="button"
        onClick={() => {
          void onShare();
        }}
        className={`rounded border px-3 py-1.5 text-sm hover:bg-slate-50 ${
          status === 'error'
            ? 'border-rose-300 text-rose-700'
            : status === 'copied' || status === 'shared'
              ? 'border-teal-300 text-teal-800'
              : 'border-slate-300 text-slate-700'
        }`}
      >
        {label}
      </button>
      {toast ? (
        <span
          role="status"
          aria-live="polite"
          className={`absolute left-0 top-full z-10 mt-1 flex max-w-xs items-start gap-2 rounded border px-2 py-1 text-[11px] shadow-sm ${
            status === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-800'
              : 'border-teal-200 bg-teal-50 text-teal-900'
          }`}
        >
          <span className="min-w-0 flex-1">{toast}</span>
          <button
            type="button"
            aria-label="关闭提示"
            className="shrink-0 rounded px-1 text-[12px] leading-none opacity-70 hover:bg-black/5 hover:opacity-100"
            onClick={dismissToast}
          >
            ×
          </button>
        </span>
      ) : null}
    </span>
  );
}
