import type { FetchLike, ResolvedPage, SkinManifest, ThemeInfo, BlockTypeInfo, CapabilityInfo } from './types.d.ts';

export function fetchPage(
  http: FetchLike,
  options: {
    slug: string;
    channel?: string;
    at?: string;
    theme?: string;
    skin?: string;
    id?: string | number;
    q?: string;
    page?: string | number;
    query?: Record<string, string | number | undefined | null>;
    signal?: AbortSignal;
  },
): Promise<ResolvedPage>;

export function fetchSkin(http: FetchLike, code: string, signal?: AbortSignal): Promise<SkinManifest>;

export function fetchActiveTheme(
  http: FetchLike,
  options?: { at?: string; channel?: string; signal?: AbortSignal },
): Promise<ThemeInfo | null>;

export function fetchBlockTypes(
  http: FetchLike,
  options?: { channel?: string; signal?: AbortSignal },
): Promise<BlockTypeInfo[]>;

export function fetchShells(http: FetchLike, signal?: AbortSignal): Promise<unknown[]>;

export function fetchCapabilities(
  http: FetchLike,
  signal?: AbortSignal,
): Promise<CapabilityInfo[]>;
