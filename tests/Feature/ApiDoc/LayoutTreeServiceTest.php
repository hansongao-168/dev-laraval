<?php

declare(strict_types=1);

namespace Tests\Feature\ApiDoc;

use App\Models\User;
use Gz168\ApiDoc\Database\Seeders\ApiDocTemplateSeeder;
use Gz168\ApiDoc\Layout\LayoutTreeDefaults;
use Gz168\ApiDoc\Layout\LayoutTreeService;
use Gz168\ApiDoc\Models\ApiDocTemplate;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class LayoutTreeServiceTest extends TestCase
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
    public function save_dual_writes_tree_and_page(): void
    {
        $this->actingAsLayoutAdmin();
        $this->seed(ApiDocTemplateSeeder::class);
        $t = ApiDocTemplate::query()->where('code', 'classic')->firstOrFail();
        $t->layout_visual_enabled = true;
        $t->save();

        $tree = LayoutTreeDefaults::tree();
        app(LayoutTreeService::class)->save($t, $tree);
        $t->refresh();
        $this->assertNotNull($t->layout_tree);
        $page = (string) ($t->body_parts['page'] ?? '');
        $this->assertStringContainsString("api_doc_part('header'", $page);
        $this->assertStringContainsString('=>', $page);
        $this->assertStringNotContainsString('=&gt;', $page);
    }

    #[Test]
    public function disabled_visual_does_not_require_tree_for_runtime_page(): void
    {
        $this->seed(ApiDocTemplateSeeder::class);
        $t = ApiDocTemplate::query()->where('code', 'classic')->firstOrFail();
        $t->layout_visual_enabled = false;
        $t->save();
        $this->assertNull(app(LayoutTreeService::class)->resolveEffectivePage($t));
    }

    #[Test]
    public function unauthorized_layout_tree_mutation_is_restored(): void
    {
        $this->seed(ApiDocTemplateSeeder::class);
        $t = ApiDocTemplate::query()->where('code', 'classic')->firstOrFail();
        $originalTree = $t->layout_tree;

        $t->layout_tree = LayoutTreeDefaults::tree();
        $t->save();
        $t->refresh();

        $this->assertSame($originalTree, $t->layout_tree);
    }
}
