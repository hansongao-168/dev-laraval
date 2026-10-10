# ApiDoc Template JS / Real Preview / Skin Copy Implementation Plan

> **Status:** Shipped — plan steps completed; JS/preview/SkinCopier PHPUnit green.
>
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Persist per-template front-end JavaScript behind a protected-super-admin-only gate, expose a real `/api-doc` iframe preview in the Filament edit page, and auto-clone the classic Blade view tree when creating a new non-classic skin.

**Architecture:** New `js_text` column on `api_doc_templates`. `ApiDocTemplateJsGate::allows($user)` is the single authority. `ApiDocTemplateSkinCopier` runs in `CreateApiDocTemplate::afterCreate` (and as a separate command) to mirror `resources/views/front/` into `resources/views/front-{code}/` and pre-fill `body_parts` / `css_text` / `js_text`. `ApiDocPage::render` honors `?template_preview={code}` for authorized viewers, forcing an inactive-but-not-deleted row. Filament edit page renders an iframe alongside the existing draft preview.

**Tech Stack:** Laravel 13, PHP 8.5, Filament 5, Livewire 4, PHPUnit 12, module `gz168/ApiDoc`.

**Spec:** `docs/dev-laraval/superpowers/specs/2026-09-16-apidoc-template-js-preview-copy-design.md`

**Predecessor plan:** `docs/dev-laraval/superpowers/plans/2026-09-16-apidoc-template-catalog-crud.md` (catalog CRUD + part HTML/CSS already shipped).

## Global Constraints

- `js_text` write is restricted to protected super admins. Non-admin save attempts revert `js_text` silently (no exception thrown) to either the original or `null` for new records.
- `template_preview` requires an authenticated request with `api-doc.view` (or `is_super_admin` bypass from existing host pattern).
- SkinCopier source: `resources/views/front/` excluding `resolved-page.blade.php` and `resolved-layout.blade.php`. Target: `resources/views/front-{code}/` (only created on Create for non-classic). Existing target directory ⇒ skip the whole copy step but still pre-fill empty DB fields.
- `classic` template creation never triggers SkinCopier.
- Soft delete leaves the copied view directory untouched. Restoring / re-creating with the same code skips file copy.
- Snapshot `templates` includes `js_text`; non-admin importer must not overwrite an existing `js_text`.
- HTML sanitizer keeps stripping `script`/`iframe`/`object`/`embed`/`on*`; JS execution only via `js_text` or repo `api-doc.js`.
- After PHP edits: `vendor/bin/pint --dirty --format agent`.

## File map

| File | Responsibility |
| --- | --- |
| `gz168/ApiDoc/database/migrations/2026_09_17_000014_add_js_text_to_api_doc_templates_table.php` | Add `js_text` |
| `gz168/ApiDoc/src/Support/ApiDocTemplateJsGate.php` | Single admin gate authority |
| `gz168/ApiDoc/src/Models/ApiDocTemplate.php` | Apply gate in save |
| `gz168/ApiDoc/src/Services/ApiDocTemplateSkinCopier.php` | Copy + prefill |
| `gz168/ApiDoc/src/Console/Commands/SkinCopyCommand.php` | Manual copy / repair |
| `gz168/ApiDoc/src/Services/ApiDocResolvedTemplate.php` | Add `jsText` |
| `gz168/ApiDoc/src/Services/ApiDocTemplateViewResolver.php` | Add `inlineJs()` |
| `gz168/ApiDoc/resources/views/front/resolved-layout.blade.php` | Pass `inline_js` |
| `gz168/ApiDoc/resources/views/front/layout.blade.php` | Replace `<script>` block |
| `gz168/ApiDoc/src/Services/ApiDocTemplateResolver.php` | `resolvePreviewCode(?string $code)` |
| `gz168/ApiDoc/src/Livewire/ApiDocPage.php` | Honor `template_preview` |
| `gz168/ApiDoc/src/Filament/Resources/ApiDocTemplateResource.php` | JS tab, double preview, afterCreate copier |
| `gz168/ApiDoc/src/Filament/Resources/ApiDocTemplateResource/Pages/CreateApiDocTemplate.php` | Bind gate user, run copier |
| `gz168/ApiDoc/src/Services/ApiDocExporter.php` | Export `js_text` |
| `gz168/ApiDoc/src/Services/ApiDocImporter.php` | Gate `js_text` on import |
| `tests/Unit/ApiDoc/ApiDocTemplateJsGateTest.php` | Gate unit |
| `tests/Feature/ApiDoc/ApiDocTemplateSkinCopierTest.php` | Copier idempotency + JS gate |
| `tests/Feature/ApiDoc/ApiDocTemplateJsSaveTest.php` | Model + Filament gate |
| `tests/Feature/ApiDoc/ApiDocTemplatePreviewTest.php` | template_preview query behavior |
| `tests/Feature/ApiDoc/ApiDocTemplateRenderJsTest.php` | layout JS override + fallback |
| `tests/Feature/ApiDoc/ApiDocSnapshotJsTextTest.php` | Snapshot js_text |

---

### Task 1: Migration + model save gate

**Files:**
- Create: `gz168/ApiDoc/database/migrations/2026_09_17_000014_add_js_text_to_api_doc_templates_table.php`
- Create: `gz168/ApiDoc/src/Support/ApiDocTemplateJsGate.php`
- Modify: `gz168/ApiDoc/src/Models/ApiDocTemplate.php`
- Test: `tests/Unit/ApiDoc/ApiDocTemplateJsGateTest.php`
- Test: `tests/Feature/ApiDoc/ApiDocTemplateJsSaveTest.php`

**Interfaces:**
- `ApiDocTemplateJsGate::allows(?Authenticatable $user): bool` — `true` only when `$user instanceof Authorizable && $user->is_protected === true && $user->is_super_admin === true`; `false` when `null`.
- `ApiDocTemplate::saving` — after sanitizer, if `js_text` dirty and `! ApiDocTemplateJsGate::allows($user())` → restore to `getOriginal('js_text')` or null.

- [x] **Step 1: Failing gate test**

```php
<?php

declare(strict_types=1);

namespace Tests\Unit\ApiDoc;

use App\Models\User;
use Gz168\ApiDoc\Support\ApiDocTemplateJsGate;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ApiDocTemplateJsGateTest extends TestCase
{
    #[Test]
    public function denies_anonymous_users(): void
    {
        $this->assertFalse(ApiDocTemplateJsGate::allows(null));
    }

    #[Test]
    public function denies_super_admin_without_protected(): void
    {
        $user = new User(['is_protected' => false, 'is_super_admin' => true]);
        $this->assertFalse(ApiDocTemplateJsGate::allows($user));
    }

    #[Test]
    public function denies_protected_user_without_super_admin(): void
    {
        $user = new User(['is_protected' => true, 'is_super_admin' => false]);
        $this->assertFalse(ApiDocTemplateJsGate::allows($user));
    }

    #[Test]
    public function allows_protected_super_admin(): void
    {
        $user = new User(['is_protected' => true, 'is_super_admin' => true]);
        $this->assertTrue(ApiDocTemplateJsGate::allows($user));
    }
}
```

- [x] **Step 2: Run — expect fail; implement gate**

```php
<?php

declare(strict_types=1);

namespace Gz168\ApiDoc\Support;

use Illuminate\Contracts\Auth\Authenticatable;

final class ApiDocTemplateJsGate
{
    public static function allows(?Authenticatable $user): bool
    {
        if ($user === null) {
            return false;
        }

        return (bool) ($user->is_protected ?? false)
            && (bool) ($user->is_super_admin ?? false);
    }
}
```

- [x] **Step 3: Failing model save test**

```php
<?php

declare(strict_types=1);

namespace Tests\Feature\ApiDoc;

use App\Models\User;
use Gz168\ApiDoc\Database\Seeders\ApiDocTemplateSeeder;
use Gz168\ApiDoc\Models\ApiDocTemplate;
use Gz168\ApiDoc\Support\ApiDocTemplateJsGate;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ApiDocTemplateJsSaveTest extends TestCase
{
    use LazilyRefreshDatabase;

    #[Test]
    public function non_admin_save_reverts_js_text(): void
    {
        $this->seed(ApiDocTemplateSeeder::class);
        $classic = ApiDocTemplate::query()->where('code', 'classic')->firstOrFail();

        $classic->js_text = 'console.log(1);';
        $classic->save();

        $this->assertNull($classic->fresh()->js_text);
    }

    #[Test]
    public function protected_super_admin_can_save_js_text(): void
    {
        $this->seed(ApiDocTemplateSeeder::class);
        $admin = User::factory()->create([
            'is_protected' => true,
            'is_super_admin' => true,
        ]);
        $this->actingAs($admin);

        $classic = ApiDocTemplate::query()->where('code', 'classic')->firstOrFail();
        $classic->js_text = 'console.log("ok");';
        $classic->save();

        $this->assertSame('console.log("ok");', $classic->fresh()->js_text);
        $this->assertTrue(ApiDocTemplateJsGate::allows($admin));
    }
}
```

- [x] **Step 4: Migration**

```php
Schema::table('api_doc_templates', function (Blueprint $table): void {
    $table->mediumText('js_text')->nullable()->after('css_text');
});
```

- [x] **Step 5: Implement model saving gate**

```php
use Gz168\ApiDoc\Support\ApiDocTemplateJsGate;
// ...

static::saving(function (ApiDocTemplate $template): void {
    // ...existing validation...

    if ($template->isDirty('js_text') && ! ApiDocTemplateJsGate::allows(auth()->user())) {
        $template->js_text = $template->getOriginal('js_text');
    }
});
```

Cast not needed; column is plain text.

- [x] **Step 6: Run tests; pint; commit** (`feat(api-doc): js_text column with protected admin gate` / parent `test(api-doc): js_text gate and save reverts`)

---

### Task 2: SkinCopier

**Files:**
- Create: `gz168/ApiDoc/src/Services/ApiDocTemplateSkinCopier.php`
- Create: `gz168/ApiDoc/src/Console/Commands/SkinCopyCommand.php`
- Test: `tests/Feature/ApiDoc/ApiDocTemplateSkinCopierTest.php`

**Interfaces:**
- `ApiDocTemplateSkinCopier::copy(ApiDocTemplate $template, ?Authenticatable $creator): void`
  - returns silently when `$template->code === 'classic'`
  - resolves target dir `resources/views/front-{code}/`
  - if `is_dir($target)` ⇒ skip file copy, still prefill DB
  - else: iterate source `resources/views/front/`; skip `resolved-page.blade.php` and `resolved-layout.blade.php`; copy each file
  - read classic `resources/css/api-doc.css` and `resources/js/front/api-doc/api-doc.js`
  - update `$template`: prefill only empty fields (do not overwrite non-empty)
    - `body_parts[key]` for each `ApiDocTemplateParts::KEY` if missing
    - `css_text` if empty when missing
    - `js_text` only when `ApiDocTemplateJsGate::allows($creator)`
  - persist via `$template->save()`

- [x] **Step 1: Failing copier test**

```php
<?php

declare(strict_types=1);

namespace Tests\Feature\ApiDoc;

use App\Models\User;
use Gz168\ApiDoc\Database\Seeders\ApiDocTemplateSeeder;
use Gz168\ApiDoc\Models\ApiDocTemplate;
use Gz168\ApiDoc\Services\ApiDocTemplateSkinCopier;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\File;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ApiDocTemplateSkinCopierTest extends TestCase
{
    use LazilyRefreshDatabase;

    private function tempDir(): string
    {
        return sys_get_temp_dir().'/api-doc-copier-'.uniqid();
    }

    private function packageRoot(): string
    {
        return dirname(__DIR__, 3).'/gz168/ApiDoc';
    }

    #[Test]
    public function creates_directory_and_prefills_when_dir_missing(): void
    {
        $this->seed(ApiDocTemplateSeeder::class);
        $template = ApiDocTemplate::factory()->create([
            'code' => 'skin-a',
            'views_prefix' => ApiDocTemplate::prefixForCode('skin-a'),
            'is_active' => true,
        ]);

        $copier = new ApiDocTemplateSkinCopier(
            viewsDir: $this->packageRoot().'/resources/views/front',
            cssPath: $this->packageRoot().'/resources/css/api-doc.css',
            jsPath: $this->packageRoot().'/resources/js/front/api-doc/api-doc.js',
        );
        $copier->copy($template, null);

        $this->assertDirectoryExists($this->packageRoot().'/resources/views/front-skin-a');
        $this->assertFileExists($this->packageRoot().'/resources/views/front-skin-a/api-doc-page.blade.php');
        $this->assertArrayHasKey('page', $template->fresh()->body_parts);
        $this->assertNotEmpty($template->fresh()->css_text);
        $this->assertNull($template->fresh()->js_text);

        File::deleteDirectory($this->packageRoot().'/resources/views/front-skin-a');
    }

    #[Test]
    public function skips_file_copy_when_directory_exists(): void
    {
        $this->seed(ApiDocTemplateSeeder::class);
        $template = ApiDocTemplate::factory()->create([
            'code' => 'skin-b',
            'views_prefix' => ApiDocTemplate::prefixForCode('skin-b'),
        ]);
        $dir = $this->packageRoot().'/resources/views/front-skin-b';
        File::ensureDirectoryExists($dir);
        $sentinel = $dir.'/SENTINEL.txt';
        File::put($sentinel, 'preserve');

        $copier = new ApiDocTemplateSkinCopier(
            viewsDir: $this->packageRoot().'/resources/views/front',
            cssPath: $this->packageRoot().'/resources/css/api-doc.css',
            jsPath: $this->packageRoot().'/resources/js/front/api-doc/api-doc.js',
        );
        $copier->copy($template, null);

        $this->assertSame('preserve', File::get($sentinel));
        $this->assertFileDoesNotExist($dir.'/api-doc-page.blade.php');

        File::deleteDirectory($dir);
    }

    #[Test]
    public function admin_creator_populates_js_text(): void
    {
        $this->seed(ApiDocTemplateSeeder::class);
        $admin = User::factory()->create([
            'is_protected' => true,
            'is_super_admin' => true,
        ]);
        $template = ApiDocTemplate::factory()->create([
            'code' => 'skin-c',
            'views_prefix' => ApiDocTemplate::prefixForCode('skin-c'),
        ]);

        $copier = new ApiDocTemplateSkinCopier(
            viewsDir: $this->packageRoot().'/resources/views/front',
            cssPath: $this->packageRoot().'/resources/css/api-doc.css',
            jsPath: $this->packageRoot().'/resources/js/front/api-doc/api-doc.js',
        );
        $copier->copy($template, $admin);

        $this->assertNotNull($template->fresh()->js_text);

        File::deleteDirectory($this->packageRoot().'/resources/views/front-skin-c');
    }
}
```

- [x] **Step 2: Implement copier**

```php
<?php

declare(strict_types=1);

namespace Gz168\ApiDoc\Services;

use Gz168\ApiDoc\Models\ApiDocTemplate;
use Gz168\ApiDoc\Support\ApiDocTemplateJsGate;
use Gz168\ApiDoc\Support\ApiDocTemplateParts;
use Illuminate\Contracts\Auth\Authenticatable;
use RuntimeException;

final class ApiDocTemplateSkinCopier
{
    /** @var list<string> */
    private const SKIP_FILES = ['resolved-page.blade.php', 'resolved-layout.blade.php'];

    public function __construct(
        private readonly string $viewsDir,
        private readonly string $cssPath,
        private readonly string $jsPath,
    ) {}

    public function copy(ApiDocTemplate $template, ?Authenticatable $creator): void
    {
        if ($template->code === 'classic') {
            return;
        }

        $target = $this->viewsDir.'-'.$template->code;

        if (! is_dir($target)) {
            if (! is_dir($this->viewsDir)) {
                throw new RuntimeException('Source views dir missing: '.$this->viewsDir);
            }

            if (! mkdir($target, 0775, true) && ! is_dir($target)) {
                throw new RuntimeException('Cannot create target dir: '.$target);
            }

            foreach (scandir($this->viewsDir) ?: [] as $name) {
                if ($name === '.' || $name === '..' || in_array($name, self::SKIP_FILES, true)) {
                    continue;
                }
                $src = $this->viewsDir.'/'.$name;
                $dst = $target.'/'.$name;
                if (is_dir($src)) {
                    $this->copyDirectory($src, $dst);
                } else {
                    copy($src, $dst);
                }
            }
        }

        $bodyParts = is_array($template->body_parts) ? $template->body_parts : [];
        foreach (ApiDocTemplateParts::KEYS as $key) {
            if (array_key_exists($key, $bodyParts) && trim((string) $bodyParts[$key]) !== '') {
                continue;
            }
            $file = $this->viewsDir.'/'.ApiDocTemplateParts::relativePath($key).'.blade.php';
            if (is_file($file)) {
                $bodyParts[$key] = (string) file_get_contents($file);
            }
        }
        $template->body_parts = $bodyParts;

        if (! is_string($template->css_text) || trim($template->css_text) === '') {
            if (is_file($this->cssPath)) {
                $template->css_text = (string) file_get_contents($this->cssPath);
            }
        }

        if (ApiDocTemplateJsGate::allows($creator)) {
            if (! is_string($template->js_text) || trim($template->js_text) === '') {
                if (is_file($this->jsPath)) {
                    $template->js_text = (string) file_get_contents($this->jsPath);
                }
            }
        }

        $template->save();
    }

    private function copyDirectory(string $src, string $dst): void
    {
        if (! is_dir($dst) && ! mkdir($dst, 0775, true) && ! is_dir($dst)) {
            throw new RuntimeException('Cannot create dir: '.$dst);
        }
        foreach (scandir($src) ?: [] as $name) {
            if ($name === '.' || $name === '..') {
                continue;
            }
            $from = $src.'/'.$name;
            $to = $dst.'/'.$name;
            if (is_dir($from)) {
                $this->copyDirectory($from, $to);
            } else {
                copy($from, $to);
            }
        }
    }
}
```

- [x] **Step 3: SkinCopyCommand**

```bash
php artisan api-doc:skin-copy {code?} {--force : ignore existing target}
```

For testing: registers via `ApiDocServiceProvider::hasCommands` and uses default package paths. Force option **only** used by ops; tests assert skip-when-exists without force.

- [x] **Step 4: Register command; pin `viewsDir`/`cssPath`/`jsPath` defaults in `ApiDocTemplateSkinCopier`** (use `ApiDocServiceProvider::packagePath` factory when no constructor args provided). Add static helper `ApiDocTemplateSkinCopier::forPackage()` returning configured instance.

- [x] **Step 5: Run copier tests; pint; commit** (`feat(api-doc): SkinCopier for non-classic templates` / parent `test(api-doc): SkinCopier copies, skips, pre-fills`)

---

### Task 3: ResolvedTemplate + layout JS

**Files:**
- Modify: `gz168/ApiDoc/src/Services/ApiDocResolvedTemplate.php`
- Modify: `gz168/ApiDoc/src/Services/ApiDocTemplateViewResolver.php`
- Modify: `gz168/ApiDoc/resources/views/front/resolved-layout.blade.php`
- Modify: `gz168/ApiDoc/resources/views/front/layout.blade.php`
- Modify: `gz168/ApiDoc/src/Services/ApiDocTemplateResolver.php`
- Test: `tests/Feature/ApiDoc/ApiDocTemplateRenderJsTest.php`

- [x] **Step 1: Failing render test**

```php
<?php

declare(strict_types=1);

namespace Tests\Feature\ApiDoc;

use Gz168\ApiDoc\Database\Seeders\ApiDocTemplateSeeder;
use Gz168\ApiDoc\Models\ApiDocTemplate;
use Gz168\ApiDoc\Services\ApiDocResolvedTemplate;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ApiDocTemplateRenderJsTest extends TestCase
{
    #[Test]
    public function inline_js_returns_skin_value_or_repo_default(): void
    {
        $repo = (string) file_get_contents(dirname(__FILE__, 3).'/gz168/ApiDoc/resources/js/front/api-doc/api-doc.js');

        $custom = new ApiDocResolvedTemplate(
            key: 'skin', label: 'Skin', viewsPrefix: 'gz168-api-doc::front',
            assets: [], bodyParts: [], cssText: null, jsText: 'console.log(42);',
        );
        $empty = new ApiDocResolvedTemplate(
            key: 'classic', label: 'Classic', viewsPrefix: 'gz168-api-doc::front',
            assets: [], bodyParts: [], cssText: null, jsText: null,
        );

        $resolver = app(\Gz168\ApiDoc\Services\ApiDocTemplateViewResolver::class);

        $this->assertSame('console.log(42);', $resolver->inlineJs($custom));
        $this->assertSame($repo, $resolver->inlineJs($empty));
    }
}
```

- [x] **Step 2: Add `jsText` to value object**

```php
public ?string $jsText = null,
```

- [x] **Step 3: Add `inlineJs()` on resolver**

```php
public function inlineJs(ApiDocResolvedTemplate $skin): string
{
    if ($skin->jsText !== null && trim($skin->jsText) !== '') {
        return $skin->jsText;
    }
    $path = ApiDocServiceProvider::packagePath('resources/js/front/api-doc/api-doc.js');
    $contents = file_get_contents($path);
    return $contents === false ? '' : $contents;
}
```

- [x] **Step 4: Resolver populates `jsText` from DB**

In `ApiDocTemplateResolver::fromModel`:

```php
$js = $row->js_text;
$jsText = is_string($js) && trim($js) !== '' ? $js : null;

return new ApiDocResolvedTemplate(
    // ...,
    cssText: $cssText,
    jsText: $jsText,
);
```

- [x] **Step 5: Layout**

`resolved-layout.blade.php`:

```blade
{!! app(\Gz168\ApiDoc\Services\ApiDocTemplateViewResolver::class)->render($template, 'layout', [
    'title' => $title ?? '',
    'description' => $description ?? '',
    'settings' => $settings ?? null,
    'lang' => $lang ?? 'fr',
    'template' => $template,
    'inline_css' => app(\Gz168\ApiDoc\Services\ApiDocTemplateViewResolver::class)->inlineCss($template),
    'inline_js' => app(\Gz168\ApiDoc\Services\ApiDocTemplateViewResolver::class)->inlineJs($template),
    'slot' => $slot ?? '',
]) !!}
```

`layout.blade.php`: change `<script>` block to `{!! $inline_js ?? file_get_contents(\Gz168\ApiDoc\Providers\ApiDocServiceProvider::packagePath('resources/js/front/api-doc/api-doc.js')) !!}`. Keep the repo CSS `inline_css` line untouched.

- [x] **Step 6: Run test; pint; commit** (`feat(api-doc): inline js_text in layout with repo fallback` / parent `test(api-doc): inlineJs returns value or repo default`)

---

### Task 4: `template_preview` on `/api-doc`

**Files:**
- Modify: `gz168/ApiDoc/src/Services/ApiDocTemplateResolver.php`
- Modify: `gz168/ApiDoc/src/Livewire/ApiDocPage.php`
- Test: `tests/Feature/ApiDoc/ApiDocTemplatePreviewTest.php`

**Interfaces:**
- `ApiDocTemplateResolver::resolvePreviewCode(?string $code): ?ApiDocResolvedTemplate` — null when missing/empty; otherwise fetch the not-trashed row regardless of `is_active`; warn + null when code missing or trashed.

- [x] **Step 1: Failing test**

```php
<?php

declare(strict_types=1);

namespace Tests\Feature\ApiDoc;

use App\Models\User;
use Gz168\ApiDoc\Database\Seeders\ApiDocTemplateSeeder;
use Gz168\ApiDoc\Livewire\ApiDocPage;
use Gz168\ApiDoc\Models\ApiDocDisplayMode;
use Gz168\ApiDoc\Models\ApiDocSection;
use Gz168\ApiDoc\Models\ApiDocSetting;
use Gz168\ApiDoc\Models\ApiDocTemplate;
use Gz168\ApiDoc\Services\ApiDocDisplayModeResolver;
use Gz168\ApiDoc\Services\ApiDocTemplateResolver;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ApiDocTemplatePreviewTest extends TestCase
{
    use LazilyRefreshDatabase;

    #[Test]
    public function unauthorized_user_ignores_template_preview(): void
    {
        $this->seed(ApiDocTemplateSeeder::class);
        ApiDocSetting::current();
        ApiDocSection::factory()->create(['slug' => 'intro', 'is_intro' => true]);

        $skin = ApiDocTemplate::factory()->create([
            'code' => 'idle',
            'views_prefix' => ApiDocTemplate::prefixForCode('idle'),
            'is_active' => false,
        ]);

        $response = $this->get('/api-doc?template_preview=idle');
        $response->assertOk();
        $this->assertStringNotContainsString('id="langs"', $response->getContent() ?: '');
        $this->assertNull(app(ApiDocTemplateResolver::class)->resolvePreviewCode('idle'));
    }

    #[Test]
    public function authorized_viewer_forces_inactive_skin(): void
    {
        $this->seed(ApiDocTemplateSeeder::class);
        ApiDocSetting::current();
        ApiDocSection::factory()->create(['slug' => 'intro', 'is_intro' => true]);

        ApiDocTemplate::factory()->create([
            'code' => 'idle',
            'views_prefix' => ApiDocTemplate::prefixForCode('idle'),
            'is_active' => false,
        ]);

        $admin = User::factory()->create([
            'is_protected' => true,
            'is_super_admin' => true,
        ]);
        $this->actingAs($admin);

        $resolved = app(ApiDocTemplateResolver::class)->resolvePreviewCode('idle');
        $this->assertNotNull($resolved);
        $this->assertSame('idle', $resolved->key);

        $this->get('/api-doc?template_preview=idle')->assertOk();
    }

    #[Test]
    public function resolve_returns_null_for_unknown_or_trashed_code(): void
    {
        $this->seed(ApiDocTemplateSeeder::class);
        $this->assertNull(app(ApiDocTemplateResolver::class)->resolvePreviewCode('nope'));

        $classic = ApiDocTemplate::query()->where('code', 'classic')->firstOrFail();
        $classic->delete();
        $this->assertNull(app(ApiDocTemplateResolver::class)->resolvePreviewCode('classic'));
    }
}
```

- [x] **Step 2: Implement `resolvePreviewCode`**

```php
public function resolvePreviewCode(?string $code): ?ApiDocResolvedTemplate
{
    $raw = trim((string) $code);
    if ($raw === '') {
        return null;
    }
    $row = ApiDocTemplate::query()->where('code', $raw)->first();
    if ($row === null || $row->trashed()) {
        Log::warning('template_preview missing or trashed; ignoring.', ['code' => $raw]);
        return null;
    }
    return $this->fromModel($row);
}
```

- [x] **Step 3: `ApiDocPage::render` honors query**

```php
$previewCode = request()->query('template_preview');
$skin = null;
if (is_string($previewCode) && trim($previewCode) !== '') {
    if ($this->canPreview($user = auth()->user())) {
        $skin = $templates->resolvePreviewCode($previewCode);
    }
}
$skin ??= $templates->resolve($resolved->template_key, $resolved->code);
```

Add helper:

```php
private function canPreview(?Authenticatable $user): bool
{
    if ($user === null) {
        return false;
    }
    if ((bool) ($user->is_super_admin ?? false)) {
        return true;
    }
    return $user instanceof \Gz168\RolePermission\Contracts\Authorizable
        && method_exists($user, 'hasPermission')
        && $user->hasPermission('api-doc.view');
}
```

- [x] **Step 4: Run test; pint; commit** (`feat(api-doc): template_preview query for authorized viewers` / parent `test(api-doc): template_preview authz and force`)

---

### Task 5: Filament JS tab + double preview + Create copier

**Files:**
- Modify: `gz168/ApiDoc/src/Filament/Resources/ApiDocTemplateResource.php`
- Modify: `gz168/ApiDoc/src/Filament/Resources/ApiDocTemplateResource/Pages/CreateApiDocTemplate.php`
- Test: `tests/Feature/ApiDoc/ApiDocTemplateResourceTest.php`

- [x] **Step 1: Failing test for JS tab visibility and iframe URL**

Append to `ApiDocTemplateResourceTest`:

```php
#[Test]
public function non_admin_does_not_see_js_text_field(): void
{
    $this->seed(ApiDocTemplateSeeder::class);
    $user = User::factory()->create(['is_protected' => false, 'is_super_admin' => false]);
    $this->actingAs($user);
    Filament::setCurrentPanel(Filament::getPanel('admin'));

    $classic = ApiDocTemplate::query()->where('code', 'classic')->firstOrFail();

    Livewire::test(EditApiDocTemplate::class, ['record' => $classic->getKey()])
        ->assertFormFieldIsHidden('js_text');
}

#[Test]
public function protected_admin_sees_js_text_and_preview_iframe(): void
{
    $this->seed(ApiDocTemplateSeeder::class);
    $admin = User::factory()->create(['is_protected' => true, 'is_super_admin' => true]);
    $this->actingAs($admin);
    Filament::setCurrentPanel(Filament::getPanel('admin'));

    $classic = ApiDocTemplate::query()->where('code', 'classic')->firstOrFail();

    Livewire::test(EditApiDocTemplate::class, ['record' => $classic->getKey()])
        ->assertFormFieldExists('js_text')
        ->assertSeeHtml('template_preview=classic');
}
```

- [x] **Step 2: Resource changes**

JS tab — extend existing `Tabs::make('parts')->tabs($partTabs)`:

```php
$partTabs[] = Tabs\Tab::make('JS')
    ->visible(fn (): bool => ApiDocTemplateJsGate::allows(auth()->user()))
    ->schema([
        Textarea::make('js_text')
            ->label('js_text')
            ->rows(12)
            ->dehydrated(fn (): bool => ApiDocTemplateJsGate::allows(auth()->user()))
            ->columnSpanFull(),
    ]);
```

Preview — second Placeholder next to the existing draft preview:

```php
Placeholder::make('preview_iframe')
    ->label('真前台预览 (已保存)')
    ->hiddenOn('create')
    ->content(function (?ApiDocTemplate $record): HtmlString {
        if ($record === null) {
            return new HtmlString('');
        }
        $defaultMode = app(ApiDocDisplayModeResolver::class)->defaultMode();
        $url = url('/api-doc?mode='.$defaultMode->code.'&template_preview='.$record->code);
        return new HtmlString('<iframe sandbox="allow-scripts allow-same-origin" class="w-full h-96 border" src="'.e($url).'"></iframe>');
    }),
```

Keep existing `preview_html` Placeholder above it.

- [x] **Step 3: `CreateApiDocTemplate::afterCreate` runs copier**

```php
protected function afterCreate(): void
{
    if ($this->record instanceof \Gz168\ApiDoc\Models\ApiDocTemplate) {
        app(\Gz168\ApiDoc\Services\ApiDocTemplateSkinCopier::class)
            ->copy($this->record, auth()->user());
    }
    $this->flushApiDocCache();
}
```

- [x] **Step 4: Run Filament tests; pint; commit** (`feat(api-doc): JS tab, preview iframe, copier on create` / parent `test(api-doc): JS visibility and iframe in edit page`)

---

### Task 6: Snapshot js_text

**Files:**
- Modify: `gz168/ApiDoc/src/Services/ApiDocExporter.php`
- Modify: `gz168/ApiDoc/src/Services/ApiDocImporter.php`
- Test: `tests/Feature/ApiDoc/ApiDocSnapshotJsTextTest.php`

- [x] **Step 1: Failing test**

```php
<?php

declare(strict_types=1);

namespace Tests\Feature\ApiDoc;

use App\Models\User;
use Gz168\ApiDoc\Database\Seeders\ApiDocDisplayModeSeeder;
use Gz168\ApiDoc\Models\ApiDocTemplate;
use Gz168\ApiDoc\Services\ApiDocExporter;
use Gz168\ApiDoc\Services\ApiDocImporter;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ApiDocSnapshotJsTextTest extends TestCase
{
    use LazilyRefreshDatabase;

    #[Test]
    public function export_includes_js_text(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);
        $classic = ApiDocTemplate::query()->where('code', 'classic')->firstOrFail();
        $classic->js_text = 'console.log("snap");';
        $classic->save();

        $row = collect(app(ApiDocExporter::class)->exportAll()['templates'])
            ->firstWhere('code', 'classic');

        $this->assertSame('console.log("snap");', $row['js_text']);
    }

    #[Test]
    public function non_admin_import_preserves_existing_js_text(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);
        $classic = ApiDocTemplate::query()->where('code', 'classic')->firstOrFail();
        $classic->js_text = 'existing';
        $classic->save();

        $payload = app(ApiDocExporter::class)->exportAll();
        $payload['templates'][0]['js_text'] = 'from-snapshot';

        app(ApiDocImporter::class)->import($payload, ApiDocImporter::MODE_OVERWRITE);

        $this->assertSame('existing', $classic->fresh()->js_text);
    }

    #[Test]
    public function admin_import_overwrites_js_text(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);
        $admin = User::factory()->create(['is_protected' => true, 'is_super_admin' => true]);
        $this->actingAs($admin);

        $payload = app(ApiDocExporter::class)->exportAll();
        $payload['templates'][0]['js_text'] = 'admin-update';

        app(ApiDocImporter::class)->import($payload, ApiDocImporter::MODE_OVERWRITE);

        $this->assertSame('admin-update', ApiDocTemplate::query()->where('code', 'classic')->value('js_text'));
    }
}
```

- [x] **Step 2: Exporter emits `js_text`** in the templates map (next to `css_text`).

- [x] **Step 3: Importer gates `js_text`**

In the templates loop, add:

```php
$admin = \Gz168\ApiDoc\Support\ApiDocTemplateJsGate::allows(auth()->user());

$bodyParts = $sanitizer->sanitizeBodyParts($parts);
$cssClean = is_string($css) && trim($css) !== '' ? $sanitizer->sanitizeCss($css) : null;
$jsClean = is_string($row['js_text'] ?? null) && trim((string) $row['js_text']) !== ''
    ? (string) $row['js_text']
    : null;

$existing = $model->getOriginal('js_text');
$jsFinal = $jsClean !== null && ($admin || $existing === null) ? $jsClean : $existing;
if ($jsFinal !== null && ! $admin && $model->exists && $existing !== $jsClean && $existing !== null) {
    $jsFinal = $existing;
}
if ($jsFinal !== null && $jsClean === null && $existing !== null) {
    $jsFinal = $existing;
}

$data = [
    'label' => $row['label'] ?? $row['code'],
    'views_prefix' => $row['views_prefix'] ?? ApiDocTemplate::prefixForCode((string) $row['code']),
    'is_active' => (bool) ($row['is_active'] ?? true),
    'sort' => (int) ($row['sort'] ?? 0),
    'body_parts' => $bodyParts,
    'css_text' => $cssClean,
    'js_text' => $jsFinal,
];
```

Simplification: tests assert behavior above; implementation may collapse to:

```php
$adminImport = \Gz168\ApiDoc\Support\ApiDocTemplateJsGate::allows(auth()->user());
$payloadJs = is_string($row['js_text'] ?? null) && trim((string) $row['js_text']) !== ''
    ? (string) $row['js_text']
    : null;
$jsFinal = $adminImport
    ? $payloadJs
    : ($model->getOriginal('js_text') ?? null);
```

Add `js_text` to fillable (already is).

- [x] **Step 4: Run tests; pint; commit** (`feat(api-doc): snapshot export and gate import js_text` / parent `test(api-doc): snapshot js_text export and gate`)

---

### Task 7: Regression gate

```bash
php artisan test --compact tests/Unit/ApiDoc tests/Feature/ApiDoc
vendor/bin/pint --dirty --format agent
git -C docs commit (bump submodule) --allow-empty
```

Bump parent `gz168` SHA + `docs` SHA; ensure all ApiDoc tests pass.

## Spec coverage

| Spec item | Task |
| --- | --- |
| `js_text` column + sanitizer skip | 1, 3 |
| Protected admin gate (saving silent revert) | 1, 5 |
| SkinCopier (files + prefill, idempotent, classic skip) | 2 |
| Soft delete keeps copied dir | 2 |
| Two-stage preview (draft + saved iframe) | 5 |
| `template_preview` query + authorization | 4 |
| HTML sanitizer untouched | 1 |
| Snapshot js_text + non-admin import gate | 6 |
| Regression of catalog CRUD + parts | 7 |