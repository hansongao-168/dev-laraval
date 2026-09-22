<?php

declare(strict_types=1);

namespace Tests\Feature\ApiDoc;

use Gz168\ApiDoc\Database\Seeders\ApiDocDisplayModeSeeder;
use Gz168\ApiDoc\Enums\ApiDocSectionContentType;
use Gz168\ApiDoc\Models\ApiDocArticle;
use Gz168\ApiDoc\Models\ApiDocSection;
use Gz168\ApiDoc\Models\ApiDocSetting;
use Gz168\ApiDoc\Services\ApiDocExporter;
use Gz168\ApiDoc\Services\ApiDocImporter;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use RuntimeException;
use Tests\TestCase;

class ApiDocMdSectionFrontTest extends TestCase
{
    use LazilyRefreshDatabase;

    #[Test]
    public function md_section_renders_article_and_hides_structured_paras(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);
        ApiDocSetting::current();

        $article = ApiDocArticle::factory()->create([
            'slug' => 'oauth-guide',
            'body_fr' => 'Article **MD-UNIQUE-TOKEN** body',
            'body_zh' => '',
            'body_en' => '',
            'is_active' => true,
        ]);

        $section = ApiDocSection::factory()->create([
            'slug' => 'oauth-md',
            'is_active' => true,
            'is_intro' => false,
            'content_type' => ApiDocSectionContentType::Md,
            'article_id' => $article->id,
            'title' => ['fr' => 'OAuth MD', 'zh' => '', 'en' => ''],
            'nav_label' => ['fr' => 'OAuth MD', 'zh' => '', 'en' => ''],
        ]);

        $section->paras()->create([
            'sort' => 0,
            'text' => ['fr' => 'STRUCTURED-PARA-HIDDEN', 'zh' => '', 'en' => ''],
            'content_format' => 'markdown',
        ]);

        $this->get('/api-doc')
            ->assertOk()
            ->assertSee('MD-UNIQUE-TOKEN', false)
            ->assertDontSee('STRUCTURED-PARA-HIDDEN', false);
    }

    #[Test]
    public function shared_article_update_appears_on_all_md_sections(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);
        ApiDocSetting::current();

        $article = ApiDocArticle::factory()->create([
            'body_fr' => 'SHARED-V1',
            'body_zh' => '',
            'body_en' => '',
        ]);

        ApiDocSection::factory()->create([
            'slug' => 'a1',
            'is_active' => true,
            'content_type' => ApiDocSectionContentType::Md,
            'article_id' => $article->id,
        ]);
        ApiDocSection::factory()->create([
            'slug' => 'a2',
            'is_active' => true,
            'content_type' => ApiDocSectionContentType::Md,
            'article_id' => $article->id,
        ]);

        $article->update(['body_fr' => 'SHARED-V2-TOKEN']);

        $html = $this->get('/api-doc')->assertOk()->getContent();
        $this->assertSame(2, substr_count($html, 'SHARED-V2-TOKEN'));
    }

    #[Test]
    public function deleting_referenced_article_is_rejected(): void
    {
        $article = ApiDocArticle::factory()->create();
        ApiDocSection::factory()->create([
            'slug' => 'linked-md',
            'content_type' => ApiDocSectionContentType::Md,
            'article_id' => $article->id,
        ]);

        try {
            $article->delete();
            $this->fail('Expected RuntimeException was not thrown.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('linked-md', $exception->getMessage());
            $this->assertStringContainsString('无法删除', $exception->getMessage());
        }

        $this->assertTrue(ApiDocArticle::query()->whereKey($article->id)->exists());
    }

    #[Test]
    public function snapshot_round_trips_articles_and_md_section(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);
        ApiDocSetting::current();

        $article = ApiDocArticle::factory()->create([
            'slug' => 'snap-article',
            'title' => 'Snap',
            'body_fr' => 'SNAP-BODY-FR',
            'body_zh' => 'SNAP-BODY-ZH',
            'body_en' => '',
        ]);

        ApiDocSection::factory()->create([
            'slug' => 'snap-md',
            'is_active' => true,
            'content_type' => ApiDocSectionContentType::Md,
            'article_id' => $article->id,
        ]);

        $payload = app(ApiDocExporter::class)->exportAll();
        $this->assertNotEmpty($payload['articles']);
        $this->assertSame('snap-article', collect($payload['sections'])->firstWhere('slug', 'snap-md')['article_slug'] ?? null);

        ApiDocSection::query()->where('slug', 'snap-md')->update([
            'content_type' => 'html',
            'article_id' => null,
        ]);
        $article->delete();

        app(ApiDocImporter::class)->import($payload, ApiDocImporter::MODE_OVERWRITE);

        $restored = ApiDocArticle::query()->where('slug', 'snap-article')->first();
        $this->assertNotNull($restored);
        $this->assertSame('SNAP-BODY-FR', $restored->body_fr);

        $section = ApiDocSection::query()->where('slug', 'snap-md')->first();
        $this->assertNotNull($section);
        $this->assertSame(ApiDocSectionContentType::Md, $section->content_type);
        $this->assertSame($restored->id, $section->article_id);
    }
}
