<?php

declare(strict_types=1);

namespace Tests\Feature\ApiDoc;

use App\Models\User;
use Filament\Facades\Filament;
use Gz168\ApiDoc\Database\Seeders\ApiDocPermissionSeeder;
use Gz168\ApiDoc\Database\Seeders\ApiDocTemplateSeeder;
use Gz168\ApiDoc\Enums\ApiDocLayoutEditor;
use Gz168\ApiDoc\Filament\Pages\ApiDocTemplateLayoutEditorPage;
use Gz168\ApiDoc\Layout\LayoutTreeDefaults;
use Gz168\ApiDoc\Layout\LayoutTreeService;
use Gz168\ApiDoc\Models\ApiDocTemplate;
use Gz168\RolePermission\Models\Permission;
use Gz168\RolePermission\Models\Role;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Livewire\Livewire;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ApiDocTemplateLayoutEditorPageTest extends TestCase
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

    private function prepareLivewirePageTemplate(): ApiDocTemplate
    {
        $this->seed(ApiDocTemplateSeeder::class);

        $template = ApiDocTemplate::query()->where('code', 'classic')->firstOrFail();
        $template->layout_visual_enabled = true;
        $template->layout_editor = ApiDocLayoutEditor::LivewirePage->value;
        $template->save();

        app(LayoutTreeService::class)->save($template, LayoutTreeDefaults::tree());

        return $template->fresh();
    }

    #[Test]
    public function admin_can_mount_layout_editor_page(): void
    {
        $this->actingAsFilamentAdmin();
        $template = $this->prepareLivewirePageTemplate();

        Livewire::test(ApiDocTemplateLayoutEditorPage::class, ['record' => $template->getKey()])
            ->assertOk()
            ->assertSet('layoutTreeNodes.0.part', 'header')
            ->assertSee('结构预览');
    }

    #[Test]
    public function admin_can_reorder_and_save_layout_via_page(): void
    {
        $this->actingAsFilamentAdmin();
        $template = $this->prepareLivewirePageTemplate();

        Livewire::test(ApiDocTemplateLayoutEditorPage::class, ['record' => $template->getKey()])
            ->call('moveLayoutNodeDown', 0)
            ->assertSet('layoutTreeNodes.0.part', 'nav')
            ->assertSet('layoutTreeNodes.1.part', 'header')
            ->call('saveLayout')
            ->assertHasNoErrors();

        $fresh = $template->fresh();
        $this->assertSame('nav', $fresh->layout_tree['nodes'][0]['part']);
        $this->assertSame('header', $fresh->layout_tree['nodes'][1]['part']);
    }

    #[Test]
    public function save_layout_without_gate_fails_soft(): void
    {
        $this->actingAsFilamentAdmin();
        $template = $this->prepareLivewirePageTemplate();
        $before = $template->layout_tree;

        $this->artisan('migrate', [
            '--path' => 'gz168/RolePermission/src/Database/Migrations',
            '--force' => true,
        ])->assertSuccessful();
        $this->seed(ApiDocPermissionSeeder::class);

        $viewPermission = Permission::query()
            ->where('slug', 'api-doc.view')
            ->firstOrFail();

        $role = Role::query()->create([
            'name' => 'Api Doc Viewer',
            'slug' => 'api-doc-viewer-layout-test',
        ]);
        $role->permissions()->sync([$viewPermission->getKey()]);

        $user = User::factory()->make();
        $user->forceFill([
            'is_protected' => false,
            'is_super_admin' => false,
            'is_admin' => false,
        ])->saveQuietly();
        $user->roles()->attach($role->getKey());

        $this->actingAs($user);
        Filament::setCurrentPanel(Filament::getPanel('admin'));

        Livewire::test(ApiDocTemplateLayoutEditorPage::class, ['record' => $template->getKey()])
            ->call('moveLayoutNodeDown', 0)
            ->assertSet('layoutTreeNodes.0.part', 'header')
            ->call('saveLayout');

        $this->assertSame($before, $template->fresh()->layout_tree);
    }

    #[Test]
    public function grapesjs_editor_loads_root_and_save_layout_persists_tree(): void
    {
        $this->withoutVite();
        $this->actingAsFilamentAdmin();
        $template = $this->prepareLivewirePageTemplate();
        $template->layout_editor = ApiDocLayoutEditor::GrapesJs->value;
        $template->save();

        $nodes = LayoutTreeDefaults::tree()['nodes'];
        $first = $nodes[0];
        array_shift($nodes);
        $nodes[] = $first;
        $nodes = array_values($nodes);

        Livewire::test(ApiDocTemplateLayoutEditorPage::class, ['record' => $template->getKey()])
            ->assertOk()
            ->assertSeeHtml('id="api-doc-grapes-root"')
            ->call('applyLayoutFromGrapes', $nodes)
            ->assertSet('layoutTreeNodes.0.part', 'nav')
            ->assertSet('layoutTreeNodes.6.part', 'header')
            ->call('saveLayout')
            ->assertHasNoErrors();

        $fresh = $template->fresh();
        $this->assertSame('nav', $fresh->layout_tree['nodes'][0]['part']);
        $this->assertSame('header', $fresh->layout_tree['nodes'][6]['part']);
    }

    #[Test]
    public function grapesjs_selected_part_preview_reads_body_parts(): void
    {
        $this->withoutVite();
        $this->actingAsFilamentAdmin();
        $template = $this->prepareLivewirePageTemplate();
        $template->layout_editor = ApiDocLayoutEditor::GrapesJs->value;
        $parts = is_array($template->body_parts) ? $template->body_parts : [];
        $parts['header'] = '<div class="preview-header">Header Preview</div>';
        $template->body_parts = $parts;
        $template->save();

        Livewire::test(ApiDocTemplateLayoutEditorPage::class, ['record' => $template->getKey()])
            ->assertOk()
            ->set('selectedPart', 'header')
            ->assertSet('selectedPartPreviewHtml', '<div class="preview-header">Header Preview</div>');
    }
}
