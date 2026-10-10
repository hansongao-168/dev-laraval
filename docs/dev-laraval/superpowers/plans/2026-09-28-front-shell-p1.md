# FrontShell P1 Implementation Plan

> **For agentic workers:** Implement task-by-task. Spec: `docs/dev-laraval/superpowers/specs/2026-09-23-front-experience-architecture-design.md` §P1.

**Goal:** Ship `gz168/front-shell` with Contracts, in-memory registries, builtin `storefront.main`, Capability registry, and read-only APIs.

**Architecture:** Mirror FrontNav: Spatie PackageServiceProvider, config gate, Registrars flush into InMemory registries, thin HTTP controllers.

**Tech Stack:** PHP 8.5 / Laravel 13 / PHPUnit 12 / gz168/common / Spatie package-tools.

## Global Constraints

- No Filament / Admin.
- FrontShell must not `use` business module namespaces.
- Read-only APIs only under `/api/v1/front-shell/*`.

## Tasks

- [x] Scaffold `gz168/FrontShell` (composer, module.json, config, provider, phpunit)
- [x] Contracts + DTOs + InMemory Shell/BlockType/Capability registries
- [x] Builtin `storefront.main` + core block types
- [x] GET shells + block-types (+ capabilities list optional)
- [x] Host composer path + require + discover
- [x] Unit/feature tests green; pint

## Follow-on (delivered in same session)

- [x] P2 FrontTemplate YAML skins + resolveSkin + copy CLI
- [x] P2.1 Theme + schedule.yaml
- [x] P2.2 Contrib scan + CallRouter (+ UserManagement sample)
- [x] P3 FrontPage pages YAML + GET API
- [x] P4 apps/web `/dev/front-studio` (dev-only preview + Download JSON)
- [x] P5 `@erp/front-experience` + web/miniapp/mobile blockRegistry + PageRenderer
- [x] P6 Mall blocks (`banner-carousel` / `product-grid` / `category-nav`) + holiday skin polish
- [x] P7 production preview gate + YAML call/`{{ path }}` enrich + `@erp/front-schema`
- [x] P8 `mall.catalog.collection` capability + front-schema contract tests
- [x] P9 Studio PUT writeback (dev-only) + `mall.banners.home`
- [x] P10 Studio slot editor (add/reorder/remove) + document helpers
- [x] P11 Studio HTML5 drag-and-drop across slots
- [x] P12 Studio block props editor + updateBlockProps
- [x] P13 Studio call editor + updateBlockCall + fetchCapabilities
- [x] P14 `@erp/front-schema` validate engine + writeback schema gate
- [x] P15 MallContent ops banners (`BannerLookupContract`) + YAML fallback
- [x] P16 three-end banner carousel `imageUrl` + `href`
- [x] P17 MallContent Filament `MallBannerResource` (ops, outside FE)
- [x] P18 MallArticle/MallFaq resources + Banner MallMedia upload
- [x] P19 front article/FAQ blocks + MallContentPermissionSeeder
- [x] P20 article detail + FAQ search + Studio defaultCall presets
- [x] P21 three-end help/article routes + client FAQ search
- [x] P22 FAQ debounce + article pagination + help/article SEO
- [x] P23 help/article share cards (OG + Web Share + miniapp/mobile)
- [x] P24 infinite scroll + meta.seo.image
- [x] P25 theme pageOverlays (prepend/append per slug.slot)
- [x] P26 share SVGs + Studio overlay badges / strip on writeback
- [x] P27 Studio theme pageOverlays writeback + editor
- [x] P28 structured theme pageOverlays form (+ JSON advanced mode)
- [x] P29 overlay DnD reorder + PNG share cards
- [x] P30 overlay groups by slug/slot in Studio form
- [x] P31 Add here per overlay group
- [x] P32 locale seo.images + Studio empty-group placeholders
- [x] P33 user/Accept-Language locale for share images + customizable placeholders
- [x] P34 home OG metadata + theme YAML overlayPlaceholders writeback
- [x] P35 miniapp/mobile seo.images + Studio placeholder conflict prompt
- [x] P36 ShareButton locale image + remembered placeholder conflict choice
- [x] P37 Web Share Level 2 files + Studio Forget choice
- [x] P38 share toast + placeholder conflict choices export/import
- [x] P39 dismissible share toast + Studio placeholder bundle export/import
- [x] P40 bundle pageOverlays draft + configurable share toast dwell
- [x] P41 bundle themeCode mismatch prompt + Studio toast dwell preview
- [x] P42 deferred Apply last import overlays + NEXT_PUBLIC_SHARE_TOAST_DWELL_MS in .env.example
- [x] P43 deferred Merge last import + Studio share preview locale switch
- [x] P44 share preview page slug + deferred overlays age/stale hint
- [x] P45 prune stale deferred overlays on load + share image thumbnail
- [x] P46 bundle import drop zone + share preview broken-image fallback
- [x] P47 paste JSON import + copy share preview image URL
- [x] P48 copy export bundle JSON + open share preview image tab
- [x] P49 import validation summary + download share preview image



