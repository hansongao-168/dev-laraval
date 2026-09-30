<?php

declare(strict_types=1);

namespace Tests\Feature\FrontExperience;

use Gz168\MallContent\Models\MallBanner;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

final class MallBannersOpsSourceTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_home_page_banner_call_uses_published_ops_banners(): void
    {
        MallBanner::query()->create([
            'title' => '运营主 Banner',
            'image_url' => 'https://cdn.example/ops-banner.jpg',
            'link_url' => '/ops-promo',
            'position' => 'home',
            'sort' => 1,
            'starts_at' => null,
            'ends_at' => null,
            'status' => 'published',
        ]);

        MallBanner::query()->create([
            'title' => '草稿不应出现',
            'position' => 'home',
            'sort' => 0,
            'status' => 'draft',
        ]);

        $response = $this->getJson('/api/v1/front-pages/home?channel=all&at=2026-06-01T12:00:00+08:00');

        $response->assertOk();

        $banner = collect($response->json('data.document.shell.slots.main'))
            ->firstWhere('type', 'mall.banner-carousel');

        $this->assertIsArray($banner);
        $this->assertSame('mall.banners.home', $banner['call']['capability'] ?? null);
        $this->assertSame('mall-content', $banner['props']['source'] ?? null);
        $this->assertSame('运营主 Banner', $banner['props']['items'][0]['title'] ?? null);
        $this->assertSame('/ops-promo', $banner['props']['items'][0]['href'] ?? null);
        $this->assertSame('https://cdn.example/ops-banner.jpg', $banner['props']['items'][0]['imageUrl'] ?? null);

        $titles = collect($banner['props']['items'] ?? [])->pluck('title')->all();
        $this->assertNotContains('草稿不应出现', $titles);
    }
}
