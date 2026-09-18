<?php

declare(strict_types=1);

namespace Tests\Feature\ApiDoc;

use App\Models\User;
use Filament\Facades\Filament;
use Filament\Support\Enums\Width;
use Gz168\ApiDoc\Database\Seeders\ApiDocDisplayModeSeeder;
use Gz168\ApiDoc\Filament\Resources\ApiDocSectionResource;
use Gz168\ApiDoc\Filament\Resources\ApiDocSectionResource\Pages\EditApiDocSection;
use Gz168\ApiDoc\Models\ApiDocSection;
use Gz168\ApiDoc\Models\ApiDocSetting;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Livewire\Livewire;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ApiDocSectionPreviewTest extends TestCase
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
    public function front_preview_url_uses_section_hash_anchor(): void
    {
        $section = ApiDocSection::factory()->make([
            'slug' => 'oauth-token',
        ]);

        $this->assertSame(
            url('/api-doc#s=oauth-token'),
            ApiDocSectionResource::frontPreviewUrl($section),
        );

        $this->assertSame(
            url('/api-doc?admin_embed=1#s=oauth-token'),
            ApiDocSectionResource::frontPreviewUrl($section, adminEmbed: true),
        );
    }

    #[Test]
    public function edit_page_is_full_width_and_exposes_preview_tab(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);
        ApiDocSetting::current();
        $this->actingAsFilamentAdmin();

        $section = ApiDocSection::factory()->create([
            'slug' => 'oauth-token',
            'is_active' => true,
        ]);

        $component = Livewire::test(EditApiDocSection::class, ['record' => $section->getKey()]);

        $this->assertSame(Width::Full, $component->instance()->getMaxContentWidth());
        $component
            ->assertOk()
            ->assertSee('前台预览', false)
            ->assertSee('#s=oauth-token', false)
            ->assertSee('/api-doc?admin_embed=1#s=oauth-token', false);
    }
}
