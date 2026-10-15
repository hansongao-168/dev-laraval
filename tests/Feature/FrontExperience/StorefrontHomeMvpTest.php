<?php

declare(strict_types=1);

namespace Tests\Feature\FrontExperience;

use Tests\TestCase;

final class StorefrontHomeMvpTest extends TestCase
{
    public function test_home_main_slot_contains_mvp_blocks_with_array_items(): void
    {
        $response = $this->getJson(
            '/api/v1/front-pages/home?channel=all&at=2026-06-01T12:00:00+08:00',
        );

        $response->assertOk();

        $main = collect($response->json('data.document.shell.slots.main'));
        $types = $main->pluck('type')->all();

        foreach ([
            'mall.banner-carousel',
            'mall.category-nav',
            'mall.product-grid',
            'mall.article-list',
            'mall.faq-list',
        ] as $type) {
            $this->assertContains($type, $types, "missing block {$type}");
        }

        $banner = $main->firstWhere('type', 'mall.banner-carousel');
        $this->assertIsArray($banner['props']['items'] ?? null);

        $articles = $main->firstWhere('type', 'mall.article-list');
        $this->assertIsArray($articles['props']['items'] ?? null);

        $faqs = $main->firstWhere('type', 'mall.faq-list');
        $this->assertIsArray($faqs['props']['items'] ?? null);

        $product = $main->firstWhere('type', 'mall.product-grid');
        $this->assertSame('mall.grid.hot', $product['props']['partKey'] ?? null);

        $category = $main->firstWhere('type', 'mall.category-nav');
        $this->assertSame('mall.category.nav', $category['props']['partKey'] ?? null);

        $parts = $response->json('data.skin.parts');
        $this->assertNotEmpty($parts['mall.category.nav']['value']['content']['items'] ?? []);
        $this->assertNotEmpty($parts['mall.grid.hot']['value']['content']['items'] ?? []);
    }
}
