<?php

declare(strict_types=1);

namespace Tests\Feature\ApiDoc;

use Gz168\ApiDoc\Database\Seeders\ApiDocDisplayModeSeeder;
use Gz168\ApiDoc\Livewire\ApiDocPage;
use Gz168\ApiDoc\Models\ApiDocDisplayMode;
use Gz168\ApiDoc\Models\ApiDocSection;
use Gz168\ApiDoc\Models\ApiDocSetting;
use Gz168\ApiDoc\Models\ApiDocTemplate;
use Gz168\ApiDoc\Services\ApiDocCacheManager;
use Gz168\ApiDoc\Services\ApiDocDisplayModeResolver;
use Gz168\ApiDoc\Services\ApiDocRenderer;
use Gz168\ApiDoc\Services\ApiDocTemplateResolver;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Mockery;
use PHPUnit\Framework\Attributes\Test;
use RuntimeException;
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

        ApiDocTemplate::factory()->create([
            'code' => 'alt',
            'label' => 'Alt',
            'sort' => 50,
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

    #[Test]
    public function front_page_throws_when_template_views_are_missing(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);
        ApiDocSetting::current();

        ApiDocTemplate::factory()->create([
            'code' => 'broken',
            'label' => 'Broken',
            'sort' => 90,
        ]);

        $mode = ApiDocDisplayMode::query()->where('code', 'fr')->firstOrFail();
        $mode->forceFill(['template_key' => 'broken'])->saveQuietly();

        $page = new ApiDocPage;
        $page->mode = 'fr';

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('views are missing');

        $page->render(
            app(ApiDocDisplayModeResolver::class),
            app(ApiDocTemplateResolver::class),
        );
    }

    #[Test]
    public function ui_cache_keys_include_template_key(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);

        $cache = Mockery::mock(ApiDocCacheManager::class);
        $cache->shouldReceive('remember')
            ->once()
            ->withArgs(fn (string $key): bool => $key === 'ui:fr:classic:html')
            ->andReturn(['nav.home' => 'Home']);

        $this->app->instance(ApiDocCacheManager::class, $cache);
        $this->app->forgetInstance(ApiDocRenderer::class);

        app(ApiDocRenderer::class)->uiStrings('fr', html: true);
    }

    #[Test]
    public function flush_forgets_legacy_and_template_scoped_render_html_keys(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);

        config([
            'api-doc.cache.store' => 'array',
            'api-doc.cache.ttl' => 3600,
            'api-doc.cache.key_prefix' => 'api_doc:',
        ]);

        $this->app->forgetInstance(ApiDocCacheManager::class);
        $this->app->forgetInstance(ApiDocRenderer::class);

        $store = Cache::store('array');
        $manager = app(ApiDocCacheManager::class);

        $legacyKey = $manager->key('render:fr:html');
        $templateKey = $manager->key('render:fr:classic:html');

        $store->put($legacyKey, ['legacy' => true], 3600);
        $store->put($templateKey, ['template' => true], 3600);

        $this->assertTrue($store->has($legacyKey));
        $this->assertTrue($store->has($templateKey));

        $manager->flush();

        $this->assertFalse($store->has($legacyKey));
        $this->assertFalse($store->has($templateKey));
    }
}
