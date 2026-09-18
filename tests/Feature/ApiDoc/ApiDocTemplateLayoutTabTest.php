<?php

declare(strict_types=1);

namespace Tests\Feature\ApiDoc;

use App\Models\User;
use Filament\Facades\Filament;
use Gz168\ApiDoc\Database\Seeders\ApiDocTemplateSeeder;
use Gz168\ApiDoc\Enums\ApiDocLayoutEditor;
use Gz168\ApiDoc\Filament\Resources\ApiDocTemplateResource\Pages\EditApiDocTemplate;
use Gz168\ApiDoc\Layout\LayoutTreeDefaults;
use Gz168\ApiDoc\Layout\LayoutTreeService;
use Gz168\ApiDoc\Models\ApiDocTemplate;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Livewire\Livewire;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ApiDocTemplateLayoutTabTest extends TestCase
{
    use LazilyRefreshDatabase;

    private function actingAsFilamentAdmin(): User
    {
        $admin = User::factory()->make();
        $admin->forceFill([
            'is_protected' => true,
            'is_super_admin' => true,
        ])->saveQuietly();

        $this->actingAs($admin);
        Filament::setCurrentPanel(Filament::getPanel('admin'));

        return $admin;
    }

    #[Test]
    public function admin_can_reorder_layout_via_livewire_and_persist_tree_and_page(): void
    {
        $this->seed(ApiDocTemplateSeeder::class);
        $this->actingAsFilamentAdmin();

        $template = ApiDocTemplate::query()->where('code', 'classic')->firstOrFail();
        $template->layout_visual_enabled = true;
        $template->layout_editor = ApiDocLayoutEditor::FilamentTab->value;
        $template->save();

        app(LayoutTreeService::class)->save($template, LayoutTreeDefaults::tree());
        $template->refresh();

        $this->assertSame('header', $template->layout_tree['nodes'][0]['part']);
        $this->assertSame('nav', $template->layout_tree['nodes'][1]['part']);

        Livewire::test(EditApiDocTemplate::class, ['record' => $template->getKey()])
            ->assertSet('layoutTreeNodes.0.part', 'header')
            ->assertSet('layoutTreeNodes.1.part', 'nav')
            ->call('moveLayoutNodeDown', 0)
            ->assertSet('layoutTreeNodes.0.part', 'nav')
            ->assertSet('layoutTreeNodes.1.part', 'header')
            ->call('saveLayout')
            ->assertHasNoErrors();

        $fresh = $template->fresh();
        $this->assertSame('nav', $fresh->layout_tree['nodes'][0]['part']);
        $this->assertSame('header', $fresh->layout_tree['nodes'][1]['part']);

        $page = (string) ($fresh->body_parts['page'] ?? '');
        $navPos = strpos($page, "api_doc_part('nav'");
        $headerPos = strpos($page, "api_doc_part('header'");
        $this->assertNotFalse($navPos);
        $this->assertNotFalse($headerPos);
        $this->assertLessThan($headerPos, $navPos);
    }

    #[Test]
    public function save_layout_requires_visual_enabled(): void
    {
        $this->seed(ApiDocTemplateSeeder::class);
        $this->actingAsFilamentAdmin();

        $template = ApiDocTemplate::query()->where('code', 'classic')->firstOrFail();
        $template->layout_visual_enabled = false;
        $template->layout_editor = ApiDocLayoutEditor::FilamentTab->value;
        $template->save();

        app(LayoutTreeService::class)->save($template, LayoutTreeDefaults::tree());
        $template->refresh();
        $before = $template->layout_tree;

        Livewire::test(EditApiDocTemplate::class, ['record' => $template->getKey()])
            ->call('moveLayoutNodeDown', 0)
            ->assertSet('layoutTreeNodes.0.part', 'header')
            ->call('saveLayout');

        $this->assertSame($before, $template->fresh()->layout_tree);
    }

    #[Test]
    public function toggle_visibility_updates_working_nodes_before_save(): void
    {
        $this->seed(ApiDocTemplateSeeder::class);
        $this->actingAsFilamentAdmin();

        $template = ApiDocTemplate::query()->where('code', 'classic')->firstOrFail();
        $template->layout_visual_enabled = true;
        $template->layout_editor = ApiDocLayoutEditor::FilamentTab->value;
        $template->save();
        app(LayoutTreeService::class)->save($template, LayoutTreeDefaults::tree());

        Livewire::test(EditApiDocTemplate::class, ['record' => $template->getKey()])
            ->assertSet('layoutTreeNodes.4.part', 'carriers_section')
            ->assertSet('layoutTreeNodes.4.visible', true)
            ->call('toggleLayoutNodeVisible', 4)
            ->assertSet('layoutTreeNodes.4.visible', false)
            ->call('saveLayout');

        $this->assertFalse((bool) $template->fresh()->layout_tree['nodes'][4]['visible']);
        $this->assertStringNotContainsString(
            "api_doc_part('carriers_section'",
            (string) ($template->fresh()->body_parts['page'] ?? ''),
        );
    }
}
