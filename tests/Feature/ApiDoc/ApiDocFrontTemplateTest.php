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
use Mockery;
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

        $cache = Mockery::mock(ApiDocCacheManager::class);
        $cache->shouldReceive('remember')
            ->once()
            ->withArgs(fn (string $key): bool => $key === 'render:fr:classic:html')
            ->andReturn([
                'lang' => 'fr',
                'mode' => 'fr',
                'nav' => [],
                'sections' => [],
                'ui' => [],
            ]);

        $this->app->instance(ApiDocCacheManager::class, $cache);
        $this->app->forgetInstance(ApiDocRenderer::class);

        app(ApiDocRenderer::class)->render('fr', html: true);
    }

    #[Test]
    public function different_template_keys_do_not_share_cache_payload(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);
        ApiDocSetting::current();
        ApiDocSection::factory()->create(['slug' => 'oauth', 'verb' => 'POST', 'path' => '/x']);

        config([
            'api-doc.templates.catalog.alt' => [
                'label' => 'Alt',
                'views_prefix' => 'gz168-api-doc::front',
                'assets' => [],
            ],
        ]);

        $seen = [];
        $cache = Mockery::mock(ApiDocCacheManager::class);
        $cache->shouldReceive('remember')
            ->andReturnUsing(function (string $key) use (&$seen): array {
                $seen[] = $key;

                return [
                    'lang' => 'fr',
                    'mode' => 'fr',
                    'nav' => [],
                    'sections' => [],
                    'ui' => [],
                ];
            });

        $this->app->instance(ApiDocCacheManager::class, $cache);
        $this->app->forgetInstance(ApiDocRenderer::class);

        $mode = ApiDocDisplayMode::query()->where('code', 'fr')->firstOrFail();
        $renderer = app(ApiDocRenderer::class);

        $mode->forceFill(['template_key' => 'classic'])->saveQuietly();
        $renderer->render('fr', html: true);

        $mode->forceFill(['template_key' => 'alt'])->saveQuietly();
        $renderer->render('fr', html: true);

        $this->assertContains('render:fr:classic:html', $seen);
        $this->assertContains('render:fr:alt:html', $seen);
        $this->assertNotSame('render:fr:classic:html', 'render:fr:alt:html');
    }
}
