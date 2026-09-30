<?php

declare(strict_types=1);

namespace Tests\Feature\MallContent;

use App\Models\User;
use Filament\Facades\Filament;
use Gz168\MallContent\Filament\Resources\MallBannerResource;
use Gz168\MallContent\Filament\Resources\MallBannerResource\Pages\CreateMallBanner;
use Gz168\MallContent\Filament\Resources\MallBannerResource\Pages\EditMallBanner;
use Gz168\MallContent\Filament\Resources\MallBannerResource\Pages\ListMallBanners;
use Gz168\MallContent\Models\MallBanner;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

final class MallBannerResourceTest extends TestCase
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

    public function test_resource_is_registered_on_admin_panel(): void
    {
        $this->actingAsFilamentAdmin();

        $resources = Filament::getCurrentPanel()?->getResources() ?? [];

        $this->assertContains(MallBannerResource::class, $resources);
    }

    public function test_list_page_renders_for_super_admin(): void
    {
        $this->actingAsFilamentAdmin();

        MallBanner::query()->create([
            'title' => '列表可见 Banner',
            'position' => 'home',
            'sort' => 1,
            'status' => 'published',
        ]);

        Livewire::test(ListMallBanners::class)
            ->assertSuccessful()
            ->assertCanSeeTableRecords(MallBanner::query()->get());
    }

    public function test_can_create_published_home_banner(): void
    {
        $this->actingAsFilamentAdmin();

        Livewire::test(CreateMallBanner::class)
            ->fillForm([
                'title' => '运营新建 Banner',
                'image_url' => 'https://cdn.example/banner.jpg',
                'link_url' => '/storefront',
                'position' => 'home',
                'sort' => 5,
                'status' => 'published',
                'starts_at' => null,
                'ends_at' => null,
            ])
            ->call('create')
            ->assertHasNoFormErrors();

        $banner = MallBanner::query()->where('title', '运营新建 Banner')->first();
        $this->assertNotNull($banner);
        $this->assertSame('published', $banner->status);
        $this->assertSame('https://cdn.example/banner.jpg', $banner->image_url);
        $this->assertSame('/storefront', $banner->link_url);
    }

    public function test_can_edit_banner_status(): void
    {
        $this->actingAsFilamentAdmin();

        $banner = MallBanner::query()->create([
            'title' => '待发布',
            'position' => 'home',
            'sort' => 1,
            'status' => 'draft',
        ]);

        Livewire::test(EditMallBanner::class, ['record' => $banner->getRouteKey()])
            ->fillForm([
                'status' => 'published',
            ])
            ->call('save')
            ->assertHasNoFormErrors();

        $this->assertSame('published', $banner->fresh()?->status);
    }
}
