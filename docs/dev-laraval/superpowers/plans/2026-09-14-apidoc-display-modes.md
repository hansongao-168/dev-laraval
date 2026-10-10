# ApiDoc Display Modes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate ApiDoc content entry (FR/ZH/EN tabs) from configurable front-end display modes (single or combined locales), with in-mode fallback and legacy `?lang=` compatibility.

**Architecture:** Persist display modes in `api_doc_display_modes`. Resolve visitor mode via `ApiDocDisplayModeResolver`. Render with `LocalizedString::{pick,format}ForMode` using the mode’s ordered `locales`. Filament gets an independent Display Mode resource; localized form fields switch to language Tabs. `template_key` is stored but unused.

**Tech Stack:** Laravel 13, PHP 8.5, Filament 5, Livewire 4, PHPUnit 12, module `gz168/ApiDoc`.

**Spec:** `docs/dev-laraval/superpowers/specs/2026-09-14-apidoc-display-modes-design.md`

## Global Constraints

- Content locales only: `fr` | `zh` | `en` (JSON `{fr,zh,en}`).
- Front display modes are DB rows; do not hardcode the switcher from `ApiDocDisplayMode` enum as sole source.
- Fallback only within the current mode’s `locales` list — never outside.
- Do not require all three languages to save content.
- Do not implement display templates; ignore `template_key` at runtime.
- Permissions: reuse `api-doc.view` / `api-doc.update`.
- Never expose `.env` secrets; keep protected admin invariants untouched.
- After PHP edits: `vendor/bin/pint --dirty --format agent`.
- Commits for `gz168/ApiDoc` go in the `gz168` submodule when that tree is dirty; docs commits go in the `docs` submodule.

## File map

| File | Responsibility |
| --- | --- |
| `gz168/ApiDoc/database/migrations/2026_09_14_000012_create_api_doc_display_modes_table.php` | Schema |
| `gz168/ApiDoc/src/Models/ApiDocDisplayMode.php` | Eloquent model |
| `gz168/ApiDoc/database/factories/ApiDocDisplayModeFactory.php` | Factory |
| `gz168/ApiDoc/database/seeders/ApiDocDisplayModeSeeder.php` | Seed 5 modes |
| `gz168/ApiDoc/src/Services/ApiDocDisplayModeResolver.php` | Resolve mode + legacy map + sync `default_locale` |
| `gz168/ApiDoc/src/Casts/LocalizedString.php` | `pickForMode` / `formatForMode` |
| `gz168/ApiDoc/src/Services/ApiDocContentRenderer.php` | Generalize multi-locale HTML对照 |
| `gz168/ApiDoc/src/Services/ApiDocRenderer.php` | Render by mode code + locales |
| `gz168/ApiDoc/src/Services/ApiDocCacheManager.php` | Flush seed mode keys |
| `gz168/ApiDoc/src/Livewire/ApiDocPage.php` | `mode` state + resolve |
| `gz168/ApiDoc/resources/views/front/components/header.blade.php` | Active modes from DB |
| `gz168/ApiDoc/src/Filament/Forms/Components/LocalizedKeyValue.php` | FR/ZH/EN Tabs (short text) |
| `gz168/ApiDoc/src/Filament/Forms/Components/LocalizedBodyFields.php` | FR/ZH/EN Tabs (body) |
| `gz168/ApiDoc/src/Filament/Resources/ApiDocDisplayModeResource.php` (+ Pages) | CRUD |
| `gz168/ApiDoc/src/Filament/Pages/ApiDocSettingsPage.php` | Drop misleading default-locale UI |
| `gz168/ApiDoc/src/Enums/ApiDocDisplayMode.php` | Keep as legacy alias helper or thin wrapper — prefer resolver; deprecate direct front use |
| `tests/Unit/ApiDoc/LocalizedStringFormatTest.php` | Unit coverage |
| `tests/Feature/ApiDoc/ApiDocDisplayModeTest.php` | Feature coverage |
| `tests/Feature/ApiDoc/ApiDocFrontPageTest.php` | Regression |

---

### Task 1: LocalizedString mode-aware pick/format

**Files:**
- Modify: `gz168/ApiDoc/src/Casts/LocalizedString.php`
- Modify: `tests/Unit/ApiDoc/LocalizedStringFormatTest.php`

**Interfaces:**
- Produces:
  - `LocalizedString::pickForMode(?array $value, array $locales): string`
  - `LocalizedString::formatForMode(?array $value, array $locales): string`
- Consumes: existing `normalize()`; `$locales` is `list<string>` of `fr|zh|en`, order = primary first

- [ ] **Step 1: Write failing unit tests**

Append to `tests/Unit/ApiDoc/LocalizedStringFormatTest.php`:

```php
#[Test]
public function pick_for_mode_falls_back_only_inside_mode_locales(): void
{
    $value = ['fr' => 'Bonjour', 'zh' => '', 'en' => 'Hello'];

    $this->assertSame('Hello', LocalizedString::pickForMode($value, ['zh', 'en']));
    $this->assertSame('', LocalizedString::pickForMode(['fr' => 'Bonjour', 'zh' => '', 'en' => ''], ['zh', 'en']));
}

#[Test]
public function format_for_mode_wraps_secondary_locales(): void
{
    $html = LocalizedString::formatForMode(
        ['fr' => 'Bonjour', 'zh' => '你好', 'en' => 'Hello'],
        ['fr', 'zh'],
    );

    $this->assertSame('Bonjour<span class="zh">你好</span>', $html);
}

#[Test]
public function format_for_mode_supports_three_locales(): void
{
    $html = LocalizedString::formatForMode(
        ['fr' => 'Bonjour', 'zh' => '你好', 'en' => 'Hello'],
        ['zh', 'en', 'fr'],
    );

    $this->assertSame('你好<span class="en">Hello</span><span class="fr">Bonjour</span>', $html);
}
```

- [ ] **Step 2: Run tests — expect fail**

```bash
php artisan test --compact tests/Unit/ApiDoc/LocalizedStringFormatTest.php --filter=pick_for_mode
```

Expected: FAIL (method undefined).

- [ ] **Step 3: Implement**

In `LocalizedString.php` add:

```php
/**
 * @param  array<string,string>|null  $value
 * @param  list<string>  $locales
 */
public static function pickForMode(?array $value, array $locales): string
{
    if ($value === null || $locales === []) {
        return '';
    }

    $allowed = [];
    foreach ($locales as $code) {
        if (in_array($code, ['fr', 'zh', 'en'], true) && ! in_array($code, $allowed, true)) {
            $allowed[] = $code;
        }
    }

    foreach ($allowed as $code) {
        $candidate = (string) ($value[$code] ?? '');
        if ($candidate !== '') {
            return $candidate;
        }
    }

    return '';
}

/**
 * @param  array<string,string>|null  $value
 * @param  list<string>  $locales
 */
public static function formatForMode(?array $value, array $locales): string
{
    $allowed = [];
    foreach ($locales as $code) {
        if (in_array($code, ['fr', 'zh', 'en'], true) && ! in_array($code, $allowed, true)) {
            $allowed[] = $code;
        }
    }

    if ($allowed === []) {
        return '';
    }

    if (count($allowed) === 1) {
        return e(self::pickForMode($value, $allowed));
    }

    $parts = [];
    foreach ($allowed as $index => $code) {
        $text = (string) ($value[$code] ?? '');
        if ($text === '') {
            continue;
        }
        $escaped = e($text);
        if ($parts === []) {
            $parts[] = $escaped;
            continue;
        }
        $parts[] = '<span class="'.e($code).'">'.$escaped.'</span>';
    }

    return implode('', $parts);
}
```

Keep existing `pick` / `format` / `formatCompact` working for old tests; optionally implement `both` via `formatForMode($value, ['fr','zh'])` when `$lang === 'both'`.

- [ ] **Step 4: Run unit file — expect pass**

```bash
php artisan test --compact tests/Unit/ApiDoc/LocalizedStringFormatTest.php
```

- [ ] **Step 5: Commit (gz168 submodule if applicable)**

```bash
cd /var/www/dev-laraval/gz168
git add ApiDoc/src/Casts/LocalizedString.php
cd /var/www/dev-laraval
git add tests/Unit/ApiDoc/LocalizedStringFormatTest.php gz168
git commit -m "feat(api-doc): add LocalizedString pick/format for display modes"
```

---

### Task 2: Display mode table, model, factory, seeder

**Files:**
- Create: `gz168/ApiDoc/database/migrations/2026_09_14_000012_create_api_doc_display_modes_table.php`
- Create: `gz168/ApiDoc/src/Models/ApiDocDisplayMode.php`
- Create: `gz168/ApiDoc/database/factories/ApiDocDisplayModeFactory.php`
- Create: `gz168/ApiDoc/database/seeders/ApiDocDisplayModeSeeder.php`
- Modify: app initialize / module seed path if ApiDoc seeds are registered (wire seeder into existing ApiDoc seed entry point used by `app:initialize` or document `php artisan db:seed --class=...`)

**Interfaces:**
- Produces model `Gz168\ApiDoc\Models\ApiDocDisplayMode` with casts: `locales:array`, `is_active:bool`, `is_default:bool`, `sort:int`
- Seed codes: `fr`, `zh`, `en`, `fr_zh`, `zh_en_fr` per spec

- [ ] **Step 1: Write failing feature smoke for seeder row count**

Create `tests/Feature/ApiDoc/ApiDocDisplayModeTest.php`:

```php
<?php

declare(strict_types=1);

namespace Tests\Feature\ApiDoc;

use Gz168\ApiDoc\Database\Seeders\ApiDocDisplayModeSeeder;
use Gz168\ApiDoc\Models\ApiDocDisplayMode;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ApiDocDisplayModeTest extends TestCase
{
    use LazilyRefreshDatabase;

    #[Test]
    public function seeder_inserts_five_modes_with_one_default(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);

        $this->assertSame(5, ApiDocDisplayMode::query()->count());
        $this->assertSame(1, ApiDocDisplayMode::query()->where('is_default', true)->count());
        $this->assertSame(['fr'], ApiDocDisplayMode::query()->where('code', 'fr')->value('locales'));
        $this->assertSame(['fr', 'zh'], ApiDocDisplayMode::query()->where('code', 'fr_zh')->value('locales'));
    }
}
```

Adjust seeder namespace to match package convention (if seeders live under `Gz168\ApiDoc\Database\Seeders`, mirror `ApiDocUiStringSeeder`).

- [ ] **Step 2: Run — expect fail (missing table/class)**

```bash
php artisan test --compact tests/Feature/ApiDoc/ApiDocDisplayModeTest.php --filter=seeder_inserts
```

- [ ] **Step 3: Migration**

```php
Schema::create('api_doc_display_modes', function (Blueprint $table): void {
    $table->id();
    $table->string('code', 64)->unique();
    $table->string('label', 120);
    $table->json('locales');
    $table->boolean('is_active')->default(true);
    $table->boolean('is_default')->default(false);
    $table->integer('sort')->default(0);
    $table->string('template_key', 64)->nullable();
    $table->timestamps();
});
```

- [ ] **Step 4: Model + factory + seeder**

Model fillable: `code`, `label`, `locales`, `is_active`, `is_default`, `sort`, `template_key`.

Seeder upsert by `code`:

| code | label | locales | is_default | sort |
| --- | --- | --- | --- | --- |
| fr | 法文 | [fr] | true | 10 |
| zh | 中文 | [zh] | false | 20 |
| en | 英文 | [en] | false | 30 |
| fr_zh | 中/法 | [fr, zh] | false | 40 |
| zh_en_fr | 中/英/法 | [zh, en, fr] | false | 50 |

- [ ] **Step 5: Run test — pass; migrate**

```bash
php artisan migrate --no-interaction
php artisan test --compact tests/Feature/ApiDoc/ApiDocDisplayModeTest.php --filter=seeder_inserts
```

- [ ] **Step 6: Commit**

```bash
git commit -m "feat(api-doc): add display modes table, model, and seeder"
```

---

### Task 3: ApiDocDisplayModeResolver

**Files:**
- Create: `gz168/ApiDoc/src/Services/ApiDocDisplayModeResolver.php`
- Modify: `tests/Feature/ApiDoc/ApiDocDisplayModeTest.php`

**Interfaces:**
- Produces:
  - `resolve(?string $mode, ?string $lang): ApiDocDisplayMode`
  - `activeOrdered(): Collection<int, ApiDocDisplayMode>`
  - `ensureInvariant(): void` (ensure ≥1 active and exactly one default among active when possible)
  - `syncSettingDefaultLocale(ApiDocDisplayMode $mode): void` → writes `locales[0]` to `ApiDocSetting.default_locale`
- Legacy map: `fr→fr`, `zh→zh`, `en→en`, `both→fr_zh`, empty/`default`→default row

- [ ] **Step 1: Failing tests**

```php
#[Test]
public function resolver_maps_legacy_lang_both_to_fr_zh(): void
{
    $this->seed(ApiDocDisplayModeSeeder::class);
    $mode = app(ApiDocDisplayModeResolver::class)->resolve(null, 'both');
    $this->assertSame('fr_zh', $mode->code);
}

#[Test]
public function resolver_prefers_mode_query_over_lang(): void
{
    $this->seed(ApiDocDisplayModeSeeder::class);
    $mode = app(ApiDocDisplayModeResolver::class)->resolve('en', 'zh');
    $this->assertSame('en', $mode->code);
}

#[Test]
public function resolver_falls_back_when_mode_inactive(): void
{
    $this->seed(ApiDocDisplayModeSeeder::class);
    ApiDocDisplayMode::query()->where('code', 'en')->update(['is_active' => false]);
    $mode = app(ApiDocDisplayModeResolver::class)->resolve('en', null);
    $this->assertTrue($mode->is_default);
}
```

- [ ] **Step 2: Run — fail**

```bash
php artisan test --compact tests/Feature/ApiDoc/ApiDocDisplayModeTest.php --filter=resolver_
```

- [ ] **Step 3: Implement resolver**

```php
final class ApiDocDisplayModeResolver
{
    /** @var array<string,string> */
    private const LEGACY_LANG = [
        'fr' => 'fr',
        'zh' => 'zh',
        'en' => 'en',
        'both' => 'fr_zh',
    ];

    public function resolve(?string $mode, ?string $lang): ApiDocDisplayMode
    {
        $code = $mode !== null && $mode !== '' ? $mode : null;
        if ($code === null && $lang !== null && $lang !== '' && $lang !== 'default') {
            $code = self::LEGACY_LANG[$lang] ?? null;
        }

        if ($code !== null) {
            $found = ApiDocDisplayMode::query()
                ->where('code', $code)
                ->where('is_active', true)
                ->first();
            if ($found) {
                return $found;
            }
        }

        return $this->defaultMode();
    }

    public function defaultMode(): ApiDocDisplayMode
    {
        $default = ApiDocDisplayMode::query()
            ->where('is_active', true)
            ->where('is_default', true)
            ->orderBy('sort')
            ->first();

        if ($default) {
            return $default;
        }

        $fallback = ApiDocDisplayMode::query()
            ->where('is_active', true)
            ->orderBy('sort')
            ->first();

        if ($fallback) {
            return $fallback;
        }

        // Last resort: ensure seeds exist then retry once
        app(ApiDocDisplayModeSeeder::class)->run();

        return ApiDocDisplayMode::query()->orderBy('sort')->firstOrFail();
    }

    public function activeOrdered()
    {
        return ApiDocDisplayMode::query()
            ->where('is_active', true)
            ->orderBy('sort')
            ->orderBy('id')
            ->get();
    }

    public function syncSettingDefaultLocale(ApiDocDisplayMode $mode): void
    {
        $primary = $mode->locales[0] ?? 'fr';
        if (! in_array($primary, ['fr', 'zh', 'en'], true)) {
            $primary = 'fr';
        }
        $settings = ApiDocSetting::current();
        $settings->default_locale = $primary;
        $settings->save();
    }
}
```

Register nothing special if resolved via `app()`.

- [ ] **Step 4: Tests pass + commit**

```bash
php artisan test --compact tests/Feature/ApiDoc/ApiDocDisplayModeTest.php --filter=resolver_
git commit -m "feat(api-doc): add display mode resolver with legacy lang map"
```

---

### Task 4: Renderer + cache keys use mode

**Files:**
- Modify: `gz168/ApiDoc/src/Services/ApiDocRenderer.php`
- Modify: `gz168/ApiDoc/src/Services/ApiDocContentRenderer.php` (extend `formatBothHtml` to N locales or add `formatModeHtml(array $htmlByLocale, array $locales)`)
- Modify: `gz168/ApiDoc/src/Services/ApiDocCacheManager.php`
- Modify: `tests/Feature/ApiDoc/ApiDocFrontPageTest.php`
- Modify: `tests/Unit/ApiDoc/ApiDocContentRendererTest.php` if present

**Interfaces:**
- Change `ApiDocRenderer::render(string $langOrMode, bool $html = false): array` to accept **mode code** (after Livewire resolves). Internally load mode locales.
- Cache key: `render:{code}` / `render:{code}:html` / `ui:{code}` …

- [ ] **Step 1: Update front test for `?mode=fr_zh` and keep `?lang=both`**

```php
#[Test]
public function mode_fr_zh_and_legacy_both_include_zh_spans(): void
{
    $this->seed(ApiDocDisplayModeSeeder::class);
    // ... section factory as existing both_locale test ...
    $this->get('/api-doc?mode=fr_zh')->assertOk()->assertSee('class="zh"', false);
    $this->get('/api-doc?lang=both')->assertOk()->assertSee('class="zh"', false);
}
```

- [ ] **Step 2: Run — may fail until renderer wired**

- [ ] **Step 3: Implement renderer path**

Pseudocode for localize helpers:

```php
protected function localize(?array $value, ApiDocDisplayMode $mode, bool $html): string
{
    return $html
        ? LocalizedString::formatForMode($value, $mode->locales)
        : LocalizedString::pickForMode($value, $mode->locales);
}
```

For bodies with content format: for each locale in `$mode->locales`, render HTML via `ApiDocContentRenderer::toHtml`, then join with spans (primary raw HTML + `<span class="xx">` secondaries). Escape policy: content renderer already produces safe HTML for markdown/html pipeline — do not double-escape body HTML; only use `formatForMode` for plain short strings.

- [ ] **Step 4: CacheManager flush list**

Replace hardcoded `fr|zh|en|both` with at least seed codes plus keep old keys for one release:

```php
foreach ([
    'fr', 'zh', 'en', 'both', 'fr_zh', 'zh_en_fr', 'default',
] as $code) {
    $this->forget('render:'.$code);
    $this->forget('render:'.$code.':html');
    $this->forget('ui:'.$code);
    $this->forget('ui:'.$code.':html');
}
$this->forget('settings');
```

Prefer tagged flush when available (already present).

- [ ] **Step 5: Tests pass + commit**

```bash
php artisan test --compact tests/Feature/ApiDoc/ApiDocFrontPageTest.php tests/Unit/ApiDoc/
git commit -m "feat(api-doc): render front payload by display mode locales"
```

---

### Task 5: Livewire page + header switcher

**Files:**
- Modify: `gz168/ApiDoc/src/Livewire/ApiDocPage.php`
- Modify: `gz168/ApiDoc/resources/views/front/components/header.blade.php`
- Modify: `gz168/ApiDoc/resources/views/front/api-doc-page.blade.php` if it passes `$lang`
- Modify: `tests/Feature/ApiDoc/ApiDocFrontPageTest.php` (assert inactive mode label absent)

**Interfaces:**
- Livewire `public string $mode = ''`
- `switchMode(string $code): void`
- `mount` resolves from `mode` then `lang` query via resolver
- View receives `$modes` collection (active) and `$mode` code

- [ ] **Step 1: Failing test — inactive mode not in header**

```php
#[Test]
public function header_omits_inactive_display_modes(): void
{
    $this->seed(ApiDocDisplayModeSeeder::class);
    ApiDocDisplayMode::query()->where('code', 'en')->update(['is_active' => false]);
    // need minimal section so page renders
    ApiDocSection::factory()->create(['slug' => 'intro', 'is_intro' => true]);
    $html = $this->get('/api-doc')->assertOk()->getContent();
    $this->assertStringNotContainsString(">英文<", $html);
    $this->assertStringContainsString('法文', $html);
}
```

- [ ] **Step 2: Implement Livewire**

```php
public string $mode = '';

public function mount(ApiDocDisplayModeResolver $resolver): void
{
    $resolved = $resolver->resolve(
        request()->query('mode'),
        request()->query('lang'),
    );
    $this->mode = $resolved->code;
}

public function switchMode(string $code, ApiDocDisplayModeResolver $resolver): void
{
    $resolved = $resolver->resolve($code, null);
    $this->mode = $resolved->code;
    $this->dispatch('api-doc:lang-changed', lang: $this->mode);
}

public function render(ApiDocDisplayModeResolver $resolver)
{
    $resolved = $resolver->resolve($this->mode, null);
    $this->mode = $resolved->code;
    $data = app(ApiDocRenderer::class)->render($this->mode, html: true);
    // ...
    return view(..., [
        'mode' => $this->mode,
        'modes' => $resolver->activeOrdered(),
        'lang' => $this->mode, // temporary alias for blades still using $lang
    ]);
}
```

- [ ] **Step 3: Header blade**

```blade
@foreach ($modes as $displayMode)
    <button type="button"
            wire:click="switchMode('{{ $displayMode->code }}')"
            :aria-pressed="lang === '{{ $displayMode->code }}' ? 'true' : 'false'">
        {{ $displayMode->label }}
    </button>
@endforeach
```

Keep `x-data="{ lang: @entangle('mode') }"` (rename entangle to `mode` and update Alpine accordingly).

- [ ] **Step 4: Tests + commit**

```bash
php artisan test --compact tests/Feature/ApiDoc/ApiDocFrontPageTest.php
git commit -m "feat(api-doc): wire front header to DB display modes"
```

---

### Task 6: Filament Display Mode resource + invariants

**Files:**
- Create: `gz168/ApiDoc/src/Filament/Resources/ApiDocDisplayModeResource.php`
- Create: pages under `.../ApiDocDisplayModeResource/Pages/{List,Create,Edit,View}ApiDocDisplayMode.php`
- Modify: Create/Edit pages to use `FlushesApiDocCache`, call resolver `syncSettingDefaultLocale` when `is_default`
- Test: `tests/Feature/ApiDoc/ApiDocDisplayModeTest.php` (model-level invariant tests; Filament browser optional)

**Interfaces:**
- Validation: `locales` required array min:1; each in fr|zh|en; distinct
- On save default: clear other `is_default`, sync settings
- Prevent deactivate/delete leaving zero active or zero default: use model `saving`/`deleting` observers or resource `mutateFormDataBeforeSave` + page hooks throwing `ValidationException` / `Notification`

- [ ] **Step 1: Failing invariant test**

```php
#[Test]
public function cannot_deactivate_last_active_mode(): void
{
    $this->seed(ApiDocDisplayModeSeeder::class);
    ApiDocDisplayMode::query()->where('code', '!=', 'fr')->update(['is_active' => false]);
    $fr = ApiDocDisplayMode::query()->where('code', 'fr')->firstOrFail();

    $this->expectException(\RuntimeException::class); // or ValidationException — pick one and use consistently
    $fr->is_active = false;
    $fr->save();
}
```

Implement via `ApiDocDisplayMode::saving` callback in `booted()`.

- [ ] **Step 2: Resource form (Filament 5)**

Mirror `ApiDocGroupResource` patterns: `ApiDocAuthorization`, nav group `API 文档`, sort ~88 (before settings 89).

Form fields:

```php
TextInput::make('code')->required()->maxLength(64)->unique(ignoreRecord: true)
    ->disabled(fn (?ApiDocDisplayMode $record): bool => $record !== null && in_array($record->code, ['fr','zh','en','fr_zh','zh_en_fr'], true)),
TextInput::make('label')->required()->maxLength(120),
CheckboxList::make('locales') // better: use Repeater or Select multiple with order
```

For **ordered** locales, use Filament `TagsInput` is unordered — prefer:

```php
Select::make('locales')
    ->multiple()
    ->options(ApiDocContentLocale::options())
    ->required()
    ->helperText('顺序即主语言优先；请按显示顺序选择（Filament multiple 顺序以选中顺序为准，若不稳定改用 Repeater）。')
```

If multiple select order is unreliable in Filament 5, use:

```php
Repeater::make('locales')
    ->simple(Select::make('locale')->options(ApiDocContentLocale::options())->required())
    ->minItems(1)
    ->maxItems(3)
```

and mutate to flat `list<string>` on save.

- [ ] **Step 3: Wire cache flush + sync default locale on Create/Edit**

```php
protected function afterSave(): void
{
    if ($this->record->is_default) {
        ApiDocDisplayMode::query()->where('id', '!=', $this->record->id)->update(['is_default' => false]);
        app(ApiDocDisplayModeResolver::class)->syncSettingDefaultLocale($this->record);
    }
    $this->flushApiDocCache();
}
```

- [ ] **Step 4: Tests + commit**

```bash
php artisan test --compact tests/Feature/ApiDoc/ApiDocDisplayModeTest.php
git commit -m "feat(api-doc): add Filament display mode resource"
```

---

### Task 7: Backend localized fields → language Tabs

**Files:**
- Modify: `gz168/ApiDoc/src/Filament/Forms/Components/LocalizedKeyValue.php`
- Modify: `gz168/ApiDoc/src/Filament/Forms/Components/LocalizedBodyFields.php`
- No call-site changes if APIs stay `LocalizedKeyValue::make(...)` / `LocalizedBodyFields::make(...)`

**Interfaces:**
- Same public `make()` signatures
- Internals use `Filament\Schemas\Components\Tabs` + `Tab` (see `gz168/Amazon/.../FbaSandboxInventoryPage.php`)

- [ ] **Step 1: Refactor LocalizedKeyValue to Tabs**

```php
use Filament\Schemas\Components\Tabs;
use Filament\Schemas\Components\Tabs\Tab;

public static function make(...): Tabs
{
    return Tabs::make($name === '' ? 'localized' : $name.'_tabs')
        ->tabs([
            Tab::make('法文')->schema([
                TextInput::make($name === '' ? 'fr' : $name.'.fr')->label($frLabel)->maxLength(65535)
                    ->required($required),
            ]),
            Tab::make('中文')->schema([
                TextInput::make($name === '' ? 'zh' : $name.'.zh')->label($zhLabel)->maxLength(65535)
                    ->required($required),
            ]),
            Tab::make('英文')->schema([
                TextInput::make($name === '' ? 'en' : $name.'.en')->label($enLabel)->maxLength(65535)
                    ->required($required),
            ]),
        ])
        ->columnSpanFull();
}
```

Remove `LocalizedKeyValueGrid` if unused, or keep `required()` fluent by returning a custom Tabs subclass — simplest: drop chainable `->required()` on grid and pass `$required` into `make()` only (already supported). Grep for `->required()` chained on `LocalizedKeyValue::make` and ensure still works.

- [ ] **Step 2: Refactor LocalizedBodyFields**

Keep format Select above tabs; inside each language Tab put either Markdown or Rich editor for that locale path (visibility still driven by `content_format`).

Structure:

```text
Select content_format
Tabs
  法文 → MarkdownEditor|RichEditor for name.fr
  中文 → ... name.zh
  英文 → ... name.en
```

- [ ] **Step 3: Manual sanity — open `/admin/api-doc-groups/create` and a section edit page** (or Livewire Filament smoke if exists)

- [ ] **Step 4: Run related tests + commit**

```bash
php artisan test --compact tests/Feature/ApiDoc/
git commit -m "feat(api-doc): use language tabs for localized Filament fields"
```

---

### Task 8: Settings page + deprecate enum front usage + docs touch-up

**Files:**
- Modify: `gz168/ApiDoc/src/Filament/Pages/ApiDocSettingsPage.php` — remove or replace `default_locale` Select with Placeholder linking to Display Mode resource
- Modify: `gz168/ApiDoc/src/Enums/ApiDocDisplayMode.php` — add `@deprecated` docblock; keep `values()` only if tests need; stop importing from Livewire/header
- Modify: `gz168/ApiDoc/src/Enums/ApiDocLocale.php` — leave or mark obsolete (Fr/Zh/Both only)
- Optional ops note: short paragraph in spec §8 already points to plans

- [ ] **Step 1: Settings UI**

```php
Placeholder::make('display_modes_hint')
    ->label('默认显示方式')
    ->content('请到「显示方式」资源中设置启用项与默认项。保存默认显示方式时会同步 default_locale。'),
```

Remove editable `default_locale` from fill/save **or** keep read-only TextInput disabled.

- [ ] **Step 2: Grep cleanup**

```bash
rg "ApiDocDisplayMode::" gz168/ApiDoc --glob '*.php'
```

Front must not use enum `options()` for header.

- [ ] **Step 3: Full ApiDoc test suite**

```bash
php artisan test --compact tests/Feature/ApiDoc/ tests/Unit/ApiDoc/
vendor/bin/pint --dirty --format agent
```

- [ ] **Step 4: Commit**

```bash
git commit -m "refactor(api-doc): settings hint for display modes; deprecate front enum"
```

---

## Spec coverage checklist

| Spec item | Task |
| --- | --- |
| Content `{fr,zh,en}` unchanged | 1, 7 |
| Table `api_doc_display_modes` | 2 |
| Seed 5 modes; `fr_zh` = [fr,zh] | 2 |
| Self-serve custom modes | 6 |
| Tabs for admin entry | 7 |
| Front switcher from active modes + default | 5 |
| `?mode=` + legacy `?lang=` | 3, 5 |
| In-mode fallback only | 1, 4 |
| Temporary primary+span layout | 1, 4 |
| Sync `default_locale` from default mode | 3, 6 |
| Cache by mode code | 4 |
| No templates | all (ignored) |
| Permissions reuse | 6 |
| Tests unit/feature/regression | 1–5, 8 |

## Self-review notes

- No TBD left for `default_locale` behavior (sync on default save).
- `LocalizedKeyValue::make()->required()` chain: Task 7 must preserve or update all call sites in one commit.
- Body multi-locale HTML must not use `e()` on already-rendered markdown HTML — Task 4 calls this out explicitly.

---

## Execution handoff

Plan complete and saved to `docs/dev-laraval/superpowers/plans/2026-09-14-apidoc-display-modes.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — execute tasks in this session with checkpoints  

Which approach?
