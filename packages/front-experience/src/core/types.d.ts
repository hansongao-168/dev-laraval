export type Channel = 'all' | 'web' | 'miniapp' | 'mobile';

export interface BlockInstance {
  id: string;
  type: string;
  props?: Record<string, unknown>;
  call?: {
    id?: string;
    module?: string;
    capability: string;
    args?: Record<string, unknown>;
    onError?: 'fail' | 'omit' | 'empty';
  };
}

export interface PageDocument {
  schemaVersion: number;
  page: {
    slug: string;
    channel: Channel | string;
    shellKey: string;
    defaultSkinCode?: string;
    themePolicy?: string;
    title?: Record<string, string>;
    [key: string]: unknown;
  };
  shell: {
    key: string;
    slots: Record<string, BlockInstance[]>;
  };
  meta?: Record<string, unknown>;
}

export interface SkinManifest {
  code: string;
  label?: unknown;
  tokens?: Record<string, string>;
  parts?: Record<string, { source: string; value: unknown }>;
  css?: { source: string; text: string | null };
  js?: { source: string; text: string | null };
  compatibleShellKeys?: string[];
}

export interface ThemeInfo {
  code: string;
  label?: unknown;
  skinCode: string;
}

export interface ResolvedPage {
  document: PageDocument;
  theme: ThemeInfo | null;
  skin: SkinManifest;
  resolvedAt: string;
}

export interface BlockTypeInfo {
  type: string;
  label: string;
  module?: string | null;
  defaultProps?: Record<string, unknown>;
  defaultCall?: BlockInstance['call'];
  propsSchema?: Record<string, unknown>;
  channels?: string[];
}

export interface CapabilityInfo {
  id: string;
  module: string;
  description?: string | null;
}

export interface FetchLike {
  request<T = unknown>(
    path: string,
    options?: {
      method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
      headers?: Record<string, string>;
      signal?: AbortSignal;
    },
  ): Promise<{ ok: boolean; status: number; data: T }>;
}

export type BlockComponentProps = {
  block: BlockInstance;
  skin: SkinManifest;
  channel: string;
};

export type BlockComponent = (props: BlockComponentProps) => unknown;

export type BlockRegistry = Record<string, BlockComponent>;
