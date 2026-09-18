<?php

declare(strict_types=1);

namespace Tests\Feature\ApiDoc;

use App\Models\User;
use Gz168\ApiDoc\Database\Seeders\ApiDocTemplateSeeder;
use Gz168\ApiDoc\Models\ApiDocTemplate;
use Gz168\ApiDoc\Support\ApiDocTemplateJsGate;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ApiDocTemplateJsSaveTest extends TestCase
{
    use LazilyRefreshDatabase;

    #[Test]
    public function non_admin_save_reverts_js_text(): void
    {
        $this->seed(ApiDocTemplateSeeder::class);
        $classic = ApiDocTemplate::query()->where('code', 'classic')->firstOrFail();

        $classic->js_text = 'console.log(1);';
        $classic->save();

        $this->assertNull($classic->fresh()->js_text);
    }

    #[Test]
    public function protected_super_admin_can_save_js_text(): void
    {
        $this->seed(ApiDocTemplateSeeder::class);
        $admin = User::factory()->create([
            'is_protected' => true,
            'is_super_admin' => true,
        ]);
        $this->actingAs($admin);

        $classic = ApiDocTemplate::query()->where('code', 'classic')->firstOrFail();
        $classic->js_text = 'console.log("ok");';
        $classic->save();

        $this->assertSame('console.log("ok");', $classic->fresh()->js_text);
        $this->assertTrue(ApiDocTemplateJsGate::allows($admin));
    }
}
