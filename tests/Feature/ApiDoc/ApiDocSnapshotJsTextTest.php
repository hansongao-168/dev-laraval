<?php

declare(strict_types=1);

namespace Tests\Feature\ApiDoc;

use App\Models\User;
use Gz168\ApiDoc\Database\Seeders\ApiDocDisplayModeSeeder;
use Gz168\ApiDoc\Models\ApiDocTemplate;
use Gz168\ApiDoc\Services\ApiDocExporter;
use Gz168\ApiDoc\Services\ApiDocImporter;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ApiDocSnapshotJsTextTest extends TestCase
{
    use LazilyRefreshDatabase;

    private function actingAsProtectedAdmin(): User
    {
        $admin = User::factory()->create([
            'is_protected' => true,
            'is_super_admin' => true,
        ]);
        $this->actingAs($admin);

        return $admin;
    }

    #[Test]
    public function export_includes_js_text(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);
        $this->actingAsProtectedAdmin();

        $classic = ApiDocTemplate::query()->where('code', 'classic')->firstOrFail();
        $classic->js_text = 'console.log("snap");';
        $classic->save();

        $row = collect(app(ApiDocExporter::class)->exportAll()['templates'])
            ->firstWhere('code', 'classic');

        $this->assertSame('console.log("snap");', $row['js_text']);
    }

    #[Test]
    public function non_admin_import_preserves_existing_js_text(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);
        $this->actingAsProtectedAdmin();

        $classic = ApiDocTemplate::query()->where('code', 'classic')->firstOrFail();
        $classic->js_text = 'existing';
        $classic->save();

        $payload = app(ApiDocExporter::class)->exportAll();
        $payload['templates'][0]['js_text'] = 'from-snapshot';

        $nonProtected = User::factory()->create([
            'is_protected' => false,
            'is_super_admin' => true,
        ]);
        $this->actingAs($nonProtected);

        app(ApiDocImporter::class)->import($payload, ApiDocImporter::MODE_OVERWRITE);

        $this->assertSame('existing', $classic->fresh()->js_text);
    }

    #[Test]
    public function admin_import_overwrites_js_text(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);
        $this->actingAsProtectedAdmin();

        $payload = app(ApiDocExporter::class)->exportAll();
        $payload['templates'][0]['js_text'] = 'admin-update';

        app(ApiDocImporter::class)->import($payload, ApiDocImporter::MODE_OVERWRITE);

        $this->assertSame('admin-update', ApiDocTemplate::query()->where('code', 'classic')->value('js_text'));
    }
}
