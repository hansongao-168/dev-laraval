# ApiDoc Dev Editor (Repo Files) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give protected super admins a Filament page to browse and overwrite whitelist-scoped ApiDoc repo files (front views/css/js + app `html/`), with strict path checks and cache flush on save.

**Architecture:** `config('api-doc.dev_editor')` defines roots/extensions. `ApiDocDevEditorService` resolves `package:` / `base:` roots, lists a filtered tree, and reads/writes only after `realpath` confinement. `ApiDocDevEditorPage` is Filament-only for `ApiDocTemplateJsGate::allows` users when enabled.

**Tech Stack:** Laravel 13, Filament 5, Livewire 4, PHP 8.5, PHPUnit 12, module `gz168/ApiDoc`.

**Spec:** `docs/dev-laraval/superpowers/specs/2026-09-17-apidoc-dev-editor-design.md`

## Global Constraints

- Only protected super admins (`ApiDocTemplateJsGate::allows`).
- No git commit; no DB↔file sync; no sanitizer on write.
- Path escape (`..`, absolute, symlink out of root, wrong extension, oversize) must fail without writing.
- Tests use a temp fixture root via config override — never write into the real package during tests.
- After PHP edits: `vendor/bin/pint --dirty --format agent`.

## File map

| File | Responsibility |
| --- | --- |
| `gz168/ApiDoc/config/api-doc.php` | `dev_editor` config |
| `gz168/ApiDoc/src/Services/ApiDocDevEditorService.php` | list / read / write / resolve |
| `gz168/ApiDoc/src/Filament/Pages/ApiDocDevEditorPage.php` | Filament page |
| `gz168/ApiDoc/resources/views/filament/pages/dev-editor.blade.php` | UI |
| `tests/Unit/ApiDoc/ApiDocDevEditorServiceTest.php` | path + IO |
| `tests/Feature/ApiDoc/ApiDocDevEditorPageTest.php` | access + save flush |

---

### Task 1: Config + DevEditorService

**Files:**
- Modify: `gz168/ApiDoc/config/api-doc.php`
- Create: `gz168/ApiDoc/src/Services/ApiDocDevEditorService.php`
- Test: `tests/Unit/ApiDoc/ApiDocDevEditorServiceTest.php`

**Interfaces:**
```php
final class ApiDocDevEditorService
{
    /** @return list<array{key:string,label:string}> */
    public function roots(): array;

    /** @return list<array{path:string,type:'file'|'dir',children?:array}> */
    public function listTree(string $rootKey): array;

    public function read(string $rootKey, string $relative): string;

    public function write(string $rootKey, string $relative, string $contents): void;
}
```

- [ ] **Step 1: Append config** (exact keys from spec §2), including `views-skins` with `only_prefix` => `front-`.

- [ ] **Step 2: Failing unit tests** using `sys_get_temp_dir()` fixture:

```php
<?php

declare(strict_types=1);

namespace Tests\Unit\ApiDoc;

use Gz168\ApiDoc\Services\ApiDocCacheManager;
use Gz168\ApiDoc\Services\ApiDocDevEditorService;
use Illuminate\Support\Facades\File;
use Mockery;
use PHPUnit\Framework\Attributes\Test;
use RuntimeException;
use Tests\TestCase;

class ApiDocDevEditorServiceTest extends TestCase
{
    private string $tmp;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tmp = sys_get_temp_dir().'/api-doc-dev-editor-'.uniqid();
        File::ensureDirectoryExists($this->tmp.'/front');
        File::put($this->tmp.'/front/demo.blade.php', '<div>hi</div>');
        File::put($this->tmp.'/front/skip.txt', 'nope');
        config([
            'api-doc.dev_editor' => [
                'enabled' => true,
                'max_bytes' => 1024,
                'extensions' => ['blade.php', 'css', 'js', 'md', 'html'],
                'roots' => [
                    ['key' => 'fixture', 'label' => 'Fixture', 'path' => 'absolute:'.$this->tmp],
                ],
            ],
        ]);
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->tmp);
        parent::tearDown();
    }

    #[Test]
    public function rejects_path_traversal(): void
    {
        $this->expectException(RuntimeException::class);
        app(ApiDocDevEditorService::class)->read('fixture', '../front/demo.blade.php');
    }

    #[Test]
    public function rejects_bad_extension(): void
    {
        $this->expectException(RuntimeException::class);
        app(ApiDocDevEditorService::class)->read('fixture', 'front/skip.txt');
    }

    #[Test]
    public function reads_and_writes_allowed_file_and_flushes_cache(): void
    {
        $cache = Mockery::mock(ApiDocCacheManager::class);
        $cache->shouldReceive('flush')->once();
        $this->app->instance(ApiDocCacheManager::class, $cache);

        $svc = app(ApiDocDevEditorService::class);
        $this->assertSame('<div>hi</div>', $svc->read('fixture', 'front/demo.blade.php'));
        $svc->write('fixture', 'front/demo.blade.php', '<div>yo</div>');
        $this->assertSame('<div>yo</div>', File::get($this->tmp.'/front/demo.blade.php'));
    }
}
```

Support an extra path scheme in the service for tests only: `absolute:` → raw absolute path (document in PHPDoc; production config uses only `package:` / `base:`).

- [ ] **Step 3: Implement service**

Key logic:
- Resolve root absolute path from `package:` / `base:` / `absolute:`.
- Extension check: longest matching suffix from config list.
- `normalizeRelative`: reject empty, leading `/`, `\`, or any `..` segment.
- `assertContained($rootReal, $targetReal)`.
- `listTree`: recursive; if root has `only_prefix`, only include top-level dirs starting with that prefix (and their descendants); filter files by extension.
- `write`: enforce max_bytes; `file_put_contents`; then `app(ApiDocCacheManager::class)->flush()`.

- [ ] **Step 4: Run unit tests; pint; commit**

gz168: `feat(api-doc): DevEditorService with rooted path safety`  
parent: `test(api-doc): DevEditorService path checks and IO`

---

### Task 2: Filament Dev Editor page

**Files:**
- Create: `gz168/ApiDoc/src/Filament/Pages/ApiDocDevEditorPage.php`
- Create: `gz168/ApiDoc/resources/views/filament/pages/dev-editor.blade.php`
- Test: `tests/Feature/ApiDoc/ApiDocDevEditorPageTest.php`

- [ ] **Step 1: Failing access test**

```php
#[Test]
public function non_protected_admin_cannot_access_page(): void
{
    $user = User::factory()->make();
    $user->forceFill(['is_protected' => false, 'is_super_admin' => true])->saveQuietly();
    $this->actingAs($user);
    Filament::setCurrentPanel(Filament::getPanel('admin'));

    $this->assertFalse(ApiDocDevEditorPage::canAccess());
}

#[Test]
public function protected_admin_can_access_when_enabled(): void
{
    $user = User::factory()->make();
    $user->forceFill(['is_protected' => true, 'is_super_admin' => true])->saveQuietly();
    $this->actingAs($user);
    Filament::setCurrentPanel(Filament::getPanel('admin'));
    config(['api-doc.dev_editor.enabled' => true]);

    $this->assertTrue(ApiDocDevEditorPage::canAccess());
}
```

- [ ] **Step 2: Implement page**

```php
class ApiDocDevEditorPage extends Page
{
    protected string $view = 'gz168-api-doc::filament.pages.dev-editor';
    protected static ?string $navigationLabel = '开发编辑器';
    protected static ?string $title = '开发编辑器';
    protected static ?int $navigationSort = 95;
    protected static string|UnitEnum|null $navigationGroup = 'API 文档';
    protected static string|BackedEnum|null $navigationIcon = 'heroicon-o-code-bracket';

    public ?string $rootKey = null;
    public ?string $path = null;
    public string $content = '';

    public static function canAccess(): bool
    {
        if (! (bool) config('api-doc.dev_editor.enabled', true)) {
            return false;
        }

        return ApiDocTemplateJsGate::allows(Filament::auth()->user());
    }

    public function mount(ApiDocDevEditorService $editor): void
    {
        $roots = $editor->roots();
        $this->rootKey = $roots[0]['key'] ?? null;
    }

    public function openFile(string $path, ApiDocDevEditorService $editor): void
    {
        $this->path = $path;
        $this->content = $editor->read((string) $this->rootKey, $path);
    }

    public function save(ApiDocDevEditorService $editor): void
    {
        $editor->write((string) $this->rootKey, (string) $this->path, $this->content);
        Notification::make()->title('已保存')->success()->send();
    }
}
```

Blade: root select (wire:model.live), tree list of file paths as buttons calling `openFile`, textarea `wire:model` content, save button. Keep layout simple (two columns with Tailwind already available in Filament).

Discoverable via existing Filament module page discovery (`src/Filament/Pages`).

- [ ] **Step 3: Livewire save test with fixture config** (optional but preferred): set config absolute root, open/save via Livewire::test.

- [ ] **Step 4: Run tests; pint; commit**

gz168: `feat(api-doc): Filament warehouse file dev editor page`  
parent: `test(api-doc): DevEditor page access gate`

---

### Task 3: Regression

```bash
php artisan test --compact tests/Unit/ApiDoc/ApiDocDevEditorServiceTest.php tests/Feature/ApiDoc/ApiDocDevEditorPageTest.php
php artisan test --compact tests/Unit/ApiDoc tests/Feature/ApiDoc
vendor/bin/pint --dirty --format agent
```

## Spec coverage

| Spec item | Task |
| --- | --- |
| config roots/extensions/max_bytes/enabled | 1 |
| package:/base: (+ absolute: for tests) | 1 |
| only_prefix for skin copies | 1 |
| path safety + write + flush | 1 |
| Filament page + JsGate | 2 |
| Regression | 3 |
