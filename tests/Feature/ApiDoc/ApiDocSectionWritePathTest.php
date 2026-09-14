<?php

declare(strict_types=1);

namespace Tests\Feature\ApiDoc;

use Gz168\ApiDoc\Database\Seeders\ApiDocDisplayModeSeeder;
use Gz168\ApiDoc\Models\ApiDocSection;
use Gz168\ApiDoc\Models\ApiDocSetting;
use Gz168\ApiDoc\Services\ApiDocCacheManager;
use Gz168\ApiDoc\Services\ApiDocRenderer;
use Gz168\ApiDoc\Services\ApiDocSectionService;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ApiDocSectionWritePathTest extends TestCase
{
    use LazilyRefreshDatabase;

    #[Test]
    public function service_update_flushes_cache_and_is_visible_on_render(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);

        ApiDocSetting::current()->update([
            'default_locale' => 'fr',
            'cache_ttl' => 3600,
        ]);

        app(ApiDocCacheManager::class)->flush();

        $section = ApiDocSection::factory()->create([
            'slug' => 'oauth-write',
            'title' => ['fr' => 'Old FR', 'zh' => '旧中文', 'en' => 'Old EN'],
            'nav_label' => ['fr' => 'Old FR', 'zh' => '旧中文', 'en' => 'Old EN'],
            'is_active' => true,
        ]);

        $renderer = app(ApiDocRenderer::class);
        $before = $renderer->render('fr', html: false);
        $this->assertTrue(collect($before['sections'])->contains(fn (array $s): bool => ($s['title'] ?? '') === 'Old FR'));

        app(ApiDocSectionService::class)->update($section, [
            'title' => ['fr' => 'New FR', 'zh' => '新中文', 'en' => 'New EN'],
            'nav_label' => ['fr' => 'New FR', 'zh' => '新中文', 'en' => 'New EN'],
        ]);

        $after = $renderer->render('fr', html: false);
        $this->assertTrue(collect($after['sections'])->contains(fn (array $s): bool => ($s['title'] ?? '') === 'New FR'));
        $this->assertFalse(collect($after['sections'])->contains(fn (array $s): bool => ($s['title'] ?? '') === 'Old FR'));
    }

    #[Test]
    public function duplicate_creates_inactive_copy_with_children(): void
    {
        $section = ApiDocSection::factory()->create([
            'slug' => 'src-section',
            'is_active' => true,
        ]);
        $section->paras()->create([
            'sort' => 0,
            'text' => ['fr' => 'Bonjour', 'zh' => '你好', 'en' => 'Hello'],
            'content_format' => 'markdown',
        ]);

        $copy = app(ApiDocSectionService::class)->duplicate($section, 'src-section-copy', activate: false);

        $this->assertSame('src-section-copy', $copy->slug);
        $this->assertFalse($copy->is_active);
        $this->assertCount(1, $copy->paras);
        $this->assertSame('Bonjour', $copy->paras->first()->text['fr'] ?? null);
    }

    #[Test]
    public function english_display_mode_returns_ok(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);

        ApiDocSetting::current();

        ApiDocSection::factory()->create([
            'slug' => 'oauth-en',
            'title' => ['fr' => 'FR', 'zh' => 'ZH', 'en' => 'EN Title'],
            'nav_label' => ['fr' => 'FR', 'zh' => 'ZH', 'en' => 'EN Nav'],
            'is_active' => true,
        ]);

        $this->get('/api-doc?lang=en')->assertOk()->assertSee('EN Title', false);
        $this->get('/api-doc?lang=default')->assertOk();
        $this->get('/api-doc?lang=both')->assertOk();
    }
}
