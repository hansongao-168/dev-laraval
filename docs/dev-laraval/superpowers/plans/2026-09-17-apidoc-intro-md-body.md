# ApiDoc Intro Markdown Body Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let ApiDoc intro-section paragraphs use Markdown/HTML editors driven by the existing section-level `intro_paras_format`, via a shared `LocalizedBodyFields::makeShared` helper.

**Architecture:** Extend `LocalizedBodyFields` with `makeShared($name, $parentFormatField)` that omits the format Select and reads the parent field through Filament `Get` (Repeater-relative path). Wire `ApiDocSectionResource` intro Repeater to that helper. Keep `ApiDocIntroShape` and front renderer unchanged.

**Tech Stack:** Laravel 13, Filament 5, Livewire 4, PHP 8.5, PHPUnit 12, module `gz168/ApiDoc`.

**Spec:** `docs/dev-laraval/superpowers/specs/2026-09-17-apidoc-intro-md-body-design.md`

## Global Constraints

- Do not change `intro_paras` storage shape or `ApiDocIntroShape`.
- Do not change `make()` behavior for paras/notes/decisions/quickstart/param rows.
- `intro_paras_format` stays section-level; switching format does not convert body text.
- After PHP edits: `vendor/bin/pint --dirty --format agent`.

## File map

| File | Responsibility |
| --- | --- |
| `gz168/ApiDoc/src/Filament/Forms/Components/LocalizedBodyFields.php` | Add `makeShared` |
| `gz168/ApiDoc/src/Filament/Resources/ApiDocSectionResource.php` | Intro Repeater + `live()` on format Select |
| `tests/Feature/ApiDoc/ApiDocIntroMdBodyTest.php` | Filament save → front render |

---

### Task 1: `LocalizedBodyFields::makeShared`

**Files:**
- Modify: `gz168/ApiDoc/src/Filament/Forms/Components/LocalizedBodyFields.php`
- Test: covered by Task 2 feature test (unit optional)

**Interfaces:**
- `make(string $name, string $formatField = 'content_format'): array` — unchanged
- `makeShared(string $name, string $parentFormatField): array` — returns tabs only; visibility reads parent format

- [ ] **Step 1: Implement `makeShared`**

Refactor editor-tab building into a private helper used by both `make` and `makeShared`:

```php
/**
 * Editors only; format comes from a parent form field (e.g. inside a Repeater).
 *
 * @return list<Component>
 */
public static function makeShared(string $name, string $parentFormatField): array
{
    return [
        Tabs::make($name.'_body_tabs')
            ->tabs(self::localeEditorTabs($name, $parentFormatField, fromParent: true))
            ->columnSpanFull(),
    ];
}
```

For `fromParent: true`, visibility closures must resolve the parent field. In Filament Schema `Get` inside a Repeater item, try in order until one works in the Task 2 Livewire test:

1. `$get('../../'.$parentFormatField)`
2. `$get('../'.$parentFormatField)`
3. `$get($parentFormatField)`

Implement a small resolver:

```php
private static function parentFormatIs(Get $get, string $parentFormatField, string $expected): bool
{
    foreach (['../../'.$parentFormatField, '../'.$parentFormatField, $parentFormatField] as $path) {
        $value = $get($path);
        if ($value !== null && $value !== '') {
            return $value === $expected;
        }
    }

    return $expected === ApiDocContentFormat::Markdown->value;
}
```

Keep `make()` using the local `$formatField` path (not parent).

- [ ] **Step 2: Ensure `intro_paras_format` Select is `->live()`** in `ApiDocSectionResource` when touching that file in Task 2.

- [ ] **Step 3: pint** (commit with Task 2 if preferred as one commit, or commit helper alone)

---

### Task 2: Wire intro Repeater + feature test

**Files:**
- Modify: `gz168/ApiDoc/src/Filament/Resources/ApiDocSectionResource.php`
- Create: `tests/Feature/ApiDoc/ApiDocIntroMdBodyTest.php`

- [ ] **Step 1: Failing feature test**

```php
<?php

declare(strict_types=1);

namespace Tests\Feature\ApiDoc;

use App\Models\User;
use Filament\Facades\Filament;
use Gz168\ApiDoc\Database\Seeders\ApiDocDisplayModeSeeder;
use Gz168\ApiDoc\Enums\ApiDocContentFormat;
use Gz168\ApiDoc\Filament\Resources\ApiDocSectionResource\Pages\EditApiDocSection;
use Gz168\ApiDoc\Models\ApiDocSection;
use Gz168\ApiDoc\Models\ApiDocSetting;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Livewire\Livewire;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ApiDocIntroMdBodyTest extends TestCase
{
    use LazilyRefreshDatabase;

    private function actingAsFilamentAdmin(): User
    {
        $admin = User::factory()->make();
        $admin->forceFill([
            'is_protected' => true,
            'is_super_admin' => true,
        ])->saveQuietly();
        $this->actingAs($admin);
        Filament::setCurrentPanel(Filament::getPanel('admin'));

        return $admin;
    }

    #[Test]
    public function intro_markdown_paragraph_renders_on_front(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);
        ApiDocSetting::current();
        $this->actingAsFilamentAdmin();

        $section = ApiDocSection::factory()->create([
            'slug' => 'intro',
            'is_intro' => true,
            'is_active' => true,
            'intro_paras_format' => ApiDocContentFormat::Markdown->value,
            'intro_paras' => [
                ['fr' => 'plain', 'zh' => '', 'en' => ''],
            ],
            'intro_h1' => ['fr' => 'H1', 'zh' => 'H1', 'en' => 'H1'],
        ]);

        Livewire::test(EditApiDocSection::class, ['record' => $section->getKey()])
            ->fillForm([
                'is_intro' => true,
                'intro_paras_format' => ApiDocContentFormat::Markdown->value,
                'intro_paras' => [
                    ['text' => ['fr' => '**bold-intro**', 'zh' => '', 'en' => '']],
                ],
            ])
            ->call('save')
            ->assertHasNoFormErrors();

        $fresh = $section->fresh();
        $this->assertSame('**bold-intro**', $fresh->intro_paras[0]['fr'] ?? null);
        $this->assertSame('markdown', $fresh->intro_paras_format);

        $this->get('/api-doc')
            ->assertOk()
            ->assertDontSee('**bold-intro**', false)
            ->assertSee('bold-intro', false);
    }
}
```

- [ ] **Step 2: Run — expect fail** (still plain LocalizedKeyValue or missing bold render path)

```bash
php artisan test --compact tests/Feature/ApiDoc/ApiDocIntroMdBodyTest.php
```

- [ ] **Step 3: Wire resource**

```php
Select::make('intro_paras_format')
    ->label('介绍段落格式')
    ->options(ApiDocContentFormat::options())
    ->default(ApiDocContentFormat::Markdown->value)
    ->required()
    ->live()
    ->helperText('切换格式不会自动转换正文，请确认内容与所选格式一致。'),
Repeater::make('intro_paras')->label('介绍段落')->schema([
    ...LocalizedBodyFields::makeShared('text', 'intro_paras_format'),
])->addActionLabel('新增段落')->collapsible(),
```

Add `use Gz168\ApiDoc\Filament\Forms\Components\LocalizedBodyFields;` if missing.

- [ ] **Step 4: Fix Get path until test passes**; if Filament dehydrates unexpected keys, adjust fillForm shape only — do not change IntroShape.

- [ ] **Step 5: Run IntroShape unit + this feature test + pint; commit**

gz168: `feat(api-doc): Markdown/HTML editors for intro_paras`  
parent: `test(api-doc): intro markdown body saves and renders`

---

### Task 3: Regression

```bash
php artisan test --compact tests/Unit/ApiDoc/ApiDocIntroShapeTest.php tests/Feature/ApiDoc/ApiDocIntroMdBodyTest.php tests/Feature/ApiDoc/ApiDocSectionWritePathTest.php
vendor/bin/pint --dirty --format agent
```

Optionally full `tests/Unit/ApiDoc tests/Feature/ApiDoc`.

## Spec coverage

| Spec item | Task |
| --- | --- |
| `makeShared` without Select | 1 |
| Parent format Get + live Select | 1–2 |
| Intro Repeater wiring | 2 |
| IntroShape / renderer unchanged | 2 (assert storage) |
| Filament → front feature test | 2 |
| Regression | 3 |
