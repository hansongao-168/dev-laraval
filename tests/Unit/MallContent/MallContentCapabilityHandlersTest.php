<?php

declare(strict_types=1);

namespace Tests\Unit\MallContent;

use Gz168\MallContent\FrontTemplates\MallArticleGetHandler;
use Gz168\MallContent\FrontTemplates\MallArticlesListHandler;
use Gz168\MallContent\FrontTemplates\MallFaqsListHandler;
use Gz168\MallCore\Contracts\ArticleLookupContract;
use Gz168\MallCore\Contracts\FaqLookupContract;
use Gz168\MallCore\Data\ArticleDetail;
use Gz168\MallCore\Data\ArticleSummary;
use Gz168\MallCore\Data\FaqItem;
use PHPUnit\Framework\TestCase;

final class MallContentCapabilityHandlersTest extends TestCase
{
    public function test_articles_handler_maps_lookup_cards(): void
    {
        $lookup = $this->createMock(ArticleLookupContract::class);
        $lookup->method('published')->willReturn([
            new ArticleSummary(
                id: 7,
                title: '退货政策',
                excerpt: '七天无理由',
                category: 'help',
                publishedAt: '2026-09-01T00:00:00+00:00',
            ),
        ]);

        $result = (new MallArticlesListHandler($lookup))->handle(['limit' => 4]);

        $this->assertSame('mall-content', $result['source']);
        $this->assertSame(7, $result['items'][0]['id']);
        $this->assertSame('退货政策', $result['items'][0]['title']);
        $this->assertSame('七天无理由', $result['items'][0]['excerpt']);
        $this->assertSame(1, $result['page']);
        $this->assertFalse($result['hasMore']);
    }

    public function test_articles_handler_paginates_with_has_more(): void
    {
        $lookup = $this->createMock(ArticleLookupContract::class);
        $lookup->expects($this->once())
            ->method('published')
            ->with(null, 3, 2)
            ->willReturn([
                new ArticleSummary(id: 3, title: 'A', excerpt: 'a', category: null, publishedAt: null),
                new ArticleSummary(id: 2, title: 'B', excerpt: 'b', category: null, publishedAt: null),
                new ArticleSummary(id: 1, title: 'C', excerpt: 'c', category: null, publishedAt: null),
            ]);

        $result = (new MallArticlesListHandler($lookup))->handle(['limit' => 2, 'page' => 2]);

        $this->assertSame(2, $result['page']);
        $this->assertTrue($result['hasMore']);
        $this->assertCount(2, $result['items']);
        $this->assertSame(3, $result['items'][0]['id']);
    }

    public function test_article_get_handler_returns_detail(): void
    {
        $lookup = $this->createMock(ArticleLookupContract::class);
        $lookup->method('findPublishedById')->willReturn(
            new ArticleDetail(
                id: 7,
                title: '退货政策',
                content: '全文内容',
                category: 'help',
                publishedAt: '2026-09-01T00:00:00+00:00',
            ),
        );

        $result = (new MallArticleGetHandler($lookup))->handle(['id' => '7']);

        $this->assertSame('退货政策', $result['title']);
        $this->assertSame('全文内容', $result['article']['content']);
    }

    public function test_faqs_handler_maps_lookup_items(): void
    {
        $lookup = $this->createMock(FaqLookupContract::class);
        $lookup->method('listed')->willReturn([
            new FaqItem(id: 3, question: '如何联系客服？', answer: '提交工单', category: 'support'),
        ]);

        $result = (new MallFaqsListHandler($lookup))->handle(['limit' => 6]);

        $this->assertSame('mall-content', $result['source']);
        $this->assertSame('如何联系客服？', $result['items'][0]['question']);
        $this->assertSame('提交工单', $result['items'][0]['answer']);
    }

    public function test_faqs_handler_searches_when_q_present(): void
    {
        $lookup = $this->createMock(FaqLookupContract::class);
        $lookup->expects($this->once())
            ->method('search')
            ->with('工单', null, 11, 0)
            ->willReturn([
                new FaqItem(id: 3, question: '如何联系客服？', answer: '提交工单', category: 'support'),
            ]);

        $result = (new MallFaqsListHandler($lookup))->handle(['q' => '工单', 'limit' => 10]);

        $this->assertStringContainsString('工单', (string) $result['title']);
        $this->assertSame('工单', $result['q']);
        $this->assertSame(1, $result['page']);
        $this->assertFalse($result['hasMore']);
    }

    public function test_faqs_handler_paginates_with_has_more(): void
    {
        $lookup = $this->createMock(FaqLookupContract::class);
        $lookup->expects($this->once())
            ->method('listed')
            ->with(null, 3, 2)
            ->willReturn([
                new FaqItem(id: 3, question: 'Q3', answer: 'A3', category: null),
                new FaqItem(id: 2, question: 'Q2', answer: 'A2', category: null),
                new FaqItem(id: 1, question: 'Q1', answer: 'A1', category: null),
            ]);

        $result = (new MallFaqsListHandler($lookup))->handle(['limit' => 2, 'page' => 2]);

        $this->assertSame(2, $result['page']);
        $this->assertTrue($result['hasMore']);
        $this->assertCount(2, $result['items']);
    }

    public function test_empty_lookup_returns_empty_payload(): void
    {
        $articles = $this->createMock(ArticleLookupContract::class);
        $articles->method('published')->willReturn([]);
        $faqs = $this->createMock(FaqLookupContract::class);
        $faqs->method('listed')->willReturn([]);

        $this->assertSame([], (new MallArticlesListHandler($articles))->handle([]));
        $this->assertSame([], (new MallFaqsListHandler($faqs))->handle([]));
    }
}
