# ApiDoc Layout Visual M1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver ApiDoc template layout M1 — shared `layout_tree` dual-write + `page` lock rail + three editor drivers (`filament_tab`, `livewire_page`, `grapesjs`) selectable per skin.

**Architecture:** Domain kernel under `gz168/ApiDoc/src/Layout/` validates/defaults/writes trees and regenerates `body_parts.page`. Filament Resource exposes enable/editor fields and locks `page` when visual mode is on. Three thin UI drivers all call `LayoutTreeService::save`. Front rendering stays on existing `ViewResolver` / `api_doc_part` using the generated `page` string when `layout_visual_enabled` is true (fail-soft regenerate if page empty).

**Tech Stack:** Laravel 13, Filament 5, Livewire 4, PHP 8.5, PHPUnit 12, Alpine/Sortable (Tab + Livewire page), GrapesJS (npm + Vite entry for admin layout page only), module `gz168/ApiDoc`.

**Spec:** `docs/dev-laraval/superpowers/specs/2026-09-18-apidoc-layout-visual-m1-design.md`

## Global Constraints

- Frozen layout leaves only: `header`, `nav`, `intro_section`, `api_section`, `carriers_section`, `decisions_section`, `note` — reorder + visibility; no nesting.
- Dual-write on layout save: `layout_tree` + generated `body_parts.page`.
- When `layout_visual_enabled=true`, Filament `page` textarea is disabled and client tampering is ignored on model save.
- When `layout_visual_enabled=false`, tree is kept but unused at runtime; editing `page` does not rewrite the tree.
- `intro_section` / `api_section` share one sections foreach slot (relative order ignored); other five leaves follow tree order; `visible:false` omits output.
- Permission `api-doc.templates.layout` required to mutate layout fields / save tree; combine with existing template Resource access.
- GrapesJS: same 7-block capability + read-only part HTML preview; no free DOM / custom blocks; assets only on admin layout page.
- After PHP edits: `vendor/bin/pint --dirty --format agent`.
- Prefer Boost `search-docs` for Filament 5 Tabs/Actions before UI coding.
- Do not expose `.env` secrets; do not weaken protected super-admin invariants.

## File map

| File | Responsibility |
| --- | --- |
| `gz168/ApiDoc/database/migrations/2026_09_18_000015_add_layout_visual_to_api_doc_templates_table.php` | New columns |
| `gz168/ApiDoc/src/Enums/ApiDocPermission.php` | Add `TemplatesLayout` |
| `gz168/ApiDoc/src/Enums/ApiDocLayoutEditor.php` | Editor enum |
| `gz168/ApiDoc/src/Support/ApiDocLayoutParts.php` | 7 leaf keys + labels |
| `gz168/ApiDoc/src/Support/ApiDocLayoutGate.php` | `allows(?Authenticatable): bool` |
| `gz168/ApiDoc/database/seeders/ApiDocPermissionSeeder.php` | Register permission |
| `gz168/ApiDoc/src/Models/ApiDocTemplate.php` | fillable/casts + page lock on save |
| `gz168/ApiDoc/database/factories/ApiDocTemplateFactory.php` | defaults for new cols |
| `gz168/ApiDoc/src/Layout/LayoutTreeDefaults.php` | Default tree |
| `gz168/ApiDoc/src/Layout/LayoutTreeValidator.php` | Schema validation |
| `gz168/ApiDoc/src/Layout/PageSkeletonWriter.php` | Tree → page HTML |
| `gz168/ApiDoc/src/Layout/LayoutTreeService.php` | save + resolveEffectivePage |
| `gz168/ApiDoc/src/Services/ApiDocExporter.php` / `ApiDocImporter.php` | Snapshot fields |
| `gz168/ApiDoc/src/Filament/Resources/ApiDocTemplateResource.php` | Fields, page lock, Tab driver |
| `gz168/ApiDoc/src/Filament/Pages/ApiDocTemplateLayoutEditorPage.php` | Shared Livewire/Grapes entry |
| `gz168/ApiDoc/resources/views/filament/pages/template-layout-editor.blade.php` | Driver 2/3 view |
| `gz168/ApiDoc/resources/js/layout/grapes-editor.js` | GrapesJS bootstrap |
| `vite.config.js` + `package.json` | grapesjs dep + input |
| Unit/Feature tests under `tests/Unit/ApiDoc/` and `tests/Feature/ApiDoc/` | Coverage per tasks |

---

### Task 1: Migration, enum, gate, model columns

**Files:**
- Create: `gz168/ApiDoc/database/migrations/2026_09_18_000015_add_layout_visual_to_api_doc_templates_table.php`
- Create: `gz168/ApiDoc/src/Enums/ApiDocLayoutEditor.php`
- Create: `gz168/ApiDoc/src/Support/ApiDocLayoutParts.php`
- Create: `gz168/ApiDoc/src/Support/ApiDocLayoutGate.php`
- Modify: `gz168/ApiDoc/src/Enums/ApiDocPermission.php`
- Modify: `gz168/ApiDoc/database/seeders/ApiDocPermissionSeeder.php`
- Modify: `gz168/ApiDoc/src/Models/ApiDocTemplate.php`
- Modify: `gz168/ApiDoc/database/factories/ApiDocTemplateFactory.php`
- Test: `tests/Unit/ApiDoc/ApiDocLayoutGateTest.php`

**Interfaces:**
- Produces: `ApiDocLayoutEditor` cases `FilamentTab`, `LivewirePage`, `GrapesJs` with `value` strings `filament_tab` / `livewire_page` / `grapesjs`; `ApiDocLayoutParts::KEYS` list of 7 strings; `ApiDocLayoutGate::allows(?Authenticatable $user): bool`; model attributes `layout_visual_enabled`, `layout_editor`, `layout_tree`.

- [ ] **Step 1: Write failing gate test**

```php
<?php

declare(strict_types=1);

namespace Tests\Unit\ApiDoc;

use App\Models\User;
use Gz168\ApiDoc\Support\ApiDocLayoutGate;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ApiDocLayoutGateTest extends TestCase
{
    use LazilyRefreshDatabase;

    #[Test]
    public function super_admin_is_allowed(): void
    {
        $user = User::factory()->make();
        $user->forceFill(['is_super_admin' => true, 'is_protected' => false])->saveQuietly();
        $this->assertTrue(ApiDocLayoutGate::allows($user));
    }

    #[Test]
    public function user_without_permission_is_denied(): void
    {
        $user = User::factory()->make();
        $user->forceFill(['is_super_admin' => false, 'is_protected' => false])->saveQuietly();
        $this->assertFalse(ApiDocLayoutGate::allows($user));
    }
}
```

- [ ] **Step 2: Run test — expect FAIL** (class missing)

Run: `php artisan test --compact tests/Unit/ApiDoc/ApiDocLayoutGateTest.php`

- [ ] **Step 3: Implement migration + support classes + model**

Migration columns:
- `layout_visual_enabled` boolean default false
- `layout_editor` string(32) default `filament_tab`
- `layout_tree` json nullable

`ApiDocPermission::TemplatesLayout = 'api-doc.templates.layout'` with Chinese label「编排前台模板布局」.

`ApiDocLayoutGate::allows` → user implements `Authorizable` and `hasPermission('api-doc.templates.layout')`.

Model: add fillable + casts (`layout_visual_enabled` bool, `layout_tree` array). In `saving`: if `$template->layout_visual_enabled` and `body_parts.page` is dirty, restore `body_parts['page']` from original (merge into body_parts array). Also: if not `ApiDocLayoutGate::allows(auth()->user())` and any of `layout_visual_enabled` / `layout_editor` / `layout_tree` dirty → restore those three from original (create: defaults).

Factory defaults: `layout_visual_enabled => false`, `layout_editor => filament_tab`, `layout_tree => null`.

Seeder: append permission row; admin role sync stays as-is (pluck all).

- [ ] **Step 4: Run migration in test env + gate tests PASS**

Run: `php artisan migrate --no-interaction` (or rely on RefreshDatabase) then `php artisan test --compact tests/Unit/ApiDoc/ApiDocLayoutGateTest.php`

- [ ] **Step 5: Commit**

```bash
git add gz168/ApiDoc/database/migrations/2026_09_18_000015_add_layout_visual_to_api_doc_templates_table.php \
  gz168/ApiDoc/src/Enums/ApiDocLayoutEditor.php \
  gz168/ApiDoc/src/Enums/ApiDocPermission.php \
  gz168/ApiDoc/src/Support/ApiDocLayoutParts.php \
  gz168/ApiDoc/src/Support/ApiDocLayoutGate.php \
  gz168/ApiDoc/database/seeders/ApiDocPermissionSeeder.php \
  gz168/ApiDoc/src/Models/ApiDocTemplate.php \
  gz168/ApiDoc/database/factories/ApiDocTemplateFactory.php \
  tests/Unit/ApiDoc/ApiDocLayoutGateTest.php
git commit -m "feat(api-doc): add layout visual columns and permission gate"
```

---

### Task 2: LayoutTreeDefaults + LayoutTreeValidator

**Files:**
- Create: `gz168/ApiDoc/src/Layout/LayoutTreeDefaults.php`
- Create: `gz168/ApiDoc/src/Layout/LayoutTreeValidator.php`
- Test: `tests/Unit/ApiDoc/LayoutTreeValidatorTest.php`

**Interfaces:**
```php
final class LayoutTreeDefaults
{
    /** @return array{version:int,nodes:list<array{id:string,part:string,visible:bool}>} */
    public static function tree(): array;
}

final class LayoutTreeValidator
{
    /**
     * @param  array<string,mixed>  $tree
     * @return array{version:int,nodes:list<array{id:string,part:string,visible:bool}>}
     * @throws \InvalidArgumentException
     */
    public function validate(array $tree): array;
}
```

- [ ] **Step 1: Failing tests**

```php
#[Test]
public function accepts_default_tree(): void
{
    $v = app(LayoutTreeValidator::class)->validate(LayoutTreeDefaults::tree());
    $this->assertSame(1, $v['version']);
    $this->assertCount(7, $v['nodes']);
}

#[Test]
public function rejects_missing_part(): void
{
    $tree = LayoutTreeDefaults::tree();
    array_pop($tree['nodes']);
    $this->expectException(InvalidArgumentException::class);
    app(LayoutTreeValidator::class)->validate($tree);
}

#[Test]
public function rejects_unknown_part(): void
{
    $tree = LayoutTreeDefaults::tree();
    $tree['nodes'][0]['part'] = 'panel';
    $this->expectException(InvalidArgumentException::class);
    app(LayoutTreeValidator::class)->validate($tree);
}
```

- [ ] **Step 2: Run — FAIL**

Run: `php artisan test --compact tests/Unit/ApiDoc/LayoutTreeValidatorTest.php`

- [ ] **Step 3: Implement**

Defaults: exact order from spec; `note.visible = false`; others true; `id === part`.

Validator rules: `version === 1`; `nodes` is list of exactly 7; each has `id`,`part`,`visible`; `part` ∈ `ApiDocLayoutParts::KEYS`; all keys present once; coerce `id` to equal `part`; `visible` to bool.

- [ ] **Step 4: Tests PASS + commit**

```bash
git commit -m "feat(api-doc): add layout tree defaults and validator"
```

---

### Task 3: PageSkeletonWriter

**Files:**
- Create: `gz168/ApiDoc/src/Layout/PageSkeletonWriter.php`
- Test: `tests/Unit/ApiDoc/PageSkeletonWriterTest.php`

**Interfaces:**
```php
final class PageSkeletonWriter
{
    /**
     * @param  array{version:int,nodes:list<array{id:string,part:string,visible:bool}>}  $tree
     */
    public function write(array $tree): string;
}
```

**Produces:** HTML string matching classic shell. Exact fragments to emit:

Header call (if visible):
`{!! api_doc_part('header', ['settings' => $settings, 'lang' => $lang, 'mode' => $mode, 'modes' => $modes, 'ui' => $ui]) !!}`

Nav:
`{!! api_doc_part('nav', ['nav' => $data['nav'] ?? [], 'lang' => $lang]) !!}`

Sections slot (if intro and/or api visible):
```blade
@foreach ($data['sections'] as $section)
    @if (!empty($section['is_intro']))
        @if ($__layout_intro)
            {!! api_doc_part('intro_section', ['section' => $section, 'lang' => $lang, 'quickstart' => $data['quickstart'] ?? [], 'ui' => $ui]) !!}
        @endif
    @else
        @if ($__layout_api)
            {!! api_doc_part('api_section', ['section' => $section, 'lang' => $lang, 'ui' => $ui]) !!}
        @endif
    @endif
@endforeach
```
Where `$__layout_intro` / `$__layout_api` are inlined as `true`/`false` literals in generated PHP (Writer substitutes booleans into the string as `true`/`false`).

Carriers / decisions / note — same argument arrays as classic `api-doc-page.blade.php`. Decisions keep wrapping `@if (!empty($data['settings']['show_decisions']))` **and** only emit that block when decisions node visible.

Shell order algorithm:
1. Walk nodes in order.
2. When encountering `intro_section` or `api_section`, if sections slot not yet emitted and at least one of intro/api is visible in the **full tree**, emit the foreach once at the position of the **first** of {intro, api} in the tree; skip the second when reached.
3. Other parts: emit at their position if visible.

- [ ] **Step 1: Failing tests**

```php
#[Test]
public function orders_non_section_parts_and_hides_note_by_default(): void
{
    $html = app(PageSkeletonWriter::class)->write(LayoutTreeDefaults::tree());
    $this->assertStringContainsString("api_doc_part('header'", $html);
    $this->assertStringNotContainsString("api_doc_part('note'", $html);
    $posHeader = strpos($html, "api_doc_part('header'");
    $posNav = strpos($html, "api_doc_part('nav'");
    $this->assertTrue($posHeader < $posNav);
}

#[Test]
public function hides_carriers_when_not_visible(): void
{
    $tree = LayoutTreeDefaults::tree();
    foreach ($tree['nodes'] as &$n) {
        if ($n['part'] === 'carriers_section') {
            $n['visible'] = false;
        }
    }
    unset($n);
    $html = app(PageSkeletonWriter::class)->write($tree);
    $this->assertStringNotContainsString("api_doc_part('carriers_section'", $html);
}

#[Test]
public function omits_sections_loop_when_both_intro_and_api_hidden(): void
{
    $tree = LayoutTreeDefaults::tree();
    foreach ($tree['nodes'] as &$n) {
        if (in_array($n['part'], ['intro_section', 'api_section'], true)) {
            $n['visible'] = false;
        }
    }
    unset($n);
    $html = app(PageSkeletonWriter::class)->write($tree);
    $this->assertStringNotContainsString('@foreach ($data[\'sections\']', $html);
}
```

- [ ] **Step 2: Implement Writer + PASS tests**

Wrap output in classic outer `<div>…toast…</div>` structure from `resources/views/front/api-doc-page.blade.php`. Pass generated string through `ApiDocHtmlSanitizer::sanitizeBodyParts(['page' => $html])['page']` before return (or sanitize in Service only — **do sanitize inside Writer** so callers always get safe HTML).

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(api-doc): generate page skeleton from layout tree"
```

---

### Task 4: LayoutTreeService

**Files:**
- Create: `gz168/ApiDoc/src/Layout/LayoutTreeService.php`
- Test: `tests/Feature/ApiDoc/LayoutTreeServiceTest.php`

**Interfaces:**
```php
final class LayoutTreeService
{
    /**
     * @param  array<string,mixed>  $tree
     */
    public function save(ApiDocTemplate $template, array $tree): ApiDocTemplate;

    /**
     * Page HTML used for front render when visual enabled.
     */
    public function resolveEffectivePage(ApiDocTemplate $template): ?string;
}
```

`save`: validate → set `layout_tree` → set `body_parts['page']` from Writer → `save()` model → flush cache via existing `ApiDocCacheManager` (same as other template saves if a helper exists; else call whatever Edit page uses).

`resolveEffectivePage`: if not `layout_visual_enabled`, return null (caller keeps existing resolve). If enabled: non-empty `body_parts.page` return it; else if tree present validate+Writer without persisting; else Defaults+Writer without persisting.

- [ ] **Step 1: Feature tests**

```php
#[Test]
public function save_dual_writes_tree_and_page(): void
{
    $this->seed(ApiDocTemplateSeeder::class);
    $t = ApiDocTemplate::query()->where('code', 'classic')->firstOrFail();
    $tree = LayoutTreeDefaults::tree();
    app(LayoutTreeService::class)->save($t, $tree);
    $t->refresh();
    $this->assertNotNull($t->layout_tree);
    $this->assertStringContainsString("api_doc_part('header'", (string) ($t->body_parts['page'] ?? ''));
}

#[Test]
public function disabled_visual_does_not_require_tree_for_runtime_page(): void
{
    $this->seed(ApiDocTemplateSeeder::class);
    $t = ApiDocTemplate::query()->where('code', 'classic')->firstOrFail();
    $t->layout_visual_enabled = false;
    $t->save();
    $this->assertNull(app(LayoutTreeService::class)->resolveEffectivePage($t));
}
```

- [ ] **Step 2: Implement + PASS + commit**

```bash
git commit -m "feat(api-doc): add LayoutTreeService dual-write"
```

---

### Task 5: Snapshot export/import + SkinCopier fields

**Files:**
- Modify: `gz168/ApiDoc/src/Services/ApiDocExporter.php`
- Modify: `gz168/ApiDoc/src/Services/ApiDocImporter.php`
- Modify: `gz168/ApiDoc/src/Services/ApiDocTemplateSkinCopier.php` (copy three columns when duplicating DB state if applicable; create flow already fills model — ensure create defaults)
- Test: `tests/Feature/ApiDoc/ApiDocSnapshotLayoutVisualTest.php`

- [ ] **Step 1: Failing test — export includes layout fields; import rejects bad editor; round-trip tree**

```php
#[Test]
public function export_and_import_round_trips_layout_fields(): void
{
    $this->seed(ApiDocDisplayModeSeeder::class);
    $classic = ApiDocTemplate::query()->where('code', 'classic')->firstOrFail();
    $classic->layout_visual_enabled = true;
    $classic->layout_editor = ApiDocLayoutEditor::LivewirePage->value;
    $classic->layout_tree = LayoutTreeDefaults::tree();
    $classic->save();

    $payload = app(ApiDocExporter::class)->exportAll();
    $row = collect($payload['templates'])->firstWhere('code', 'classic');
    $this->assertTrue($row['layout_visual_enabled']);
    $this->assertSame('livewire_page', $row['layout_editor']);

    $payload['templates'][0]['layout_editor'] = 'nope';
    $this->expectException(RuntimeException::class);
    app(ApiDocImporter::class)->import($payload, ApiDocImporter::MODE_OVERWRITE);
}
```

(Second test for successful round-trip with valid editor.)

- [ ] **Step 2: Implement exporter map keys; importer validates editor via `ApiDocLayoutEditor::tryFrom` and tree via Validator when non-null; fill model fields. If `layout_visual_enabled` and tree present, optionally re-run Writer so page matches — **do re-run Writer on import when enabled** so snapshot page cannot drift.**

- [ ] **Step 3: PASS + commit**

```bash
git commit -m "feat(api-doc): snapshot layout visual fields"
```

---

### Task 6: Filament Resource fields + page lock + wire resolveEffectivePage

**Files:**
- Modify: `gz168/ApiDoc/src/Filament/Resources/ApiDocTemplateResource.php`
- Modify: `gz168/ApiDoc/src/Filament/Resources/ApiDocTemplateResource/Pages/EditApiDocTemplate.php` (mutateFormDataBeforeSave strip page if enabled)
- Modify: `gz168/ApiDoc/src/Services/ApiDocTemplateViewResolver.php` (or page render path) to use `LayoutTreeService::resolveEffectivePage` when non-null
- Test: `tests/Feature/ApiDoc/ApiDocTemplateLayoutLockTest.php`
- Test: `tests/Feature/ApiDoc/ApiDocTemplateLayoutRenderTest.php`

- [ ] **Step 1: Add form controls** on Edit (Section「布局」):
  - `Toggle::make('layout_visual_enabled')->disabled(fn () => ! ApiDocLayoutGate::allows(auth()->user()))`
  - `Select::make('layout_editor')->options(collect(ApiDocLayoutEditor::cases())->mapWithKeys(...))->disabled(...)`
  - For `body_parts.page` Textarea: `->disabled(fn (Get $get) => (bool) $get('layout_visual_enabled'))` and `->dehydrated(fn (Get $get) => ! (bool) $get('layout_visual_enabled'))`

- [ ] **Step 2: Tests**

```php
#[Test]
public function enabled_visual_ignores_page_tampering_on_edit(): void
{
    $this->seed(ApiDocTemplateSeeder::class);
    $this->actingAsFilamentAdmin(); // has all perms
    $t = ApiDocTemplate::query()->where('code', 'classic')->firstOrFail();
    $tree = LayoutTreeDefaults::tree();
    app(LayoutTreeService::class)->save($t, $tree);
    $t->layout_visual_enabled = true;
    $t->save();
    $before = $t->fresh()->body_parts['page'];

    Livewire::test(EditApiDocTemplate::class, ['record' => $t->getKey()])
        ->fillForm([
            'body_parts.page' => '<div>TAMPER</div>',
            'layout_visual_enabled' => true,
        ])
        ->call('save')
        ->assertHasNoFormErrors();

    $this->assertSame($before, $t->fresh()->body_parts['page']);
    $this->assertStringNotContainsString('TAMPER', (string) $t->fresh()->body_parts['page']);
}
```

Render test: enable visual, hide carriers in tree via Service, hit `/api-doc` (or preview) and assert carriers marker absent — use existing front test patterns in `ApiDocTemplateRenderTest.php`.

- [ ] **Step 3: Implement ViewResolver hook** — when resolving `page` part for a template with visual enabled, prefer `resolveEffectivePage` string over empty file fallback.

- [ ] **Step 4: PASS + commit**

```bash
git commit -m "feat(api-doc): filament layout fields and page lock"
```

---

### Task 7: Driver `filament_tab` — Sortable layout Tab

**Files:**
- Modify: `gz168/ApiDoc/src/Filament/Resources/ApiDocTemplateResource.php`
- Create: `gz168/ApiDoc/resources/views/filament/components/layout-tree-sortable.blade.php`
- Modify: `EditApiDocTemplate.php` — `saveLayoutTree` action / form Hidden `layout_tree`
- Test: `tests/Feature/ApiDoc/ApiDocTemplateLayoutTabTest.php`

**UI behavior:**
- Tab「布局编排」visible when `layout_editor === filament_tab` (Get) OR always visible but content explains switch — **spec: mount driver by editor**; Tab visible iff editor is `filament_tab` and user can view template.
- Alpine + SortableJS (use CDN in blade **or** Filament's existing sortable if present — check Filament 5 docs; if none, Alpine `@sortable` via `sortablejs` npm already used by Filament — prefer `wire:sortable` Livewire plugin if project has it; else Alpine list with up/down buttons **minimum viable** + drag if Sortable available).
- **MVP acceptable:** list with ↑↓ buttons + visibility toggles writing into Livewire property `layoutTreeNodes`, Save button calls `LayoutTreeService::save` then refresh. Drag-and-drop is preferred but ↑↓ satisfies M1 if Sortable integration blocks.
- Require `layout_visual_enabled` true to enable edits; if false, show hint「请先启用可视化布局」.

- [ ] **Step 1: Feature smoke** — admin opens Edit, sees layout tab fields; calling save layout with reordered nodes updates `layout_tree` and page string order.

- [ ] **Step 2: Implement + PASS + commit**

```bash
git commit -m "feat(api-doc): filament_tab layout editor"
```

---

### Task 8: Driver `livewire_page`

**Files:**
- Create: `gz168/ApiDoc/src/Filament/Pages/ApiDocTemplateLayoutEditorPage.php`
- Create: `gz168/ApiDoc/resources/views/filament/pages/template-layout-editor.blade.php`
- Modify: `ApiDocTemplateResource.php` — header Action「打开布局编排」visible when `layout_editor === livewire_page || grapesjs` and gate allows (or view)
- Register page in `ApiDocServiceProvider` / Filament panel provider discovery
- Test: `tests/Feature/ApiDoc/ApiDocTemplateLayoutEditorPageTest.php`

**Page contract:**
- Route param `template` (record id or code).
- `mount`: authorize Resource view; load template; init nodes from `layout_tree ?? LayoutTreeDefaults::tree()`.
- Left: same ↑↓ / visibility UI as Tab (extract Blade component `layout-tree-sortable`).
- Right: structure preview list of visible parts labels.
- `saveLayout`: gate check or abort 403; require `layout_visual_enabled` or set flash error; call Service.
- Grapes branch: `@if ($template->layout_editor === 'grapesjs')` include grapes root — implemented in Task 9; Task 8 ships livewire_page branch fully.

- [ ] **Step 1: Smoke test** Livewire::test page as admin returns OK; user without gate cannot `saveLayout`.

- [ ] **Step 2: Implement + commit**

```bash
git commit -m "feat(api-doc): livewire_page layout editor"
```

---

### Task 9: Driver `grapesjs`

**Files:**
- Modify: `package.json` — add `grapesjs` dependency
- Modify: `vite.config.js` — add input `gz168/ApiDoc/resources/js/layout/grapes-editor.js` (or `resources/js/api-doc-layout-grapes.js` symlink path under app resources that imports package file)
- Create: `gz168/ApiDoc/resources/js/layout/grapes-editor.js`
- Modify: layout editor Blade — grapes canvas root + Alpine/Livewire hooks
- Test: extend `ApiDocTemplateLayoutEditorPageTest` — page with `layout_editor=grapesjs` loads 200 and contains `#api-doc-grapes-root`; save still goes through Service with JSON tree (simulate `call('saveLayout', $tree)` without needing browser Grapes)

**Grapes rules (enforce in JS init):**
- Only register 7 blocks matching parts; `editor.BlockManager` add each once.
- `storageManager: false`; on load, drop blocks from `layoutTree` order with `visible` → if false set style `display:none` or trait checkbox.
- On 「应用到树」, read canvas component order → emit Livewire `layoutTreeNodes`; do not allow `append` of unknown blocks (listen `block:drag:stop` and remove illegal).
- Side panel: when component selected, Livewire `selectedPart` → server renders read-only HTML via `ApiDocTemplateViewResolver` or raw `body_parts[part]` into `<iframe srcdoc>` (sanitized).

- [ ] **Step 1: `npm install grapesjs --save-dev` (or dependencies) + vite entry; `npm run build` must succeed**

- [ ] **Step 2: PHPUnit smoke without depending on JS runtime**

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(api-doc): grapesjs layout editor shell"
```

---

### Task 10: Pint, suite slice, docs status line

**Files:**
- Touch only if status headers needed on spec (`状态：实现中` optional — skip unless user asked)
- Run pint + targeted tests

- [ ] **Step 1: `vendor/bin/pint --dirty --format agent`**

- [ ] **Step 2: Run**

```bash
php artisan test --compact \
  tests/Unit/ApiDoc/ApiDocLayoutGateTest.php \
  tests/Unit/ApiDoc/LayoutTreeValidatorTest.php \
  tests/Unit/ApiDoc/PageSkeletonWriterTest.php \
  tests/Feature/ApiDoc/LayoutTreeServiceTest.php \
  tests/Feature/ApiDoc/ApiDocSnapshotLayoutVisualTest.php \
  tests/Feature/ApiDoc/ApiDocTemplateLayoutLockTest.php \
  tests/Feature/ApiDoc/ApiDocTemplateLayoutRenderTest.php \
  tests/Feature/ApiDoc/ApiDocTemplateLayoutTabTest.php \
  tests/Feature/ApiDoc/ApiDocTemplateLayoutEditorPageTest.php
```

Expected: all PASS.

- [ ] **Step 3: Ask user whether to run full `php artisan test --compact`**

- [ ] **Step 4: Final commit if pint changed files**

```bash
git commit -m "chore(api-doc): pint layout visual M1"
```

---

## Spec coverage checklist (self-review)

| Spec item | Task |
| --- | --- |
| Columns + defaults | 1 |
| Permission + gate | 1 |
| Tree schema / validator / defaults | 2 |
| PageSkeletonWriter + sections slot | 3 |
| Dual-write service + resolveEffectivePage | 4 |
| Snapshot + import validation | 5 |
| Page lock + Filament fields + runtime | 6 |
| filament_tab | 7 |
| livewire_page | 8 |
| grapesjs + read-only preview | 9 |
| Test matrix / pint | 10 |

No TBD placeholders. Editor enum values match spec. Writer sections-slot rule matches §3.1.
