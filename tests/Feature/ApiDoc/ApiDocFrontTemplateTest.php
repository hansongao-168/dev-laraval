<?php

declare(strict_types=1);

namespace Tests\Feature\ApiDoc;

use Gz168\ApiDoc\Database\Seeders\ApiDocDisplayModeSeeder;
use Gz168\ApiDoc\Models\ApiDocDisplayMode;
use Gz168\ApiDoc\Models\ApiDocSection;
use Gz168\ApiDoc\Models\ApiDocSetting;
use Gz168\ApiDoc\Services\ApiDocRenderer;
use Gz168\ApiDoc\Services\ApiDocTemplateResolver;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
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
    public function renderer_payload_includes_resolved_template_key(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);
        ApiDocSetting::current();
        ApiDocSection::factory()->create(['slug' => 'oauth', 'verb' => 'POST', 'path' => '/x']);

        $payload = app(ApiDocRenderer::class)->render('fr', html: true);

        $this->assertSame('classic', $payload['template']);
    }

    #[Test]
    public function different_template_keys_resolve_distinct_cache_key_segments(): void
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

        $mode = ApiDocDisplayMode::query()->where('code', 'fr')->firstOrFail();
        $templates = app(ApiDocTemplateResolver::class);

        $mode->forceFill(['template_key' => 'classic'])->saveQuietly();
        $classic = $templates->resolve($mode->fresh()->template_key, $mode->code);
        $this->assertSame('classic', $classic->key);

        $mode->forceFill(['template_key' => 'alt'])->saveQuietly();
        $alt = $templates->resolve($mode->fresh()->template_key, $mode->code);
        $this->assertSame('alt', $alt->key);

        $this->app->forgetInstance(ApiDocRenderer::class);
        $payload = app(ApiDocRenderer::class)->render('fr', html: true);
        $this->assertSame('alt', $payload['template']);
    }
}
