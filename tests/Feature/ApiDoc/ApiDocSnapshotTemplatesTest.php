<?php

declare(strict_types=1);

namespace Tests\Feature\ApiDoc;

use Gz168\ApiDoc\Database\Seeders\ApiDocDisplayModeSeeder;
use Gz168\ApiDoc\Models\ApiDocTemplate;
use Gz168\ApiDoc\Services\ApiDocExporter;
use Gz168\ApiDoc\Services\ApiDocImporter;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use RuntimeException;
use Tests\TestCase;

class ApiDocSnapshotTemplatesTest extends TestCase
{
    use LazilyRefreshDatabase;

    #[Test]
    public function export_includes_templates_with_body_parts(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);
        $classic = ApiDocTemplate::query()->where('code', 'classic')->firstOrFail();
        $classic->body_parts = ['header' => '<div>H</div>'];
        $classic->save();

        $payload = app(ApiDocExporter::class)->exportAll();

        $this->assertArrayHasKey('templates', $payload);
        $row = collect($payload['templates'])->firstWhere('code', 'classic');
        $this->assertSame('经典', $row['label']);
        $this->assertStringContainsString('H', (string) ($row['body_parts']['header'] ?? ''));
    }

    #[Test]
    public function import_round_trips_and_sanitizes_parts(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);
        $payload = app(ApiDocExporter::class)->exportAll();
        $payload['templates'][0]['body_parts'] = [
            'header' => '<script>bad</script><div class="langs">clean</div>',
        ];

        app(ApiDocImporter::class)->import($payload, ApiDocImporter::MODE_OVERWRITE);

        $header = (string) (ApiDocTemplate::query()->where('code', 'classic')->firstOrFail()->body_parts['header'] ?? '');
        $this->assertStringContainsString('clean', $header);
        $this->assertStringNotContainsString('<script', $header);
    }

    #[Test]
    public function import_rejects_unknown_template_key_on_display_modes(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);
        $payload = app(ApiDocExporter::class)->exportAll();
        $payload['display_modes'][0]['template_key'] = 'not-a-skin';

        $this->expectException(RuntimeException::class);
        app(ApiDocImporter::class)->import($payload, ApiDocImporter::MODE_OVERWRITE);
    }
}
