<?php

declare(strict_types=1);

namespace Tests\Feature\FrontExperience;

use Gz168\FrontPage\Application\ResolvePageAction;
use Tests\TestCase;

final class FrontExperienceApiTest extends TestCase
{
    public function test_home_page_resolves_with_classic_skin_off_season(): void
    {
        $response = $this->getJson('/api/v1/front-pages/home?channel=all&at=2026-06-01T12:00:00+08:00');

        $response->assertOk();
        $this->assertSame('home', $response->json('data.document.page.slug'));
        $this->assertSame('classic', $response->json('data.skin.code'));
        $this->assertNull($response->json('data.theme'));

        $mainTypes = collect($response->json('data.document.shell.slots.main'))->pluck('type')->all();
        $this->assertContains('mall.banner-carousel', $mainTypes);
        $this->assertContains('mall.product-grid', $mainTypes);
        $this->assertArrayHasKey('mall.banner.home', $response->json('data.skin.parts'));
        $header = $response->json('data.skin.parts')['chrome.header']['value']['content'] ?? [];
        $this->assertSame('Guest', $header['greeting'] ?? null);

        $productGrid = collect($response->json('data.document.shell.slots.main'))
            ->firstWhere('type', 'mall.product-grid');
        $this->assertIsArray($productGrid);
        $this->assertSame('mall.catalog.collection', $productGrid['call']['capability'] ?? null);
        // Empty catalog → skin partKey fallback still present for clients.
        $this->assertSame('mall.grid.hot', $productGrid['props']['partKey'] ?? null);

        $banner = collect($response->json('data.document.shell.slots.main'))
            ->firstWhere('type', 'mall.banner-carousel');
        $this->assertSame('mall.banners.home', $banner['call']['capability'] ?? null);
        $this->assertNotEmpty($banner['props']['items'] ?? []);
    }

    public function test_home_page_uses_national_day_theme_in_october(): void
    {
        $response = $this->getJson('/api/v1/front-pages/home?channel=all&at=2026-10-02T10:00:00+08:00');

        $response->assertOk();
        $this->assertSame('national-day', $response->json('data.theme.code'));
        $this->assertSame('national-day', $response->json('data.skin.code'));
        $this->assertStringContainsString('#b91c1c', (string) $response->json('data.skin.css.text'));

        $main = collect($response->json('data.document.shell.slots.main'));
        $this->assertSame('national-day-announce', $main->first()['id'] ?? null);
        $this->assertSame('shell.announcement', $main->first()['type'] ?? null);
        $this->assertTrue($main->first()['props']['themeOverlay'] ?? false);
    }

    public function test_christmas_theme_applies_page_overlays_on_home(): void
    {
        $response = $this->getJson(
            '/api/v1/front-pages/home?channel=all&theme=christmas&at=2026-12-25T12:00:00+08:00',
        );

        $response->assertOk();
        $this->assertSame('christmas', $response->json('data.theme.code'));

        $main = collect($response->json('data.document.shell.slots.main'));
        $this->assertSame('xmas-announce', $main->first()['id'] ?? null);
        $this->assertSame('xmas-footer-note', $main->last()['id'] ?? null);
        $this->assertContains('mall.banner-carousel', $main->pluck('type')->all());
    }

    public function test_page_overlays_can_be_disabled(): void
    {
        config(['front-template.page_overlays_enabled' => false]);
        $this->app->forgetInstance(ResolvePageAction::class);

        $response = $this->getJson(
            '/api/v1/front-pages/home?channel=all&theme=christmas&at=2026-12-25T12:00:00+08:00',
        );

        $response->assertOk();
        $ids = collect($response->json('data.document.shell.slots.main'))->pluck('id')->all();
        $this->assertNotContains('xmas-announce', $ids);
    }

    public function test_production_ignores_theme_skin_and_at_preview_overrides(): void
    {
        $previous = (string) $this->app->environment();
        $this->app->detectEnvironment(fn (): string => 'production');

        try {
            $response = $this->getJson(
                '/api/v1/front-pages/home?channel=all&theme=christmas&skin=christmas&at=2026-12-25T12:00:00+08:00',
            );

            $response->assertOk();
            // Query overrides must not force christmas; off-season (no schedule) → classic.
            $this->assertNotSame('christmas', $response->json('data.skin.code'));
            $this->assertNotSame('christmas', $response->json('data.theme.code'));
        } finally {
            $this->app->detectEnvironment(fn (): string => $previous);
        }
    }

    public function test_active_theme_endpoint(): void
    {
        $response = $this->getJson('/api/v1/front-templates/themes/active?at=2026-12-25T12:00:00+08:00');

        $response->assertOk();
        $this->assertSame('christmas', $response->json('data.code'));
    }

    public function test_skin_endpoint(): void
    {
        $this->getJson('/api/v1/front-templates/skins/classic')
            ->assertOk()
            ->assertJsonPath('data.code', 'classic');
    }
}
