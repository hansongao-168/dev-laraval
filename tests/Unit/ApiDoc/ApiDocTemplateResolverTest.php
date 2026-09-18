<?php

declare(strict_types=1);

namespace Tests\Unit\ApiDoc;

use Gz168\ApiDoc\Database\Seeders\ApiDocTemplateSeeder;
use Gz168\ApiDoc\Models\ApiDocTemplate;
use Gz168\ApiDoc\Services\ApiDocTemplateResolver;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Log;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ApiDocTemplateResolverTest extends TestCase
{
    use LazilyRefreshDatabase;

    #[Test]
    public function resolve_null_and_classic_use_default_skin(): void
    {
        $this->seed(ApiDocTemplateSeeder::class);
        $resolver = app(ApiDocTemplateResolver::class);

        $fromNull = $resolver->resolve(null);
        $fromClassic = $resolver->resolve('classic');

        $this->assertSame('classic', $fromNull->key);
        $this->assertSame('classic', $fromClassic->key);
        $this->assertSame('gz168-api-doc::front', $fromNull->viewsPrefix);
        $this->assertSame('gz168-api-doc::front.api-doc-page', $fromNull->view('api-doc-page'));
        $this->assertSame('gz168-api-doc::front.layout', $fromNull->view('layout'));
    }

    #[Test]
    public function resolve_unknown_key_falls_back_and_logs_warning(): void
    {
        $this->seed(ApiDocTemplateSeeder::class);
        Log::spy();
        $resolver = app(ApiDocTemplateResolver::class);

        $resolved = $resolver->resolve('nope', 'fr');

        $this->assertSame('classic', $resolved->key);
        Log::shouldHaveReceived('warning')->once();
    }

    #[Test]
    public function options_match_active_labels(): void
    {
        $this->seed(ApiDocTemplateSeeder::class);
        $options = app(ApiDocTemplateResolver::class)->options();

        $this->assertSame(['classic' => '经典'], $options);
        $this->assertTrue(app(ApiDocTemplateResolver::class)->isRegistered('classic'));
        $this->assertTrue(app(ApiDocTemplateResolver::class)->isSelectable('classic'));
        $this->assertFalse(app(ApiDocTemplateResolver::class)->isRegistered('nope'));
    }

    #[Test]
    public function resolve_falls_back_to_lowest_sort_active_row(): void
    {
        $this->seed(ApiDocTemplateSeeder::class);
        ApiDocTemplate::factory()->create([
            'code' => 'first',
            'label' => 'First',
            'is_active' => true,
            'sort' => 1,
        ]);
        Log::spy();

        $resolved = app(ApiDocTemplateResolver::class)->resolve('nope');

        $this->assertSame('first', $resolved->key);
        Log::shouldHaveReceived('warning')->once();
    }

    #[Test]
    public function inactive_key_is_registered_but_not_selectable(): void
    {
        $this->seed(ApiDocTemplateSeeder::class);
        ApiDocTemplate::factory()->create([
            'code' => 'idle',
            'is_active' => true,
            'sort' => 20,
        ]);
        $idle = ApiDocTemplate::query()->where('code', 'idle')->firstOrFail();
        $idle->is_active = false;
        $idle->save();

        $this->assertTrue(app(ApiDocTemplateResolver::class)->isRegistered('idle'));
        $this->assertFalse(app(ApiDocTemplateResolver::class)->isSelectable('idle'));
        $this->assertArrayNotHasKey('idle', app(ApiDocTemplateResolver::class)->options());
    }
}
