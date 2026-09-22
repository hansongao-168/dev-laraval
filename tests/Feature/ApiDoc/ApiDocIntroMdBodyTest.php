<?php

declare(strict_types=1);

namespace Tests\Feature\ApiDoc;

use App\Models\User;
use Filament\Facades\Filament;
use Gz168\ApiDoc\Database\Seeders\ApiDocDisplayModeSeeder;
use Gz168\ApiDoc\Enums\ApiDocContentFormat;
use Gz168\ApiDoc\Filament\Resources\ApiDocSectionResource\Pages\EditApiDocSection;
use Gz168\ApiDoc\Filament\Resources\ApiDocSectionResource\RelationManagers\ParasRelationManager;
use Gz168\ApiDoc\Models\ApiDocSection;
use Gz168\ApiDoc\Models\ApiDocSectionPara;
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
            'intro_h1' => ['fr' => 'H1', 'zh' => 'H1', 'en' => 'H1'],
        ]);

        ApiDocSectionPara::query()->create([
            'section_id' => $section->id,
            'sort' => 0,
            'text' => ['fr' => '**bold-intro**', 'zh' => '', 'en' => ''],
            'content_format' => ApiDocContentFormat::Markdown->value,
        ]);

        Livewire::test(ParasRelationManager::class, [
            'ownerRecord' => $section,
            'pageClass' => EditApiDocSection::class,
        ])->assertOk();

        $this->get('/api-doc')
            ->assertOk()
            ->assertDontSee('**bold-intro**', false)
            ->assertSee('bold-intro', false);
    }

    #[Test]
    public function opening_intro_editor_keeps_markdown_text_for_the_front_template(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);
        ApiDocSetting::current();
        $this->actingAsFilamentAdmin();

        $markdown = 'Cette API permet de comparer les tarifs.';

        $section = ApiDocSection::factory()->create([
            'slug' => 'intro',
            'is_intro' => true,
            'is_active' => true,
            'intro_h1' => ['fr' => 'H1', 'zh' => 'H1', 'en' => ''],
        ]);

        $para = ApiDocSectionPara::query()->create([
            'section_id' => $section->id,
            'sort' => 0,
            'text' => ['fr' => $markdown, 'zh' => '中文段落', 'en' => ''],
            'content_format' => ApiDocContentFormat::Markdown->value,
        ]);

        Livewire::test(ParasRelationManager::class, [
            'ownerRecord' => $section,
            'pageClass' => EditApiDocSection::class,
        ])
            ->assertOk()
            ->assertSee($markdown, false);

        $this->assertSame($markdown, $para->fresh()->text['fr'] ?? null);

        $this->get('/api-doc')
            ->assertOk()
            ->assertSee('comparer les tarifs', false);
    }
}
