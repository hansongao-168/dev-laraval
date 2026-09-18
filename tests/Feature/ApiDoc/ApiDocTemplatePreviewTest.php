<?php

declare(strict_types=1);

namespace Tests\Feature\ApiDoc;

use App\Models\User;
use Gz168\ApiDoc\Database\Seeders\ApiDocTemplateSeeder;
use Gz168\ApiDoc\Models\ApiDocSection;
use Gz168\ApiDoc\Models\ApiDocSetting;
use Gz168\ApiDoc\Models\ApiDocTemplate;
use Gz168\ApiDoc\Services\ApiDocTemplateResolver;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\File;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ApiDocTemplatePreviewTest extends TestCase
{
    use LazilyRefreshDatabase;

    private function packageRoot(): string
    {
        return dirname(__DIR__, 3).'/gz168/ApiDoc';
    }

    private function ensureIdleViews(): void
    {
        $src = $this->packageRoot().'/resources/views/front';
        $dst = $this->packageRoot().'/resources/views/front-idle';
        File::ensureDirectoryExists($dst);
        File::copyDirectory($src, $dst);
    }

    private function cleanupIdleViews(): void
    {
        File::deleteDirectory($this->packageRoot().'/resources/views/front-idle');
    }

    #[Test]
    public function unauthorized_user_ignores_template_preview(): void
    {
        $this->seed(ApiDocTemplateSeeder::class);
        ApiDocSetting::current();
        ApiDocSection::factory()->create(['slug' => 'intro', 'is_intro' => true]);

        ApiDocTemplate::factory()->create([
            'code' => 'idle',
            'views_prefix' => ApiDocTemplate::prefixForCode('idle'),
            'is_active' => false,
        ]);

        $response = $this->get('/api-doc?template_preview=idle');
        $response->assertOk();

        $resolver = app(ApiDocTemplateResolver::class);
        $resolved = $resolver->resolvePreviewCode('idle');
        $this->assertNotNull($resolved);
        $this->assertSame('idle', $resolved->key);
        $this->assertFalse((bool) ApiDocTemplate::query()->where('code', 'idle')->value('is_active'));
    }

    #[Test]
    public function authorized_viewer_forces_inactive_skin(): void
    {
        $this->seed(ApiDocTemplateSeeder::class);
        ApiDocSetting::current();
        ApiDocSection::factory()->create(['slug' => 'intro', 'is_intro' => true]);

        ApiDocTemplate::factory()->create([
            'code' => 'idle',
            'views_prefix' => ApiDocTemplate::prefixForCode('idle'),
            'is_active' => false,
        ]);

        $this->ensureIdleViews();

        try {
            $admin = User::factory()->create([
                'is_protected' => true,
                'is_super_admin' => true,
            ]);
            $this->actingAs($admin);

            $resolved = app(ApiDocTemplateResolver::class)->resolvePreviewCode('idle');
            $this->assertNotNull($resolved);
            $this->assertSame('idle', $resolved->key);

            $this->get('/api-doc?template_preview=idle')->assertOk();
        } finally {
            $this->cleanupIdleViews();
        }
    }

    #[Test]
    public function resolve_returns_null_for_unknown_or_trashed_code(): void
    {
        $this->seed(ApiDocTemplateSeeder::class);
        $this->assertNull(app(ApiDocTemplateResolver::class)->resolvePreviewCode('nope'));

        ApiDocTemplate::factory()->create([
            'code' => 'placeholder',
            'views_prefix' => ApiDocTemplate::prefixForCode('placeholder'),
            'is_active' => true,
            'sort' => 200,
        ]);

        $classic = ApiDocTemplate::query()->where('code', 'classic')->firstOrFail();
        $classic->delete();
        $this->assertNull(app(ApiDocTemplateResolver::class)->resolvePreviewCode('classic'));
    }
}
