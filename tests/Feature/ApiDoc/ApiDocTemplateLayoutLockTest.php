<?php

declare(strict_types=1);

namespace Tests\Feature\ApiDoc;

use App\Models\User;
use Filament\Facades\Filament;
use Gz168\ApiDoc\Database\Seeders\ApiDocTemplateSeeder;
use Gz168\ApiDoc\Filament\Resources\ApiDocTemplateResource\Pages\EditApiDocTemplate;
use Gz168\ApiDoc\Layout\LayoutTreeDefaults;
use Gz168\ApiDoc\Layout\LayoutTreeService;
use Gz168\ApiDoc\Models\ApiDocTemplate;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Livewire\Livewire;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ApiDocTemplateLayoutLockTest extends TestCase
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
    public function enabled_visual_ignores_page_tampering_on_edit(): void
    {
        $this->seed(ApiDocTemplateSeeder::class);
        $this->actingAsFilamentAdmin();
        $t = ApiDocTemplate::query()->where('code', 'classic')->firstOrFail();
        $tree = LayoutTreeDefaults::tree();
        app(LayoutTreeService::class)->save($t, $tree);
        $t->layout_visual_enabled = true;
        $t->save();
        $before = $t->fresh()->body_parts['page'];

        Livewire::test(EditApiDocTemplate::class, ['record' => $t->getKey()])
            ->assertFormFieldExists('layout_visual_enabled')
            ->assertFormFieldExists('layout_editor')
            ->fillForm([
                'body_parts.page' => '<div>TAMPER</div>',
                'layout_visual_enabled' => true,
            ])
            ->call('save')
            ->assertHasNoFormErrors();

        $this->assertSame($before, $t->fresh()->body_parts['page']);
        $this->assertStringNotContainsString('TAMPER', (string) $t->fresh()->body_parts['page']);
    }
}
