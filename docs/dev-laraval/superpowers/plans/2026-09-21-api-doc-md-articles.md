# ApiDoc MD Articles + Section Content Type Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reusable Markdown articles (FR/ZH/EN) and let document sections choose HTML (structured) or MD (linked article) for front rendering.

**Architecture:** New `api_doc_articles` table + Filament resource with MD/zip import-export. Sections gain `content_type` + `article_id`. `ApiDocRenderer` for MD sections renders the article via `ApiDocContentRenderer` and suppresses structured children on the front while admin can still edit them. Snapshot export/import includes articles by slug.

**Tech Stack:** Laravel 13, Filament 5, Livewire 4, PHP 8.5, PHPUnit 12, module `gz168/ApiDoc`, League CommonMark (existing).

**Spec:** `docs/dev-laraval/superpowers/specs/2026-09-21-api-doc-md-articles-design.md`

## Global Constraints

- Module boundary: all code in `gz168/ApiDoc` (+ host tests under `tests/`).
- Do not weaken protected admin / initialize invariants.
- Field-level `ApiDocContentFormat` stays; new enum is `ApiDocSectionContentType` (`html`|`md`).
- Storage: DB primary; export generates temp files only.
- MD section: admin keeps relation managers; front ignores paras/notes/blocks/params/returns.
- Intro + MD: keep `intro_base` + quickstart; main body from article.
- After PHP edits: `vendor/bin/pint --dirty --format agent`.
- Commits only when the user asks (do not auto-commit gz168 unless requested).

## File map

| File | Responsibility |
| --- | --- |
| `gz168/ApiDoc/database/migrations/2026_09_21_*_create_api_doc_articles_table.php` | articles table |
| `gz168/ApiDoc/database/migrations/2026_09_21_*_add_content_type_to_api_doc_sections_table.php` | section columns |
| `gz168/ApiDoc/src/Enums/ApiDocSectionContentType.php` | html/md enum |
| `gz168/ApiDoc/src/Models/ApiDocArticle.php` | article model + delete guard |
| `gz168/ApiDoc/database/factories/ApiDocArticleFactory.php` | factory |
| `gz168/ApiDoc/src/Services/ApiDocArticleImportExport.php` | single/zip import download |
| `gz168/ApiDoc/src/Filament/Resources/ApiDocArticleResource.php` (+ Pages) | CRUD UI |
| `gz168/ApiDoc/src/Filament/Resources/ApiDocSectionResource.php` | content_type + article select |
| `gz168/ApiDoc/src/Models/ApiDocSection.php` | fillable/casts/relations/validation |
| `gz168/ApiDoc/src/Services/ApiDocRenderer.php` | MD branch |
| `gz168/ApiDoc/src/Services/ApiDocExporter.php` / `ApiDocImporter.php` | snapshot articles |
| `gz168/ApiDoc/src/Services/ApiDocSectionService.php` | normalize content_type on save/duplicate |
| `tests/Feature/ApiDoc/ApiDocArticle*Test.php` | feature coverage |
| `tests/Unit/ApiDoc/ApiDocArticleImportExportTest.php` | zip/filename parsing |

---

### Task 1: Schema, enum, model, factory

**Files:**
- Create migrations, enum, model, factory as above
- Modify: `ApiDocSection` for `content_type`, `article_id`, `article()` relation

- [ ] **Step 1: Create migration for articles**

```php
Schema::create('api_doc_articles', function (Blueprint $table): void {
    $table->id();
    $table->string('slug', 100)->unique();
    $table->string('title', 200);
    $table->longText('body_fr')->default('');
    $table->longText('body_zh')->default('');
    $table->longText('body_en')->default('');
    $table->boolean('is_active')->default(true);
    $table->integer('sort')->default(0);
    $table->timestamps();
    $table->index(['is_active', 'sort']);
});
```

- [ ] **Step 2: Create migration for sections**

```php
$table->string('content_type', 16)->default('html')->after('is_active');
$table->foreignId('article_id')->nullable()->after('content_type')
    ->constrained('api_doc_articles')->restrictOnDelete();
```

- [ ] **Step 3: Enum `ApiDocSectionContentType`** with `Html='html'`, `Md='md'`, `label()`, `options()`.

- [ ] **Step 4: Model `ApiDocArticle`** — fillable, casts, `sections(): HasMany`, `booted` deleting: throw if `sections()->exists()`.

- [ ] **Step 5: Wire `ApiDocSection`** — fillable `content_type`,`article_id`; cast content_type enum; `article(): BelongsTo`; on saving: if html clear article_id; if md require article_id.

- [ ] **Step 6: Factory + migrate**

Run: `php artisan migrate --no-interaction`
Expected: OK

---

### Task 2: `ApiDocArticleImportExport` + unit tests

**Interfaces:**
- `importLanguage(ApiDocArticle $article, string $lang, string $markdown): void`
- `importZip(ApiDocArticle $article, string $zipPath): array{imported: list<string>, skipped: list<string>}`
- `downloadLanguage(ApiDocArticle $article, string $lang): \Symfony\Component\HttpFoundation\StreamedResponse`
- `downloadZip(ApiDocArticle $article): \Symfony\Component\HttpFoundation\StreamedResponse`
- `parseZipLanguageMap(array $filenames): array<string,string>` maps lang → entry name

Filename rules (case-insensitive basename):
- `fr.md` / `zh.md` / `en.md`
- `{anything}.fr.md` / `.zh.md` / `.en.md`
- `{slug}-fr.md` etc.

- [ ] **Step 1: Failing unit test** for `parseZipLanguageMap` and import overwrite behavior
- [ ] **Step 2: Implement service**
- [ ] **Step 3: Tests pass**

Run: `php artisan test --compact tests/Unit/ApiDoc/ApiDocArticleImportExportTest.php`

---

### Task 3: Filament `ApiDocArticleResource`

Mirror `ApiDocDecisionResource` patterns + `FlushesApiDocCache` on save/delete.

Form: slug, title, sort, is_active, MarkdownEditor body_fr/zh/en.
Header/table actions: import language, import zip, download language, download zip (permission gates).

- [ ] **Step 1: Resource + pages**
- [ ] **Step 2: Feature test** list/create as protected admin
- [ ] **Step 3: Tests pass**

Run: `php artisan test --compact --filter=ApiDocArticle`

---

### Task 4: Section form + service normalization

- Add Select `content_type` live + Select `article_id` visible when md (active articles options).
- Table column for type + article slug.
- `ApiDocSectionService::update/create`: when html, force `article_id=null`; when md, validate article exists.
- Duplicate copies `content_type` + `article_id` (shared reference, not clone article).

- [ ] **Step 1: Feature test** save md section with article_id
- [ ] **Step 2: Wire form + service**
- [ ] **Step 3: Tests pass**

---

### Task 5: Front renderer

In `shapeSection`:
1. Eager-load `article` in `render()`.
2. If content_type is Md: build localized body from article columns; `$shapedParas = [['text' => localizeBody(..., Markdown)]]` if non-empty; set notes/blocks/params/returns to `[]`; keep intro base + quickstart.
3. If missing article: empty body (log warning), no 500.

Blade: existing para loop already handles block-level HTML — no change required if MD injects one rendered HTML para. Verify with feature test asserting article text visible and structured para text absent.

- [ ] **Step 1: Failing front feature test**
- [ ] **Step 2: Renderer changes**
- [ ] **Step 3: Tests pass**

Run: `php artisan test --compact tests/Feature/ApiDoc/ApiDocMdSectionFrontTest.php`

---

### Task 6: Snapshot export/import

- Exporter: add `articles` array; sections include `content_type` + `article_slug`.
- Importer: upsert articles first by slug; resolve `article_slug` → id when importing sections.
- Feature test round-trip.

Run: `php artisan test --compact --filter=ApiDocSnapshot`

---

### Task 7: Final verification

- [ ] `vendor/bin/pint --dirty --format agent`
- [ ] `php artisan test --compact --filter=ApiDocArticle`
- [ ] `php artisan test --compact --filter=ApiDocMdSection`
- [ ] Ask user whether to run full suite / commit gz168
