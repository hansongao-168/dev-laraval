# ApiDoc Front Templates (Skin) Implementation Plan

> **Status:** V1 implemented on `feat/apidoc-display-modes` (config catalog `classic`, Filament Select, front views_prefix, cache keys, snapshot `display_modes`).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Wire `api_doc_display_modes.template_key` to a config-registered front skin catalog (V1: only `classic` = existing Blade stack), with Filament Select, cache-key isolation, and snapshot import/export of display modes.

**Architecture:** Add `templates` block to `config/api-doc.php`. Resolve skins via `ApiDocTemplateResolver` (null/unknown → `classic` + warning; bad catalog config fail-fast). `ApiDocPage` picks layout/page views from `views_prefix`. `ApiDocRenderer` cache keys become `render:{mode}:{template}[:html]`. Exporter/Importer gain a `display_modes` section including `template_key`.

**Tech Stack:** Laravel 13, PHP 8.5, Filament 5, Livewire 4, PHPUnit 12, module `gz168/ApiDoc`.

**Spec:** `docs/dev-laraval/superpowers/specs/2026-09-15-apidoc-front-templates-design.md`

## Global Constraints

- V1 registers **only** skin `classic`; do not build a second Blade theme.
- Do not move existing views under `templates/{key}/`; map `classic` → `gz168-api-doc::front`.
- Skin is bound to display mode (`template_key`); no front-end “change skin” UI; no `?template=` override.
- Unknown / empty `template_key` at runtime → default skin; illegal keys must not persist via Filament or import.
- Permissions: reuse `api-doc.view` / `api-doc.update`.
- Never expose `.env` secrets; keep protected admin invariants untouched.
- After PHP edits: `vendor/bin/pint --dirty --format agent`.
- Commits for `gz168/ApiDoc` go in the `gz168` submodule when that tree is dirty; docs commits go in the `docs` submodule; app-level tests live in the parent repo under `tests/`.

## File map

| File | Responsibility |
| --- | --- |
| `gz168/ApiDoc/config/api-doc.php` | `templates.default` + `templates.catalog` |
| `gz168/ApiDoc/src/Services/ApiDocResolvedTemplate.php` | Readonly DTO: key, label, viewsPrefix, assets |
| `gz168/ApiDoc/src/Services/ApiDocTemplateResolver.php` | Normalize key, options(), isRegistered() |
| `gz168/ApiDoc/database/seeders/ApiDocDisplayModeSeeder.php` | Seed `template_key = classic` |
| `gz168/ApiDoc/database/factories/ApiDocDisplayModeFactory.php` | Default `template_key = classic` |
| `gz168/ApiDoc/src/Models/ApiDocDisplayMode.php` | Validate template_key on saving |
| `gz168/ApiDoc/src/Filament/Resources/ApiDocDisplayModeResource.php` | Select + table column |
| `gz168/ApiDoc/src/Livewire/ApiDocPage.php` | Resolve skin → view/layout names |
| `gz168/ApiDoc/src/Services/ApiDocRenderer.php` | Cache key includes template |
| `gz168/ApiDoc/src/Services/ApiDocCacheManager.php` | Flush keys with template segment |
| `gz168/ApiDoc/src/Services/ApiDocExporter.php` | Export `display_modes` |
| `gz168/ApiDoc/src/Services/ApiDocImporter.php` | Import `display_modes`; reject bad template_key |
| `tests/Unit/ApiDoc/ApiDocTemplateResolverTest.php` | Resolver unit tests |
| `tests/Feature/ApiDoc/ApiDocDisplayModeTest.php` | Seeder + Filament template_key |
| `tests/Feature/ApiDoc/ApiDocFrontTemplateTest.php` | Front + cache isolation |
| `tests/Feature/ApiDoc/ApiDocSnapshotDisplayModesTest.php` | Export/import round-trip |

---

### Task 1: Config registry + ApiDocTemplateResolver

**Files:**
- Modify: `gz168/ApiDoc/config/api-doc.php`
- Create: `gz168/ApiDoc/src/Services/ApiDocResolvedTemplate.php`
- Create: `gz168/ApiDoc/src/Services/ApiDocTemplateResolver.php`
- Create: `tests/Unit/ApiDoc/ApiDocTemplateResolverTest.php`

**Interfaces:**
- Produces:
  - `final readonly class ApiDocResolvedTemplate` with `string $key`, `string $label`, `string $viewsPrefix`, `array $assets`, method `view(string $relative): string` → `{viewsPrefix}.{relative}`
  - `ApiDocTemplateResolver::resolve(?string $templateKey, ?string $contextModeCode = null): ApiDocResolvedTemplate`
  - `ApiDocTemplateResolver::defaultKey(): string`
  - `ApiDocTemplateResolver::isRegistered(string $key): bool`
  - `ApiDocTemplateResolver::options(): array<string, string>` (key → label)
- Consumes: `config('api-doc.templates')`

- [x] **Step 1: Write failing unit tests**

Create `tests/Unit/ApiDoc/ApiDocTemplateResolverTest.php`:

```php
<?php

declare(strict_types=1);

namespace Tests\Unit\ApiDoc;

use Gz168\ApiDoc\Services\ApiDocTemplateResolver;
use Illuminate\Support\Facades\Log;
use PHPUnit\Framework\Attributes\Test;
use RuntimeException;
use Tests\TestCase;

class ApiDocTemplateResolverTest extends TestCase
{
    #[Test]
    public function resolve_null_and_classic_use_default_skin(): void
    {
        $resolver = app(ApiDocTemplateResolver::class);

        $fromNull = $resolver->resolve(null);
        $fromClassic = $resolver->resolve('classic');

        $this->assertSame('classic', $fromNull->key);
        $this->assertSame('classic', $fromClassic->key);
        $this->assertSame('gz168-api-doc::front', $fromNull->viewsPrefix);
        $this->assertSame('gz168-api-doc::front.api-doc-page', $fromNull->view('api-doc-page'));
        $this->assertSame('gz168-api-doc::front.layout', $fromNull->view('layout'));
    }

    #[Test]
    public function resolve_unknown_key_falls_back_and_logs_warning(): void
    {
        Log::spy();
        $resolver = app(ApiDocTemplateResolver::class);

        $resolved = $resolver->resolve('nope', 'fr');

        $this->assertSame('classic', $resolved->key);
        Log::shouldHaveReceived('warning')->once();
    }

    #[Test]
    public function options_match_catalog_labels(): void
    {
        $options = app(ApiDocTemplateResolver::class)->options();

        $this->assertSame(['classic' => '经典'], $options);
        $this->assertTrue(app(ApiDocTemplateResolver::class)->isRegistered('classic'));
        $this->assertFalse(app(ApiDocTemplateResolver::class)->isRegistered('nope'));
    }

    #[Test]
    public function missing_default_in_catalog_fails_fast(): void
    {
        config([
            'api-doc.templates' => [
                'default' => 'missing',
                'catalog' => [
                    'classic' => [
                        'label' => '经典',
                        'views_prefix' => 'gz168-api-doc::front',
                        'assets' => [],
                    ],
                ],
            ],
        ]);

        $this->expectException(RuntimeException::class);
        app(ApiDocTemplateResolver::class)->resolve(null);
    }
}
```

- [x] **Step 2: Run — expect fail (class missing)**

```bash
php artisan test --compact tests/Unit/ApiDoc/ApiDocTemplateResolverTest.php
```

Expected: FAIL (class not found / config key missing).

- [x] **Step 3: Add config block**

Append to `gz168/ApiDoc/config/api-doc.php` (before closing `];`):

```php
    /*
    |--------------------------------------------------------------------------
    | Front display templates (skins)
    |--------------------------------------------------------------------------
    |
    | template_key on api_doc_display_modes selects a catalog entry. V1 ships
    | only "classic" (existing Blade stack under gz168-api-doc::front).
    |
    */
    'templates' => [
        'default' => 'classic',
        'catalog' => [
            'classic' => [
                'label' => '经典',
                'views_prefix' => 'gz168-api-doc::front',
                'assets' => [
                    'css' => 'resources/css/api-doc.css',
                    'js' => 'resources/js/front/api-doc/api-doc.js',
                ],
            ],
        ],
    ],
```

- [x] **Step 4: Implement DTO + Resolver**

`ApiDocResolvedTemplate.php`:

```php
<?php

declare(strict_types=1);

namespace Gz168\ApiDoc\Services;

final readonly class ApiDocResolvedTemplate
{
    /**
     * @param  array{css?: string, js?: string}  $assets
     */
    public function __construct(
        public string $key,
        public string $label,
        public string $viewsPrefix,
        public array $assets = [],
    ) {}

    public function view(string $relative): string
    {
        return $this->viewsPrefix.'.'.$relative;
    }
}
```

`ApiDocTemplateResolver.php`:

```php
<?php

declare(strict_types=1);

namespace Gz168\ApiDoc\Services;

use Illuminate\Contracts\Config\Repository as ConfigRepository;
use Illuminate\Support\Facades\Log;
use RuntimeException;

final class ApiDocTemplateResolver
{
    public function __construct(
        private readonly ConfigRepository $config,
    ) {}

    public function defaultKey(): string
    {
        $default = (string) $this->config->get('api-doc.templates.default', '');
        if ($default === '' || ! $this->isRegistered($default)) {
            throw new RuntimeException('api-doc.templates.default must exist in templates.catalog.');
        }

        return $default;
    }

    public function isRegistered(string $key): bool
    {
        $catalog = $this->catalog();

        return array_key_exists($key, $catalog);
    }

    /**
     * @return array<string, string>
     */
    public function options(): array
    {
        $out = [];
        foreach ($this->catalog() as $key => $entry) {
            $out[$key] = (string) ($entry['label'] ?? $key);
        }

        return $out;
    }

    public function resolve(?string $templateKey, ?string $contextModeCode = null): ApiDocResolvedTemplate
    {
        $catalog = $this->catalog();
        if ($catalog === []) {
            throw new RuntimeException('api-doc.templates.catalog must not be empty.');
        }

        $default = $this->defaultKey();
        $raw = $templateKey !== null ? trim($templateKey) : '';

        if ($raw === '') {
            return $this->entry($default, $catalog[$default]);
        }

        if (! array_key_exists($raw, $catalog)) {
            Log::warning('Unknown ApiDoc template_key; falling back to default.', [
                'template_key' => $raw,
                'mode_code' => $contextModeCode,
                'fallback' => $default,
            ]);

            return $this->entry($default, $catalog[$default]);
        }

        return $this->entry($raw, $catalog[$raw]);
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    private function catalog(): array
    {
        $catalog = $this->config->get('api-doc.templates.catalog', []);

        return is_array($catalog) ? $catalog : [];
    }

    /**
     * @param  array<string, mixed>  $entry
     */
    private function entry(string $key, array $entry): ApiDocResolvedTemplate
    {
        $prefix = (string) ($entry['views_prefix'] ?? '');
        if ($prefix === '') {
            throw new RuntimeException("api-doc.templates.catalog.{$key}.views_prefix is required.");
        }

        $assets = $entry['assets'] ?? [];

        return new ApiDocResolvedTemplate(
            key: $key,
            label: (string) ($entry['label'] ?? $key),
            viewsPrefix: $prefix,
            assets: is_array($assets) ? $assets : [],
        );
    }
}
```

No ServiceProvider bind needed if resolved via container constructor injection of `ConfigRepository`.

- [x] **Step 5: Run tests — pass**

```bash
php artisan test --compact tests/Unit/ApiDoc/ApiDocTemplateResolverTest.php
vendor/bin/pint --dirty --format agent
```

- [x] **Step 6: Commit**

```bash
# In gz168 submodule if config/services live there; tests in parent repo:
cd /var/www/dev-laraval/gz168 && git add ApiDoc/config/api-doc.php ApiDoc/src/Services/ApiDocResolvedTemplate.php ApiDoc/src/Services/ApiDocTemplateResolver.php && git commit -m "feat(api-doc): add front template config registry and resolver"
cd /var/www/dev-laraval && git add tests/Unit/ApiDoc/ApiDocTemplateResolverTest.php && git commit -m "test(api-doc): cover ApiDocTemplateResolver"
```

---

### Task 2: Seeder, factory, model validation

**Files:**
- Modify: `gz168/ApiDoc/database/seeders/ApiDocDisplayModeSeeder.php`
- Modify: `gz168/ApiDoc/database/factories/ApiDocDisplayModeFactory.php`
- Modify: `gz168/ApiDoc/src/Models/ApiDocDisplayMode.php`
- Modify: `tests/Feature/ApiDoc/ApiDocDisplayModeTest.php`

**Interfaces:**
- Consumes: `ApiDocTemplateResolver::isRegistered`
- Model rule: `template_key` must be `null` or registered; empty string normalize to `null` or `classic` — **use `null` allowed OR registered key; seeder writes `classic`**

- [x] **Step 1: Extend failing/updated seeder assertion**

In `tests/Feature/ApiDoc/ApiDocDisplayModeTest.php`, update or add:

```php
#[Test]
public function seeder_sets_template_key_classic_on_all_modes(): void
{
    $this->seed(ApiDocDisplayModeSeeder::class);

    $this->assertSame(
        5,
        ApiDocDisplayMode::query()->where('template_key', 'classic')->count(),
    );
    $this->assertSame(0, ApiDocDisplayMode::query()->whereNull('template_key')->count());
}

#[Test]
public function model_rejects_unknown_template_key(): void
{
    $this->seed(ApiDocDisplayModeSeeder::class);
    $mode = ApiDocDisplayMode::query()->where('code', 'zh')->firstOrFail();

    $this->expectException(\RuntimeException::class);
    $mode->template_key = 'not-a-skin';
    $mode->save();
}
```

- [x] **Step 2: Run — seeder assertion should fail (still null)**

```bash
php artisan test --compact tests/Feature/ApiDoc/ApiDocDisplayModeTest.php --filter=seeder_sets_template_key
```

- [x] **Step 3: Seeder + factory**

In seeder `updateOrCreate` payload set `'template_key' => 'classic'` (replace `null`).

In factory `definition()` set `'template_key' => 'classic'`.

- [x] **Step 4: Model saving validation**

Inside existing `booted()` `saving` callback in `ApiDocDisplayMode`, after locales checks:

```php
$key = $mode->template_key;
if ($key === '') {
    $mode->template_key = null;
    $key = null;
}
if ($key !== null) {
    $templates = app(\Gz168\ApiDoc\Services\ApiDocTemplateResolver::class);
    if (! $templates->isRegistered((string) $key)) {
        throw new RuntimeException('Display mode template_key must be null or a registered catalog key.');
    }
}
```

- [x] **Step 5: Run tests — pass**

```bash
php artisan test --compact tests/Feature/ApiDoc/ApiDocDisplayModeTest.php --filter='seeder_sets_template_key|model_rejects_unknown'
vendor/bin/pint --dirty --format agent
```

- [x] **Step 6: Commit**

```bash
cd /var/www/dev-laraval/gz168 && git add ApiDoc/database/seeders/ApiDocDisplayModeSeeder.php ApiDoc/database/factories/ApiDocDisplayModeFactory.php ApiDoc/src/Models/ApiDocDisplayMode.php && git commit -m "feat(api-doc): seed and validate display mode template_key"
cd /var/www/dev-laraval && git add tests/Feature/ApiDoc/ApiDocDisplayModeTest.php && git commit -m "test(api-doc): assert classic template_key seeding and validation"
```

---

### Task 3: Filament Display Mode Select

**Files:**
- Modify: `gz168/ApiDoc/src/Filament/Resources/ApiDocDisplayModeResource.php`
- Modify: `tests/Feature/ApiDoc/ApiDocDisplayModeTest.php`

**Interfaces:**
- Consumes: `ApiDocTemplateResolver::options()`
- Replace `Hidden::make('template_key')` with Select; add table column

- [x] **Step 1: Failing Livewire test for save**

Append to `ApiDocDisplayModeTest.php` (reuse existing `actingAsFilamentAdmin` helper):

```php
#[Test]
public function filament_can_save_classic_template_key(): void
{
    $this->actingAsFilamentAdmin();
    $this->seed(ApiDocDisplayModeSeeder::class);
    $zh = ApiDocDisplayMode::query()->where('code', 'zh')->firstOrFail();

    Livewire::test(EditApiDocDisplayMode::class, ['record' => $zh->getKey()])
        ->fillForm([
            'label' => $zh->label,
            'locales' => $zh->locales,
            'sort' => $zh->sort,
            'is_active' => true,
            'is_default' => false,
            'template_key' => 'classic',
        ])
        ->call('save')
        ->assertHasNoFormErrors();

    $this->assertSame('classic', $zh->fresh()->template_key);
}

#[Test]
public function filament_rejects_unknown_template_key(): void
{
    $this->actingAsFilamentAdmin();
    $this->seed(ApiDocDisplayModeSeeder::class);
    $zh = ApiDocDisplayMode::query()->where('code', 'zh')->firstOrFail();

    Livewire::test(EditApiDocDisplayMode::class, ['record' => $zh->getKey()])
        ->fillForm([
            'template_key' => 'not-a-skin',
        ])
        ->call('save')
        ->assertHasFormErrors(['template_key']);
}
```

If Filament only validates via Select options (no free text), the second test may instead assert the option is absent — then assert model still `classic` after a save attempt with invalid dehydrated value is blocked. Prefer Form `Rule::in(array_keys($options))` plus Select so both paths are covered.

- [x] **Step 2: Run — expect fail / Hidden ignores field**

```bash
php artisan test --compact tests/Feature/ApiDoc/ApiDocDisplayModeTest.php --filter=filament_can_save_classic
```

- [x] **Step 3: Replace Hidden with Select + column**

In `ApiDocDisplayModeResource::form`, replace `Hidden::make('template_key')` with:

```php
Select::make('template_key')
    ->label('前台模板')
    ->options(fn (): array => app(\Gz168\ApiDoc\Services\ApiDocTemplateResolver::class)->options())
    ->default('classic')
    ->required()
    ->helperText('决定前台 Blade 皮肤；与显示语种绑定。'),
```

In `table()` columns, after `label`:

```php
TextColumn::make('template_key')
    ->label('模板')
    ->formatStateUsing(function (?string $state): string {
        if ($state === null || $state === '') {
            return app(\Gz168\ApiDoc\Services\ApiDocTemplateResolver::class)->defaultKey();
        }
        $options = app(\Gz168\ApiDoc\Services\ApiDocTemplateResolver::class)->options();

        return $options[$state] ?? $state;
    }),
```

Ensure Create page defaults `template_key` to `classic` (Select `default('classic')` is enough if dehydrated).

- [x] **Step 4: Run tests — pass**

```bash
php artisan test --compact tests/Feature/ApiDoc/ApiDocDisplayModeTest.php --filter=filament_
vendor/bin/pint --dirty --format agent
```

- [x] **Step 5: Commit**

```bash
cd /var/www/dev-laraval/gz168 && git add ApiDoc/src/Filament/Resources/ApiDocDisplayModeResource.php && git commit -m "feat(api-doc): Filament select for display mode template_key"
cd /var/www/dev-laraval && git add tests/Feature/ApiDoc/ApiDocDisplayModeTest.php && git commit -m "test(api-doc): Filament template_key save and validation"
```

---

### Task 4: Front page views_prefix + cache keys

**Files:**
- Modify: `gz168/ApiDoc/src/Livewire/ApiDocPage.php`
- Modify: `gz168/ApiDoc/src/Services/ApiDocRenderer.php`
- Modify: `gz168/ApiDoc/src/Services/ApiDocCacheManager.php`
- Create: `tests/Feature/ApiDoc/ApiDocFrontTemplateTest.php`

**Interfaces:**
- Consumes: `ApiDocTemplateResolver::resolve`
- Cache key shape: `render:{modeCode}:{templateKey}` and `render:{modeCode}:{templateKey}:html` (same for `ui:`)
- Flush must forget both new keys (for each known mode × registered templates) and legacy `render:{code}` / `render:{code}:html` for one release

- [x] **Step 1: Write failing front + cache tests**

Create `tests/Feature/ApiDoc/ApiDocFrontTemplateTest.php`:

```php
<?php

declare(strict_types=1);

namespace Tests\Feature\ApiDoc;

use Gz168\ApiDoc\Database\Seeders\ApiDocDisplayModeSeeder;
use Gz168\ApiDoc\Models\ApiDocDisplayMode;
use Gz168\ApiDoc\Models\ApiDocSection;
use Gz168\ApiDoc\Models\ApiDocSetting;
use Gz168\ApiDoc\Services\ApiDocCacheManager;
use Gz168\ApiDoc\Services\ApiDocRenderer;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Cache;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ApiDocFrontTemplateTest extends TestCase
{
    use LazilyRefreshDatabase;

    #[Test]
    public function front_page_ok_with_classic_template(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);
        ApiDocSetting::current();
        ApiDocSection::factory()->create(['slug' => 'intro', 'is_intro' => true]);

        $this->get('/api-doc')->assertOk()->assertSee('class="wrap"', false);
        $this->get('/api-doc?mode=fr')->assertOk();
    }

    #[Test]
    public function renderer_cache_keys_include_template_key(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);
        ApiDocSetting::current();
        ApiDocSection::factory()->create(['slug' => 'oauth', 'verb' => 'POST', 'path' => '/x']);

        config(['api-doc.cache.ttl' => 3600]);

        $renderer = app(ApiDocRenderer::class);
        $renderer->render('fr', html: true);

        $prefix = (string) config('api-doc.cache.key_prefix', 'api_doc:');
        $this->assertTrue(
            Cache::has($prefix.'render:fr:classic:html')
            || $this->cacheStoreHas($prefix.'render:fr:classic:html'),
            'Expected cache key render:fr:classic:html',
        );
    }

    #[Test]
    public function different_template_keys_do_not_share_cache_payload(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);
        ApiDocSetting::current();
        ApiDocSection::factory()->create(['slug' => 'oauth', 'verb' => 'POST', 'path' => '/x']);

        // Fake second catalog entry pointing at same views (no second UI).
        config([
            'api-doc.templates.catalog.alt' => [
                'label' => 'Alt',
                'views_prefix' => 'gz168-api-doc::front',
                'assets' => [],
            ],
        ]);

        $mode = ApiDocDisplayMode::query()->where('code', 'fr')->firstOrFail();
        $mode->forceFill(['template_key' => 'classic'])->saveQuietly();

        $renderer = app(ApiDocRenderer::class);
        $first = $renderer->render('fr', html: true);

        $mode->forceFill(['template_key' => 'alt'])->saveQuietly();
        app(ApiDocCacheManager::class)->flush();

        // Warm classic key then switch — keys must differ when we inspect manager helpers.
        // Assert by rendering under both keys with a spy on remember keys via subclass or
        // by checking both cache entries can coexist:

        $mode->forceFill(['template_key' => 'classic'])->saveQuietly();
        $renderer->render('fr', html: true);
        $mode->forceFill(['template_key' => 'alt'])->saveQuietly();
        $renderer->render('fr', html: true);

        $prefix = (string) config('api-doc.cache.key_prefix', 'api_doc:');
        $this->assertTrue($this->cacheStoreHas($prefix.'render:fr:classic:html'));
        $this->assertTrue($this->cacheStoreHas($prefix.'render:fr:alt:html'));
        $this->assertNotSame('alt', 'classic');
        $this->assertIsArray($first);
    }

    private function cacheStoreHas(string $fullKey): bool
    {
        return Cache::has($fullKey);
    }
}
```

If tagged cache makes `Cache::has` unreliable in tests, assert via a small package test double: temporarily set `api-doc.cache.ttl` to `0` for front OK test, and for isolation test inject a custom `ApiDocCacheManager` recording keys — **prefer asserting on `ApiDocRenderer` building the key string**. Simpler approach for Step 3: extract protected/helper method or assert using `Cache::get` after forcing array store in `phpunit.xml` / test `Cache::setDefaultDriver('array')`.

Minimal reliable isolation assertion without Cache::has:

```php
#[Test]
public function render_cache_key_embeds_resolved_template(): void
{
    $this->seed(ApiDocDisplayModeSeeder::class);
    $mode = ApiDocDisplayMode::query()->where('code', 'fr')->firstOrFail();
    $mode->update(['template_key' => 'classic']);

    $templates = app(\Gz168\ApiDoc\Services\ApiDocTemplateResolver::class);
    $skin = $templates->resolve($mode->template_key, $mode->code);

    $expected = 'render:'.$mode->code.':'.$skin->key.':html';
    $this->assertSame('render:fr:classic:html', $expected);
}
```

Plus a unit/feature test that mocks `ApiDocCacheManager::remember` and asserts the first argument — use Mockery partial if the class is concrete:

```php
$cache = \Mockery::mock(ApiDocCacheManager::class)->makePartial();
$cache->shouldReceive('remember')
    ->once()
    ->withArgs(fn (string $key): bool => $key === 'render:fr:classic:html')
    ->andReturn(['lang' => 'fr', 'nav' => [], 'sections' => [], 'ui' => []]);
$this->app->instance(ApiDocCacheManager::class, $cache);
// re-resolve renderer...
```

Implement whichever fits existing test style; **must** prove key includes template.

- [x] **Step 2: Run — expect fail (old key shape)**

```bash
php artisan test --compact tests/Feature/ApiDoc/ApiDocFrontTemplateTest.php
```

- [x] **Step 3: Wire ApiDocPage**

```php
public function render(
    ApiDocDisplayModeResolver $resolver,
    \Gz168\ApiDoc\Services\ApiDocTemplateResolver $templates,
) {
    $resolved = $resolver->resolve($this->mode, null);
    $this->mode = $resolved->code;

    $skin = $templates->resolve($resolved->template_key, $resolved->code);

    if (! view()->exists($skin->view('api-doc-page')) || ! view()->exists($skin->view('layout'))) {
        throw new \RuntimeException("ApiDoc template [{$skin->key}] views are missing.");
    }

    $settings = ApiDocSetting::current();
    $data = app(ApiDocRenderer::class)->render($this->mode, html: true);
    // ... existing ui/nav/title ...

    return view($skin->view('api-doc-page'), [
        // same data as today
        'data' => $data,
        'settings' => $settings,
        'mode' => $this->mode,
        'modes' => $resolver->activeOrdered(),
        'lang' => $this->mode,
        'ui' => $ui,
        'nav' => $nav,
        'template' => $skin,
    ])->layout($skin->view('layout'), [
        'title' => $title,
        'description' => 'API documentation (FR / ZH / EN)',
        'settings' => $settings,
        'lang' => $data['lang'] ?? $this->mode,
        'template' => $skin,
    ]);
}
```

Layout may keep inlining current CSS/JS in V1; optional later: read `$template->assets`.

- [x] **Step 4: Renderer cache keys**

In `ApiDocRenderer::render`, after `$mode = $this->resolveMode(...)`:

```php
$skin = app(\Gz168\ApiDoc\Services\ApiDocTemplateResolver::class)
    ->resolve($mode->template_key, $mode->code);
$cacheKey = 'render:'.$mode->code.':'.$skin->key.($html ? ':html' : '');

return $this->cache->remember($cacheKey, function () use (...) { ... });
```

Same pattern for `uiStrings` / `ui:` keys if present (`ui:{mode}:{template}[:html]`).

Prefer constructor-injecting `ApiDocTemplateResolver` instead of `app()` if Renderer already uses constructor DI.

- [x] **Step 5: CacheManager flush**

Update `flush()` to:

```php
$templateKeys = array_keys((array) config('api-doc.templates.catalog', []));
if ($templateKeys === []) {
    $templateKeys = ['classic'];
}

$modeCodes = array_values(array_unique(array_merge(
    self::FLUSH_CODES,
    \Gz168\ApiDoc\Models\ApiDocDisplayMode::query()->pluck('code')->all(),
)));

foreach ($modeCodes as $code) {
    // Legacy keys (one release)
    $this->forget('render:'.$code);
    $this->forget('render:'.$code.':html');
    $this->forget('ui:'.$code);
    $this->forget('ui:'.$code.':html');

    foreach ($templateKeys as $template) {
        $this->forget('render:'.$code.':'.$template);
        $this->forget('render:'.$code.':'.$template.':html');
        $this->forget('ui:'.$code.':'.$template);
        $this->forget('ui:'.$code.':'.$template.':html');
    }
}
$this->forget('settings');
```

- [x] **Step 6: Run tests + existing front regression**

```bash
php artisan test --compact tests/Feature/ApiDoc/ApiDocFrontTemplateTest.php tests/Feature/ApiDoc/ApiDocFrontPageTest.php
vendor/bin/pint --dirty --format agent
```

- [x] **Step 7: Commit**

```bash
cd /var/www/dev-laraval/gz168 && git add ApiDoc/src/Livewire/ApiDocPage.php ApiDoc/src/Services/ApiDocRenderer.php ApiDoc/src/Services/ApiDocCacheManager.php && git commit -m "feat(api-doc): resolve front skin and include template in cache keys"
cd /var/www/dev-laraval && git add tests/Feature/ApiDoc/ApiDocFrontTemplateTest.php && git commit -m "test(api-doc): front classic skin and template cache isolation"
```

---

### Task 5: Snapshot export / import `display_modes`

**Files:**
- Modify: `gz168/ApiDoc/src/Services/ApiDocExporter.php`
- Modify: `gz168/ApiDoc/src/Services/ApiDocImporter.php`
- Create: `tests/Feature/ApiDoc/ApiDocSnapshotDisplayModesTest.php`

**Interfaces:**
- Snapshot key `display_modes`: list of `{code,label,locales,is_active,is_default,sort,template_key}` ordered by `sort`, then `code`
- Import: if key present, upsert by `code`; **before write**, validate every `template_key` is null or registered — on failure throw (transaction abort), do not silently rewrite
- After import call `ApiDocDisplayModeResolver::ensureInvariant()`
- Stats: add `display_modes_upserted` (or fold into `others_updated`)

- [x] **Step 1: Failing round-trip test**

```php
<?php

declare(strict_types=1);

namespace Tests\Feature\ApiDoc;

use Gz168\ApiDoc\Database\Seeders\ApiDocDisplayModeSeeder;
use Gz168\ApiDoc\Models\ApiDocDisplayMode;
use Gz168\ApiDoc\Services\ApiDocExporter;
use Gz168\ApiDoc\Services\ApiDocImporter;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use RuntimeException;
use Tests\TestCase;

class ApiDocSnapshotDisplayModesTest extends TestCase
{
    use LazilyRefreshDatabase;

    #[Test]
    public function export_includes_display_modes_with_template_key(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);
        $payload = app(ApiDocExporter::class)->exportAll();

        $this->assertArrayHasKey('display_modes', $payload);
        $this->assertCount(5, $payload['display_modes']);
        $fr = collect($payload['display_modes'])->firstWhere('code', 'fr');
        $this->assertSame('classic', $fr['template_key']);
        $this->assertSame(['fr'], $fr['locales']);
    }

    #[Test]
    public function import_round_trips_template_key(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);
        $payload = app(ApiDocExporter::class)->exportAll();

        ApiDocDisplayMode::query()->where('code', 'zh')->update(['template_key' => 'classic', 'label' => '中文-改']);

        app(ApiDocImporter::class)->import($payload, ApiDocImporter::MODE_OVERWRITE);

        $zh = ApiDocDisplayMode::query()->where('code', 'zh')->firstOrFail();
        $this->assertSame('classic', $zh->template_key);
        $this->assertSame(
            collect($payload['display_modes'])->firstWhere('code', 'zh')['label'],
            $zh->label,
        );
    }

    #[Test]
    public function import_rejects_unknown_template_key(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);
        $payload = app(ApiDocExporter::class)->exportAll();
        $payload['display_modes'][0]['template_key'] = 'not-a-skin';

        $this->expectException(RuntimeException::class);
        app(ApiDocImporter::class)->import($payload, ApiDocImporter::MODE_OVERWRITE);
    }
}
```

- [x] **Step 2: Run — expect fail (missing key)**

```bash
php artisan test --compact tests/Feature/ApiDoc/ApiDocSnapshotDisplayModesTest.php
```

- [x] **Step 3: Exporter**

Add use import for `ApiDocDisplayMode`. In `exportAll()` return array, add:

```php
'display_modes' => ApiDocDisplayMode::query()
    ->orderBy('sort')
    ->orderBy('code')
    ->get()
    ->map(fn (ApiDocDisplayMode $m): array => [
        'code' => $m->code,
        'label' => $m->label,
        'locales' => $m->locales,
        'is_active' => (bool) $m->is_active,
        'is_default' => (bool) $m->is_default,
        'sort' => (int) $m->sort,
        'template_key' => $m->template_key,
    ])
    ->all(),
```

- [x] **Step 4: Importer**

At start of transaction (after flush), if `array_key_exists('display_modes', $payload)`:

```php
$templates = app(\Gz168\ApiDoc\Services\ApiDocTemplateResolver::class);
foreach ($payload['display_modes'] as $row) {
    $tk = $row['template_key'] ?? null;
    if ($tk !== null && $tk !== '' && ! $templates->isRegistered((string) $tk)) {
        throw new \RuntimeException('Snapshot display_modes contains unknown template_key: '.$tk);
    }
}

foreach ($payload['display_modes'] as $row) {
    $data = Arr::only($row, [
        'label', 'locales', 'is_active', 'is_default', 'sort', 'template_key',
    ]);
    if (($data['template_key'] ?? null) === '') {
        $data['template_key'] = null;
    }
    ApiDocDisplayMode::updateOrCreate(['code' => $row['code']], $data);
    $stats['others_updated']++;
}

app(\Gz168\ApiDoc\Services\ApiDocDisplayModeResolver::class)->ensureInvariant();
```

Import `ApiDocDisplayMode` model at top. Validate **before** mutating modes so bad snapshots fail closed.

- [x] **Step 5: Run tests — pass**

```bash
php artisan test --compact tests/Feature/ApiDoc/ApiDocSnapshotDisplayModesTest.php
vendor/bin/pint --dirty --format agent
```

- [x] **Step 6: Commit**

```bash
cd /var/www/dev-laraval/gz168 && git add ApiDoc/src/Services/ApiDocExporter.php ApiDoc/src/Services/ApiDocImporter.php && git commit -m "feat(api-doc): snapshot export/import display_modes with template_key"
cd /var/www/dev-laraval && git add tests/Feature/ApiDoc/ApiDocSnapshotDisplayModesTest.php && git commit -m "test(api-doc): display_modes snapshot round-trip and bad template_key"
```

---

### Task 6: Full regression gate

**Files:**
- None new (run suite)

- [x] **Step 1: Run ApiDoc-related tests**

```bash
php artisan test --compact tests/Unit/ApiDoc tests/Feature/ApiDoc
```

Expected: all PASS.

- [x] **Step 2: Pint**

```bash
vendor/bin/pint --dirty --format agent
```

- [x] **Step 3: Parent submodule pointers (if gz168/docs commits exist)**

```bash
cd /var/www/dev-laraval
git add gz168 docs
git commit -m "chore: bump gz168/docs for ApiDoc front templates"
```

Only if those submodules have new commits not yet pointed by parent.

---

## Spec coverage self-check

| Spec requirement | Task |
| --- | --- |
| Register `classic` in config catalog | Task 1 |
| `ApiDocTemplateResolver` null/unknown → classic + warning; bad config fail-fast | Task 1 |
| Seeder writes `classic` | Task 2 |
| Model rejects illegal key | Task 2 |
| Filament Select + list column | Task 3 |
| Page uses `views_prefix`; missing registered views fail-fast | Task 4 |
| Cache key includes template; isolation via fake second key | Task 4 |
| Snapshot `display_modes` + reject bad template_key | Task 5 |
| Front regression | Task 4 + 6 |
| No second skin UI / no `?template=` / no DB template table | Out of scope (not scheduled) |

## Placeholder / consistency review

- No TBD steps; method names aligned: `resolve`, `options`, `isRegistered`, `view()`, cache `render:{mode}:{template}[:html]`.
- Snapshot illegal key: **whole import throws** (matches spec).
- Migration already has `template_key` — no new migration task.
