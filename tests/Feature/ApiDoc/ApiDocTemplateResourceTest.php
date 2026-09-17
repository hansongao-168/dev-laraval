<?php

declare(strict_types=1);

namespace Tests\Feature\ApiDoc;

use App\Models\User;
use Filament\Facades\Filament;
use Gz168\ApiDoc\Database\Seeders\ApiDocTemplateSeeder;
use Gz168\ApiDoc\Filament\Resources\ApiDocTemplateResource\Pages\CreateApiDocTemplate;
use Gz168\ApiDoc\Filament\Resources\ApiDocTemplateResource\Pages\EditApiDocTemplate;
use Gz168\ApiDoc\Models\ApiDocTemplate;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\File;
use Livewire\Livewire;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ApiDocTemplateResourceTest extends TestCase
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

    private function actingAsFilamentNonProtectedAdmin(): User
    {
        $admin = User::factory()->make();
        $admin->forceFill([
            'is_protected' => false,
            'is_super_admin' => true,
        ])->saveQuietly();

        $this->actingAs($admin);
        Filament::setCurrentPanel(Filament::getPanel('admin'));

        return $admin;
    }

    #[Test]
    public function filament_can_create_template(): void
    {
        $this->seed(ApiDocTemplateSeeder::class);
        $this->actingAsFilamentAdmin();

        Livewire::test(CreateApiDocTemplate::class)
            ->fillForm([
                'code' => 'skin-a',
                'label' => 'Skin A',
                'sort' => 20,
                'is_active' => true,
            ])
            ->call('create')
            ->assertHasNoFormErrors();

        $row = ApiDocTemplate::query()->where('code', 'skin-a')->firstOrFail();
        $this->assertSame('gz168-api-doc::front-skin-a', $row->views_prefix);
        $this->assertArrayHasKey('page', $row->body_parts);
        $this->assertNotEmpty($row->css_text);
        $this->assertNotNull($row->js_text);

        $dir = dirname(__DIR__, 3).'/gz168/ApiDoc/resources/views/front-skin-a';
        if (is_dir($dir)) {
            File::deleteDirectory($dir);
        }
    }

    #[Test]
    public function edit_page_has_part_fields_and_sanitizes_header(): void
    {
        $this->seed(ApiDocTemplateSeeder::class);
        $this->actingAsFilamentAdmin();
        $classic = ApiDocTemplate::query()->where('code', 'classic')->firstOrFail();

        Livewire::test(EditApiDocTemplate::class, ['record' => $classic->getKey()])
            ->assertFormFieldExists('body_parts.header')
            ->fillForm([
                'label' => $classic->label,
                'sort' => $classic->sort,
                'is_active' => true,
                'body_parts' => [
                    'header' => '<script>x</script><div class="langs">ok-header</div>',
                ],
            ])
            ->call('save')
            ->assertHasNoFormErrors();

        $header = (string) ($classic->fresh()->body_parts['header'] ?? '');
        $this->assertStringContainsString('ok-header', $header);
        $this->assertStringNotContainsString('<script', $header);
    }

    #[Test]
    public function non_protected_admin_does_not_see_js_text_field(): void
    {
        $this->seed(ApiDocTemplateSeeder::class);
        $this->actingAsFilamentNonProtectedAdmin();

        $classic = ApiDocTemplate::query()->where('code', 'classic')->firstOrFail();

        Livewire::test(EditApiDocTemplate::class, ['record' => $classic->getKey()])
            ->assertFormFieldIsHidden('js_text');
    }

    #[Test]
    public function protected_admin_sees_js_text_and_preview_iframe(): void
    {
        $this->seed(ApiDocTemplateSeeder::class);
        $this->actingAsFilamentAdmin();

        $classic = ApiDocTemplate::query()->where('code', 'classic')->firstOrFail();

        Livewire::test(EditApiDocTemplate::class, ['record' => $classic->getKey()])
            ->assertFormFieldExists('js_text')
            ->assertSeeHtml('template_preview=classic');
    }
}
