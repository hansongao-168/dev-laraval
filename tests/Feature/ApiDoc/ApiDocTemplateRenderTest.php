<?php

declare(strict_types=1);

namespace Tests\Feature\ApiDoc;

use Gz168\ApiDoc\Database\Seeders\ApiDocDisplayModeSeeder;
use Gz168\ApiDoc\Database\Seeders\ApiDocTemplateSeeder;
use Gz168\ApiDoc\Models\ApiDocSection;
use Gz168\ApiDoc\Models\ApiDocSetting;
use Gz168\ApiDoc\Models\ApiDocTemplate;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ApiDocTemplateRenderTest extends TestCase
{
    use LazilyRefreshDatabase;

    #[Test]
    public function non_empty_header_part_overrides_file(): void
    {
        $this->seed(ApiDocTemplateSeeder::class);
        $this->seed(ApiDocDisplayModeSeeder::class);
        ApiDocSetting::current();
        ApiDocSection::factory()->create(['slug' => 'intro', 'is_intro' => true]);
        $classic = ApiDocTemplate::query()->where('code', 'classic')->firstOrFail();
        $classic->body_parts = ['header' => '<div class="langs">OVERRIDE-HEADER</div>'];
        $classic->save();

        $this->get('/api-doc')->assertOk()->assertSee('OVERRIDE-HEADER', false);
    }

    #[Test]
    public function empty_parts_keep_classic_markup(): void
    {
        $this->seed(ApiDocTemplateSeeder::class);
        $this->seed(ApiDocDisplayModeSeeder::class);
        ApiDocSetting::current();
        ApiDocSection::factory()->create(['slug' => 'intro', 'is_intro' => true]);

        $this->get('/api-doc')->assertOk()->assertSee('class="wrap"', false);
    }
}
