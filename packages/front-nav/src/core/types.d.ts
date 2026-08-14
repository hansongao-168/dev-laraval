/**
 * Mirrors Gz168\FrontNav\Contracts\NavItem (server-side).
 *
 * Keep this file in lock-step with gz168/FrontNav/src/Contracts/NavItem.php.
 * Any new wire-stable field on the PHP side needs to be added here too.
 */
export interface NavItem {
  key: string;
  /** Source-language label; always returned, used as fallback when labelKey resolution fails. */
  label: string;
  /** Optional i18n key consumed by the renderer. When present, renderer should resolve via its catalog. */
  labelKey: string | null;
  /** Optional whitelist of locales this item ships translations for. null ⇒ locale-agnostic. */
  i18nLocales: string[] | null;
  location: NavLocation;
  url: string;
  icon: string | null;
  sort: number | null;
  parent: string | null;
  requiresAuth: boolean;
  permission: string | null;
  enabled: boolean;
  meta: Record<string, unknown>;
  children: NavItem[];
}

export type NavLocation = 'header' | 'sidebar' | 'footer' | 'mobile';

export interface NavResponseMeta {
  location: NavLocation;
  /** Echo of the request locale (or null when the request didn't pass one). */
  locale: string | null;
  authed: boolean;
}

export interface NavResponse {
  data: NavItem[];
  meta: NavResponseMeta;
}
