<?php

declare(strict_types=1);

namespace Tests\Feature\ApiDoc;

use App\Models\User;
use Gz168\ApiDoc\Database\Seeders\ApiDocDisplayModeSeeder;
use Gz168\ApiDoc\Enums\ApiDocLayoutEditor;
use Gz168\ApiDoc\Layout\LayoutTreeDefaults;
use Gz168\ApiDoc\Models\ApiDocTemplate;
use Gz168\ApiDoc\Services\ApiDocExporter;
use Gz168\ApiDoc\Services\ApiDocImporter;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use RuntimeException;
use Tests\TestCase;

class ApiDocSnapshotLayoutVisualTest extends TestCase
{
    use LazilyRefreshDatabase;

    private function actingAsLayoutAdmin(): User
    {
        $admin = User::factory()->make();
        $admin->forceFill([
            'is_protected' => true,
            'is_super_admin' => true,
        ])->saveQuietly();

        $this->actingAs($admin);

        return $admin;
    }

    #[Test]
    public function export_and_import_round_trips_layout_fields(): void
    {
        $this->actingAsLayoutAdmin();
        $this->seed(ApiDocDisplayModeSeeder::class);
        $classic = ApiDocTemplate::query()->where('code', 'classic')->firstOrFail();
        $classic->layout_visual_enabled = true;
        $classic->layout_editor = ApiDocLayoutEditor::LivewirePage->value;
        $classic->layout_tree = LayoutTreeDefaults::tree();
        $classic->save();

        $payload = app(ApiDocExporter::class)->exportAll();
        $row = collect($payload['templates'])->firstWhere('code', 'classic');
        $this->assertTrue($row['layout_visual_enabled']);
        $this->assertSame('livewire_page', $row['layout_editor']);

        $payload['templates'][0]['layout_editor'] = 'nope';
        $this->expectException(RuntimeException::class);
        app(ApiDocImporter::class)->import($payload, ApiDocImporter::MODE_OVERWRITE);
    }

    #[Test]
    public function import_round_trips_valid_layout_and_rewrites_page(): void
    {
        $this->actingAsLayoutAdmin();
        $this->seed(ApiDocDisplayModeSeeder::class);
        $classic = ApiDocTemplate::query()->where('code', 'classic')->firstOrFail();
        $classic->layout_visual_enabled = true;
        $classic->layout_editor = ApiDocLayoutEditor::LivewirePage->value;
        $classic->layout_tree = LayoutTreeDefaults::tree();
        $parts = is_array($classic->body_parts) ? $classic->body_parts : [];
        $parts['page'] = '<!-- drifted-before-export -->';
        $classic->body_parts = $parts;
        $classic->save();

        $payload = app(ApiDocExporter::class)->exportAll();
        $index = collect($payload['templates'])->search(fn (array $t): bool => $t['code'] === 'classic');
        $this->assertNotFalse($index);
        $payload['templates'][$index]['body_parts']['page'] = '<!-- drifted-in-snapshot -->';
        $payload['templates'][$index]['layout_editor'] = ApiDocLayoutEditor::GrapesJs->value;

        app(ApiDocImporter::class)->import($payload, ApiDocImporter::MODE_OVERWRITE);

        $fresh = ApiDocTemplate::query()->where('code', 'classic')->firstOrFail();
        $this->assertTrue((bool) $fresh->layout_visual_enabled);
        $this->assertSame(ApiDocLayoutEditor::GrapesJs->value, $fresh->layout_editor);
        $this->assertIsArray($fresh->layout_tree);
        $this->assertSame(1, $fresh->layout_tree['version'] ?? null);

        $page = (string) ($fresh->body_parts['page'] ?? '');
        $this->assertStringContainsString("api_doc_part('header'", $page);
        $this->assertStringNotContainsString('drifted', $page);
        $this->assertStringContainsString('=>', $page);
        $this->assertStringNotContainsString('=&gt;', $page);
    }
}
