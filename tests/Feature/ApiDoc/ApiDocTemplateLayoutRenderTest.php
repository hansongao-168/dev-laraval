<?php

declare(strict_types=1);

namespace Tests\Feature\ApiDoc;

use App\Models\User;
use Gz168\ApiDoc\Database\Seeders\ApiDocDisplayModeSeeder;
use Gz168\ApiDoc\Database\Seeders\ApiDocTemplateSeeder;
use Gz168\ApiDoc\Layout\LayoutTreeDefaults;
use Gz168\ApiDoc\Layout\LayoutTreeService;
use Gz168\ApiDoc\Models\ApiDocSection;
use Gz168\ApiDoc\Models\ApiDocSetting;
use Gz168\ApiDoc\Models\ApiDocTemplate;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ApiDocTemplateLayoutRenderTest extends TestCase
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
    public function visual_layout_hides_carriers_when_tree_marks_invisible(): void
    {
        $this->actingAsLayoutAdmin();
        $this->seed(ApiDocTemplateSeeder::class);
        $this->seed(ApiDocDisplayModeSeeder::class);
        ApiDocSetting::current();
        ApiDocSection::factory()->create(['slug' => 'intro', 'is_intro' => true]);

        $t = ApiDocTemplate::query()->where('code', 'classic')->firstOrFail();
        $tree = LayoutTreeDefaults::tree();
        foreach ($tree['nodes'] as &$node) {
            if ($node['part'] === 'carriers_section') {
                $node['visible'] = false;
            }
        }
        unset($node);

        app(LayoutTreeService::class)->save($t, $tree);

        // Clear page so front must use resolveEffectivePage (tree) rather than
        // the classic blade file fallback (which still includes carriers).
        $t->refresh();
        $t->layout_visual_enabled = false;
        $t->save();
        $parts = is_array($t->body_parts) ? $t->body_parts : [];
        $parts['page'] = '';
        $t->body_parts = $parts;
        $t->save();
        $t->layout_visual_enabled = true;
        $t->save();

        $this->assertSame('', trim((string) ($t->fresh()->body_parts['page'] ?? '')));

        $this->get('/api-doc')
            ->assertOk()
            ->assertDontSee('id="transporteurs"', false);
    }
}
