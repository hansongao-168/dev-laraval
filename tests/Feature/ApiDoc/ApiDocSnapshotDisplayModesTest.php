<?php

declare(strict_types=1);

namespace Tests\Feature\ApiDoc;

use Gz168\ApiDoc\Database\Seeders\ApiDocDisplayModeSeeder;
use Gz168\ApiDoc\Models\ApiDocDisplayMode;
use Gz168\ApiDoc\Services\ApiDocExporter;
use Gz168\ApiDoc\Services\ApiDocImporter;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use RuntimeException;
use Tests\TestCase;

class ApiDocSnapshotDisplayModesTest extends TestCase
{
    use LazilyRefreshDatabase;

    #[Test]
    public function export_includes_display_modes_with_template_key(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);
        $payload = app(ApiDocExporter::class)->exportAll();

        $this->assertArrayHasKey('display_modes', $payload);
        $this->assertCount(5, $payload['display_modes']);
        $fr = collect($payload['display_modes'])->firstWhere('code', 'fr');
        $this->assertSame('classic', $fr['template_key']);
        $this->assertSame(['fr'], $fr['locales']);
    }

    #[Test]
    public function import_round_trips_template_key(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);
        $payload = app(ApiDocExporter::class)->exportAll();

        ApiDocDisplayMode::query()->where('code', 'zh')->update(['template_key' => 'classic', 'label' => '中文-改']);

        app(ApiDocImporter::class)->import($payload, ApiDocImporter::MODE_OVERWRITE);

        $zh = ApiDocDisplayMode::query()->where('code', 'zh')->firstOrFail();
        $this->assertSame('classic', $zh->template_key);
        $this->assertSame(
            collect($payload['display_modes'])->firstWhere('code', 'zh')['label'],
            $zh->label,
        );
    }

    #[Test]
    public function import_rejects_unknown_template_key(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);
        $payload = app(ApiDocExporter::class)->exportAll();
        $payload['display_modes'][0]['template_key'] = 'not-a-skin';

        $this->expectException(RuntimeException::class);
        app(ApiDocImporter::class)->import($payload, ApiDocImporter::MODE_OVERWRITE);
    }
}
