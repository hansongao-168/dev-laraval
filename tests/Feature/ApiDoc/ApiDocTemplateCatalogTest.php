<?php

declare(strict_types=1);

namespace Tests\Feature\ApiDoc;

use Gz168\ApiDoc\Database\Seeders\ApiDocTemplateSeeder;
use Gz168\ApiDoc\Models\ApiDocTemplate;
use Gz168\ApiDoc\Support\ApiDocTemplateParts;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use RuntimeException;
use Tests\TestCase;

class ApiDocTemplateCatalogTest extends TestCase
{
    use LazilyRefreshDatabase;

    #[Test]
    public function seeder_upserts_classic_with_file_fallback_prefix(): void
    {
        $this->seed(ApiDocTemplateSeeder::class);

        $row = ApiDocTemplate::query()->where('code', 'classic')->firstOrFail();
        $this->assertSame('经典', $row->label);
        $this->assertSame('gz168-api-doc::front', $row->views_prefix);
        $this->assertTrue($row->is_active);
        $this->assertSame([], $row->body_parts);
        $this->assertNull($row->css_text);
        $this->assertCount(12, ApiDocTemplateParts::KEYS);
    }

    #[Test]
    public function cannot_deactivate_last_active_template(): void
    {
        $this->seed(ApiDocTemplateSeeder::class);
        $classic = ApiDocTemplate::query()->where('code', 'classic')->firstOrFail();

        $this->expectException(RuntimeException::class);
        $classic->is_active = false;
        $classic->save();
    }

    #[Test]
    public function cannot_delete_last_active_template(): void
    {
        $this->seed(ApiDocTemplateSeeder::class);
        $classic = ApiDocTemplate::query()->where('code', 'classic')->firstOrFail();

        $this->expectException(RuntimeException::class);
        $classic->delete();
    }

    #[Test]
    public function saving_strips_script_from_body_parts(): void
    {
        $this->seed(ApiDocTemplateSeeder::class);
        $classic = ApiDocTemplate::query()->where('code', 'classic')->firstOrFail();
        $classic->body_parts = ['header' => '<script>x</script><div class="langs">ok</div>'];
        $classic->save();

        $this->assertStringContainsString('ok', (string) $classic->fresh()->body_parts['header']);
        $this->assertStringNotContainsString('<script', (string) $classic->fresh()->body_parts['header']);
    }
}
