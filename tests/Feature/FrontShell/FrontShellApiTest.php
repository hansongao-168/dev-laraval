<?php

declare(strict_types=1);

namespace Tests\Feature\FrontShell;

use Tests\TestCase;

final class FrontShellApiTest extends TestCase
{
    public function test_shells_endpoint_returns_storefront_main(): void
    {
        $response = $this->getJson('/api/v1/front-shell/shells');

        $response->assertOk();
        $keys = collect($response->json('data'))->pluck('key')->all();
        $this->assertContains('storefront.main', $keys);
    }

    public function test_block_types_endpoint_returns_core_types(): void
    {
        $response = $this->getJson('/api/v1/front-shell/block-types');

        $response->assertOk();
        $types = collect($response->json('data'))->pluck('type')->all();
        $this->assertContains('shell.nav-bar', $types);
        $this->assertContains('content.rich-text', $types);
        $this->assertContains('mall.banner-carousel', $types);
        $this->assertContains('mall.product-grid', $types);
        $this->assertContains('mall.category-nav', $types);
        $this->assertContains('mall.article-list', $types);
        $this->assertContains('mall.article-detail', $types);
        $this->assertContains('mall.faq-list', $types);
        $this->assertContains('mall.faq-search', $types);
    }

    public function test_capabilities_endpoint_returns_list(): void
    {
        $response = $this->getJson('/api/v1/front-shell/capabilities');

        $response->assertOk();
        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertContains('user.profile.summary', $ids);
        $this->assertContains('mall.catalog.collection', $ids);
        $this->assertContains('mall.banners.home', $ids);
        $this->assertContains('mall.content.articles.list', $ids);
        $this->assertContains('mall.content.articles.get', $ids);
        $this->assertContains('mall.content.faqs.list', $ids);
        $this->assertContains('mall.content.faqs.search', $ids);
    }
}
