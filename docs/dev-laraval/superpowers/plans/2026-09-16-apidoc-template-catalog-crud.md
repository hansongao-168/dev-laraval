# ApiDoc Template Catalog CRUD + Part HTML/CSS Implementation Plan

> **Status:** Shipped — plan steps completed; ApiDoc PHPUnit suite green.
>
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Persist ApiDoc front skins in `api_doc_templates` (Filament CRUD, soft-delete invariant), resolve skins from DB, and allow editing frozen Blade-part HTML plus CSS with sanitization, file fallback, and an admin sample-data preview.

**Architecture:** New Eloquent model is the runtime catalog. `ApiDocTemplateResolver` reads active rows. `ApiDocHtmlSanitizer` runs on save/import. `ApiDocTemplateViewResolver` renders `Blade::render` for non-empty `body_parts` keys, otherwise `view($prefix.relative)`. Layout inlines `css_text` when set, else the package CSS file. Display-mode `template_key` Select uses resolver `options()`.

**Tech Stack:** Laravel 13, PHP 8.5, Filament 5, Livewire 4, PHPUnit 12, module `gz168/ApiDoc`.

**Spec:** `docs/dev-laraval/superpowers/specs/2026-09-16-apidoc-template-catalog-crud-design.md`

## Global Constraints

- Frozen `body_parts` keys only: `page`, `layout`, `header`, `nav`, `intro_section`, `api_section`, `carriers_section`, `decisions_section`, `note`, `panel`, `param_table`, `ret_table`.
- Empty part / empty `css_text` falls back to files under `views_prefix` (`classic` → `gz168-api-doc::front`).
- Soft-delete any skin including `classic`, but always keep ≥1 row with `deleted_at` null and `is_active` true.
- `code` is `[a-z0-9-]+` and immutable after create.
- `views_prefix`: `classic` → `gz168-api-doc::front`; else `gz168-api-doc::front-{code}`.
- Skin-key fallback: smallest `sort`, then `id`, among active non-deleted rows.
- Sanitize on save and import: strip `script`/`iframe`/`object`/`embed` and `on*` attributes; CSS drop `expression(` and `javascript:` (case-insensitive). No JS source field.
- Preview uses unsaved draft + **fixed sample payload**, not live `/api-doc`.
- Permissions: `api-doc.view` / `api-doc.update`. Never expose `.env` secrets; do not weaken protected admin.
- After PHP edits: `vendor/bin/pint --dirty --format agent`.
- Module commits in `gz168/`; tests in parent `tests/`; docs in `docs/` submodule.

## File map

| File | Responsibility |
| --- | --- |
| `gz168/ApiDoc/database/migrations/2026_09_16_000013_create_api_doc_templates_table.php` | Schema |
| `gz168/ApiDoc/src/Models/ApiDocTemplate.php` | SoftDeletes, prefix generation, active invariant, sanitize on save |
| `gz168/ApiDoc/database/factories/ApiDocTemplateFactory.php` | Factory |
| `gz168/ApiDoc/database/seeders/ApiDocTemplateSeeder.php` | Upsert classic |
| `gz168/ApiDoc/src/Support/ApiDocTemplateParts.php` | Frozen key → relative Blade path map |
| `gz168/ApiDoc/src/Services/ApiDocHtmlSanitizer.php` | HTML + CSS sanitizer |
| `gz168/ApiDoc/src/Services/ApiDocTemplateResolver.php` | Rewrite: DB source |
| `gz168/ApiDoc/src/Services/ApiDocResolvedTemplate.php` | Add bodyParts, cssText, fallbackCssPath |
| `gz168/ApiDoc/src/Services/ApiDocTemplateViewResolver.php` | Part vs file render |
| `gz168/ApiDoc/src/Support/api_doc_helper.php` | `api_doc_part()` helper for Blade |
| `gz168/ApiDoc/resources/views/front/resolved-page.blade.php` | Livewire page wrapper |
| `gz168/ApiDoc/resources/views/front/resolved-layout.blade.php` | Livewire layout wrapper |
| `gz168/ApiDoc/src/Livewire/ApiDocPage.php` | Use resolved-page / resolved-layout |
| `gz168/ApiDoc/src/Filament/Resources/ApiDocTemplateResource.php` | CRUD + part tabs + preview |
| `gz168/ApiDoc/src/Filament/Resources/ApiDocDisplayModeResource.php` | Select already uses resolver; tighten active-only |
| `gz168/ApiDoc/src/Console/Commands/SeedFromHtmlCommand.php` | Run template seeder |
| `gz168/ApiDoc/src/Services/ApiDocExporter.php` / `ApiDocImporter.php` | `templates` key |
| Tests under `tests/Unit/ApiDoc` and `tests/Feature/ApiDoc` | |

**Part → view relative path** (used by ViewResolver):

```
page => api-doc-page
layout => layout
header => components.header
nav => components.nav
intro_section => components.intro-section
api_section => components.api-section
carriers_section => components.carriers-section
decisions_section => components.decisions-section
note => components.note
panel => components.panel
param_table => components.param-table
ret_table => components.ret-table
```

---

### Task 1: Table, model, factory, seeder

**Files:**
- Create: `gz168/ApiDoc/database/migrations/2026_09_16_000013_create_api_doc_templates_table.php`
- Create: `gz168/ApiDoc/src/Models/ApiDocTemplate.php`
- Create: `gz168/ApiDoc/database/factories/ApiDocTemplateFactory.php`
- Create: `gz168/ApiDoc/database/seeders/ApiDocTemplateSeeder.php`
- Create: `gz168/ApiDoc/src/Support/ApiDocTemplateParts.php`
- Modify: `gz168/ApiDoc/src/Console/Commands/SeedFromHtmlCommand.php` (call template seeder alongside display modes)
- Test: `tests/Feature/ApiDoc/ApiDocTemplateCatalogTest.php`

**Interfaces:**
- Produces: `ApiDocTemplate` with `SoftDeletes`; `ApiDocTemplate::prefixForCode(string $code): string`; `ApiDocTemplateParts::KEYS` list and `relativePath(string $key): string`
- Model fillable: `code,label,views_prefix,is_active,sort,body_parts,css_text`
- Casts: `is_active:bool`, `sort:int`, `body_parts:array`

- [x] **Step 1: Write failing feature tests**

```php
<?php

declare(strict_types=1);

namespace Tests\Feature\ApiDoc;

use Gz168\ApiDoc\Database\Seeders\ApiDocTemplateSeeder;
use Gz168\ApiDoc\Models\ApiDocTemplate;
use Gz168\ApiDoc\Support\ApiDocTemplateParts;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use RuntimeException;
use Tests\TestCase;

class ApiDocTemplateCatalogTest extends TestCase
{
    use LazilyRefreshDatabase;

    #[Test]
    public function seeder_upserts_classic_with_file_fallback_prefix(): void
    {
        $this->seed(ApiDocTemplateSeeder::class);

        $row = ApiDocTemplate::query()->where('code', 'classic')->firstOrFail();
        $this->assertSame('经典', $row->label);
        $this->assertSame('gz168-api-doc::front', $row->views_prefix);
        $this->assertTrue($row->is_active);
        $this->assertSame([], $row->body_parts);
        $this->assertNull($row->css_text);
        $this->assertCount(12, ApiDocTemplateParts::KEYS);
    }

    #[Test]
    public function cannot_deactivate_last_active_template(): void
    {
        $this->seed(ApiDocTemplateSeeder::class);
        $classic = ApiDocTemplate::query()->where('code', 'classic')->firstOrFail();

        $this->expectException(RuntimeException::class);
        $classic->is_active = false;
        $classic->save();
    }
}
```

- [x] **Step 2: Run — expect fail**

```bash
php artisan test --compact tests/Feature/ApiDoc/ApiDocTemplateCatalogTest.php
```

- [x] **Step 3: Migration + Parts + Model + Factory + Seeder**

Migration:

```php
Schema::create('api_doc_templates', function (Blueprint $table): void {
    $table->id();
    $table->string('code', 64)->unique();
    $table->string('label', 120);
    $table->string('views_prefix', 120);
    $table->boolean('is_active')->default(true);
    $table->integer('sort')->default(0);
    $table->json('body_parts')->nullable();
    $table->mediumText('css_text')->nullable();
    $table->softDeletes();
    $table->timestamps();
});
```

`ApiDocTemplateParts::KEYS` = the 12 keys from the spec; `relativePath` throws on unknown key.

On `saving`: if `code` dirty on existing record, throw; else set `views_prefix` via `prefixForCode`; normalize `body_parts` to only known keys with string values; empty string keys omitted. After save/delete, `assertActiveInvariant()` counting `withoutTrashed()->where('is_active', true)`.

`prefixForCode`: `classic` → `gz168-api-doc::front`; else `'gz168-api-doc::front-'.$code`.

Code regex: `/^[a-z0-9-]+$/`.

Seeder `updateOrCreate(['code' => 'classic'], [...])`.

Factory: unique slug code, `is_active` true, `sort` 100, empty body_parts.

- [x] **Step 4: Wire seeder into `SeedFromHtmlCommand`** after display modes.

- [x] **Step 5: Run tests + pint + commit**

```bash
php artisan test --compact tests/Feature/ApiDoc/ApiDocTemplateCatalogTest.php
vendor/bin/pint --dirty --format agent
```

gz168: `feat(api-doc): add api_doc_templates table and classic seeder`  
parent: `test(api-doc): cover template catalog seeder and invariant`

---

### Task 2: ApiDocHtmlSanitizer

**Files:**
- Create: `gz168/ApiDoc/src/Services/ApiDocHtmlSanitizer.php`
- Test: `tests/Unit/ApiDoc/ApiDocHtmlSanitizerTest.php`

**Interfaces:**
- Produces:
  - `sanitizeHtml(string $html): string`
  - `sanitizeCss(string $css): string`
  - `sanitizeBodyParts(array $parts): array` (drop unknown keys; sanitize each string)

Implementation notes: use `DOMDocument` with `LIBXML_NOERROR` for HTML fragment wrap in `<div>`; remove listed tags; iterate attributes and remove names starting with `on` (case-insensitive). CSS: split on `}` optional; simplest: `preg_replace` to remove declarations whose value matches `/expression\s*\(|javascript\s*:/i` or drop entire rule; also replace those substrings globally.

- [x] **Step 1: Failing unit tests** — script tag gone; `onerror=` gone; `a href` kept; CSS `expression(alert(1))` gone; `color:red` kept.

- [x] **Step 2: Run fail → implement → pass → pint → commit**

gz168: `feat(api-doc): sanitize template HTML and CSS on write`  
parent: `test(api-doc): cover ApiDocHtmlSanitizer`

Call sanitizer from `ApiDocTemplate::saving` in this task once tests exist (keep model hook here so later Filament cannot skip it).

---

### Task 3: Resolver reads DB

**Files:**
- Modify: `gz168/ApiDoc/src/Services/ApiDocTemplateResolver.php`
- Modify: `gz168/ApiDoc/src/Services/ApiDocResolvedTemplate.php`
- Modify: `tests/Unit/ApiDoc/ApiDocTemplateResolverTest.php`
- Modify: `gz168/ApiDoc/src/Models/ApiDocDisplayMode.php` — `isRegistered` stays “not trashed”; add `isSelectable` = active + not trashed; DisplayMode saving requires `isSelectable` when key non-null.

**Interfaces:**
- `resolve(?string $templateKey, ?string $contextModeCode = null): ApiDocResolvedTemplate`
- `options(): array<string,string>` active + not trashed
- `isRegistered(string $key): bool` not trashed
- `isSelectable(string $key): bool` active + not trashed
- `assertActiveInvariant(): void`
- `fallbackRow(): ApiDocTemplate` — min sort, min id, active, not trashed; if none, run `ApiDocTemplateSeeder` then retry (mirror display-mode resolver)
- `ApiDocResolvedTemplate` add: `array $bodyParts`, `?string $cssText`

If catalog empty after seeder, throw `RuntimeException` with message `At least one active ApiDoc template is required.`

Update unit tests: `LazilyRefreshDatabase` + seed `ApiDocTemplateSeeder`. Replace `missing_default_in_catalog_fails_fast` with `resolve_falls_back_to_lowest_sort_active_row` (create extra active row with sort 0, deactivate classic’s use for fallback by pointing unknown key — fallback is lowest sort among active, not necessarily classic).

- [x] **Step 1: Rewrite tests (they will fail until resolver changes).**
- [x] **Step 2: Implement resolver.**
- [x] **Step 3: Run `tests/Unit/ApiDoc/ApiDocTemplateResolverTest.php` and existing display-mode template_key tests.**
- [x] **Step 4: pint + commit**

gz168: `feat(api-doc): resolve front skins from api_doc_templates`  
parent: `test(api-doc): template resolver reads database`

---

### Task 4: ViewResolver + front wrappers

**Files:**
- Create: `gz168/ApiDoc/src/Services/ApiDocTemplateViewResolver.php`
- Create: `gz168/ApiDoc/resources/views/front/resolved-page.blade.php`
- Create: `gz168/ApiDoc/resources/views/front/resolved-layout.blade.php`
- Modify: `gz168/ApiDoc/src/Livewire/ApiDocPage.php` — always `view('gz168-api-doc::front.resolved-page')->layout('gz168-api-doc::front.resolved-layout', ...)` and pass `$skin`
- Modify: `gz168/ApiDoc/src/Support/api_doc_helper.php` — `api_doc_part(string $part, array $data = []): string`
- Modify front includes in `api-doc-page.blade.php` and nested components to use `api_doc_part` **or** keep file includes for file-mode and only wrap page/layout (spec requires all 12 keys overridable). Nested `@include` inside **file** Blade still hits files; DB `page` override must `@include` via helper so child overrides apply.

**Chosen approach:** helper `api_doc_part($part, $data)` reads `app('api-doc.skin')` (`ApiDocResolvedTemplate` bound in `ApiDocPage::render` before view). ViewResolver:

```php
public function render(ApiDocResolvedTemplate $skin, string $part, array $data): string
{
    $html = trim((string) ($skin->bodyParts[$part] ?? ''));
    if ($html !== '') {
        return Blade::render($html, $data);
    }
    $name = $skin->view(ApiDocTemplateParts::relativePath($part));
    if (! view()->exists($name)) {
        throw new RuntimeException("ApiDoc template [{$skin->key}] part [{$part}] views are missing.");
    }
    return view($name, $data)->render();
}
```

`resolved-page.blade.php`: `{!! app(ApiDocTemplateViewResolver::class)->render($template, 'page', get_defined_vars()) !!}` — be careful with `$__data`; pass explicit compact list matching current page: `data,settings,mode,modes,lang,ui,nav,template`.

`resolved-layout.blade.php`: if `trim((string)$template->cssText) !== ''` wrap `{!! $template->cssText !!}` in `<style>` plus brand `:root` block; else keep `file_get_contents` CSS. Then render layout part the same way (`layout` part gets `$slot`, `$title`, `$description`, `$settings`, `$lang`, `$template`). If layout part is file-based, existing `layout.blade.php` already inlines CSS — **when using file layout, do not double-inject CSS in wrapper**. Rule:

- If `body_parts['layout']` non-empty: wrapper outputs doctype/html **only if the part is a fragment**. Spec says layout maps to full `layout.blade.php`. DB layout string is a **full document**. Then `resolved-layout` should **only** `Blade::render` that string (and the part should include CSS). Simpler rule for implementers:
  - **Always** use `resolved-layout` as Filament/Livewire layout view.
  - ViewResolver `renderLayout($skin, $data)`: if layout part non-empty, `Blade::render` it (operator’s HTML is the whole layout; they can `{!! $css !!}` — pass `'inline_css' => $skin->cssText ?: file_get_contents(...)`).
  - If layout part empty, `view($skin->view('layout'), $data)` **and** if `cssText` set, pass `'inline_css'` and **change file layout** to:

```blade
<style>
{!! $inline_css ?? file_get_contents(...) !!}
</style>
```

Modify `layout.blade.php` to use `$inline_css ?? file_get_contents(...)`.

Replace `@include('gz168-api-doc::front.components.header', …)` with `{!! api_doc_part('header', [...]) !!}` in `api-doc-page.blade.php` and in `api-section`/`intro-section` for note/panel/tables. Same for nav, sections, etc.

**Tests:** `tests/Feature/ApiDoc/ApiDocTemplateRenderTest.php`

```php
#[Test]
public function non_empty_header_part_overrides_file(): void
{
    $this->seed(ApiDocTemplateSeeder::class);
    $this->seed(ApiDocDisplayModeSeeder::class);
    ApiDocSetting::current();
    ApiDocSection::factory()->create(['slug' => 'intro', 'is_intro' => true]);
    ApiDocTemplate::query()->where('code', 'classic')->update([
        'body_parts' => ['header' => '<div class="langs">OVERRIDE-HEADER</div>'],
    ]);
    $this->get('/api-doc')->assertOk()->assertSee('OVERRIDE-HEADER', false);
}

#[Test]
public function empty_parts_keep_classic_markup(): void
{
    $this->seed(ApiDocTemplateSeeder::class);
    $this->seed(ApiDocDisplayModeSeeder::class);
    ApiDocSetting::current();
    ApiDocSection::factory()->create(['slug' => 'intro', 'is_intro' => true]);
    $this->get('/api-doc')->assertOk()->assertSee('class="wrap"', false);
}
```

- [x] **Step 1: Failing render tests**
- [x] **Step 2: Implement ViewResolver, helper, wrappers, includes, layout css hook, ApiDocPage**
- [x] **Step 3: Run render tests + `ApiDocFrontPageTest` + `ApiDocFrontTemplateTest`**
- [x] **Step 4: pint + commit**

gz168: `feat(api-doc): render template parts from DB with file fallback`  
parent: `test(api-doc): header part override and classic file fallback`

---

### Task 5: Filament Template Resource + preview

**Files:**
- Create: `gz168/ApiDoc/src/Filament/Resources/ApiDocTemplateResource.php`
- Create pages: `List/Create/Edit/View` under `.../ApiDocTemplateResource/Pages/`
- Create: `gz168/ApiDoc/src/Services/ApiDocTemplatePreviewRenderer.php` — sample payload + try/catch Blade errors
- Create: `gz168/ApiDoc/resources/views/filament/pages/template-preview.blade.php` (optional Livewire view on Edit page)
- Test: `tests/Feature/ApiDoc/ApiDocTemplateResourceTest.php`

**Interfaces:**
- Navigation: group `API 文档`, label `前台模板`, sort `87` (before 显示方式 88)
- `ApiDocAuthorization` trait; `canAccess` = `canViewAny`
- Form create: code (required, regex, unique), label, sort, is_active; Placeholder views_prefix
- Form edit: code disabled, views_prefix placeholder; Tabs from `ApiDocTemplateParts::KEYS` as `body_parts.{key}` Textarea (10 rows) + Tab CSS `css_text`
- Table: code, label, views_prefix, sort, is_active
- SoftDeletes: `TrashedFilter`, RestoreAction
- After create/edit/delete: `app(ApiDocCacheManager::class)->flush()`

Preview on **Edit** page: Livewire method `previewHtml(): string` reading `$this->form->getState()`, building a transient `ApiDocResolvedTemplate` (do not persist), call `ApiDocTemplatePreviewRenderer::render($skin)` with fixed sample:

```php
[
  'lang' => 'fr',
  'mode' => 'fr',
  'modes' => collect([(object)['code'=>'fr','label'=>'法文']]),
  'title' => 'Preview',
  'description' => 'preview',
  'settings' => ApiDocSetting::current(),
  'ui' => ['copy' => 'Copy'],
  'nav' => [['id'=>'oauth','label'=>'OAuth']],
  'data' => [
    'sections' => [['is_intro'=>true,'slug'=>'intro','title'=>'Intro','intro_h1'=>'H1','paras'=>[],'notes'=>[],'quickstart'=>[]]],
    'carriers' => [],
    'decisions' => [],
    'settings' => ['show_decisions'=>false,'footer_left'=>'L','footer_right'=>'R'],
    'quickstart' => [],
    'nav' => [],
    'ui' => [],
  ],
]
```

Catch `Throwable` and return escaped message prefixed `PREVIEW_ERROR:`.

Filament tests: actingAs protected super admin (copy helper from `ApiDocDisplayModeTest`); create record; cannot deactivate last; edit page livewire contains `body_parts.header` field; save part with `<script>x</script><p>ok</p>` → DB has `ok` without script.

- [x] **Steps: fail tests → implement resource → pass → pint → commit**

gz168: `feat(api-doc): Filament front template resource with part editor`  
parent: `test(api-doc): Filament template CRUD, sanitizer, and preview`

---

### Task 6: Display mode Select uses selectable skins

**Files:**
- Modify: `gz168/ApiDoc/src/Filament/Resources/ApiDocDisplayModeResource.php` — `Rule::in(array_keys(options()))` already; ensure options = selectable only
- Modify: `ApiDocDisplayMode` saving to `isSelectable` not merely `isRegistered`
- Modify: `tests/Feature/ApiDoc/ApiDocDisplayModeTest.php` if needed

Importer currently uses `isRegistered` (allows disabled). Spec import: template_key must point at **not deleted** code. Keep importer on `isRegistered`. DisplayMode **form save** uses selectable.

- [x] **Step 1: Test cannot save template_key of inactive skin**
- [x] **Step 2: Implement**
- [x] **Step 3: pint + commit**

gz168: `fix(api-doc): display modes may only select active templates`  
parent: `test(api-doc): reject inactive template_key on display mode`

---

### Task 7: Snapshot templates key

**Files:**
- Modify: `gz168/ApiDoc/src/Services/ApiDocExporter.php`
- Modify: `gz168/ApiDoc/src/Services/ApiDocImporter.php`
- Test: `tests/Feature/ApiDoc/ApiDocSnapshotTemplatesTest.php`

Export `templates` with `withTrashed()`, order sort/code, fields: `code,label,views_prefix,is_active,sort,body_parts,css_text,deleted_at`.

Import **before** display_modes: if `templates` key present, sanitize parts/css, upsert by code including `deleted_at`. Then existing display_modes validation (`isRegistered` after import). After templates import, `assertActiveInvariant`. Unknown template_key still throws.

If payload has display_modes but no templates key, keep current behavior (keys must already exist in DB).

- [x] **TDD → implement → pint → commit**

gz168: `feat(api-doc): snapshot export/import api_doc_templates`  
parent: `test(api-doc): templates snapshot round-trip and sanitizing import`

---

### Task 8: Regression gate

```bash
php artisan test --compact tests/Unit/ApiDoc tests/Feature/ApiDoc
vendor/bin/pint --dirty --format agent
```

Bump parent `gz168` gitlink if needed. All ApiDoc tests must pass.

---

## Spec coverage

| Spec item | Task |
| --- | --- |
| Table + seeder classic | 1 |
| Active invariant | 1, 5 |
| Sanitizer | 2 |
| Resolver DB + fallback | 3 |
| Part vs file + css replace | 4 |
| Filament CRUD/tabs/preview | 5 |
| DisplayMode select | 6 |
| Snapshot templates | 7 |
| Front classic 200 | 4, 8 |
| No drag layout / no JS field | not scheduled |
