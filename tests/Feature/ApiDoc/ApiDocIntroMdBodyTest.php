<?php

declare(strict_types=1);

namespace Tests\Feature\ApiDoc;

use App\Models\User;
use Filament\Facades\Filament;
use Gz168\ApiDoc\Database\Seeders\ApiDocDisplayModeSeeder;
use Gz168\ApiDoc\Enums\ApiDocContentFormat;
use Gz168\ApiDoc\Filament\Resources\ApiDocSectionResource\Pages\EditApiDocSection;
use Gz168\ApiDoc\Models\ApiDocSection;
use Gz168\ApiDoc\Models\ApiDocSetting;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Livewire\Livewire;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ApiDocIntroMdBodyTest extends TestCase
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
    public function intro_markdown_paragraph_renders_on_front(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);
        ApiDocSetting::current();
        $this->actingAsFilamentAdmin();

        $section = ApiDocSection::factory()->create([
            'slug' => 'intro',
            'is_intro' => true,
            'is_active' => true,
            'intro_paras_format' => ApiDocContentFormat::Markdown->value,
            'intro_paras' => [
                ['fr' => 'plain', 'zh' => '', 'en' => ''],
            ],
            'intro_h1' => ['fr' => 'H1', 'zh' => 'H1', 'en' => 'H1'],
        ]);

        Livewire::test(EditApiDocSection::class, ['record' => $section->getKey()])
            ->fillForm([
                'is_intro' => true,
                'intro_paras_format' => ApiDocContentFormat::Markdown->value,
                'intro_paras' => [
                    ['text' => ['fr' => '**bold-intro**', 'zh' => '', 'en' => '']],
                ],
            ])
            ->call('save')
            ->assertHasNoFormErrors();

        $fresh = $section->fresh();
        $this->assertSame('**bold-intro**', $fresh->intro_paras[0]['fr'] ?? null);
        $this->assertSame('markdown', $fresh->intro_paras_format);

        $this->get('/api-doc')
            ->assertOk()
            ->assertDontSee('**bold-intro**', false)
            ->assertSee('bold-intro', false);
    }
}
