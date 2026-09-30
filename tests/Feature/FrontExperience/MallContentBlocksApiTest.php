<?php

declare(strict_types=1);

namespace Tests\Feature\FrontExperience;

use Gz168\MallContent\Models\MallArticle;
use Gz168\MallContent\Models\MallFaq;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

final class MallContentBlocksApiTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_home_page_resolves_article_and_faq_blocks_from_ops(): void
    {
        MallArticle::query()->create([
            'title' => '运费说明',
            'content' => '满 99 包邮。',
            'category' => 'help',
            'status' => 'published',
            'published_at' => now(),
        ]);

        MallFaq::query()->create([
            'question' => '支持货到付款吗？',
            'answer' => '暂不支持。',
            'category' => 'payment',
            'sort' => 1,
        ]);

        $response = $this->getJson('/api/v1/front-pages/home?channel=all&at=2026-06-01T12:00:00+08:00');

        $response->assertOk();

        $main = collect($response->json('data.document.shell.slots.main'));

        $articles = $main->firstWhere('type', 'mall.article-list');
        $this->assertIsArray($articles);
        $this->assertSame('mall.content.articles.list', $articles['call']['capability'] ?? null);
        $this->assertSame('mall-content', $articles['props']['source'] ?? null);
        $this->assertSame('运费说明', $articles['props']['items'][0]['title'] ?? null);

        $faqs = $main->firstWhere('type', 'mall.faq-list');
        $this->assertIsArray($faqs);
        $this->assertSame('mall.content.faqs.list', $faqs['call']['capability'] ?? null);
        $this->assertSame('支持货到付款吗？', $faqs['props']['items'][0]['question'] ?? null);
    }
}
