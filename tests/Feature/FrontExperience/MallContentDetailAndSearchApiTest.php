<?php

declare(strict_types=1);

namespace Tests\Feature\FrontExperience;

use Gz168\MallContent\Models\MallArticle;
use Gz168\MallContent\Models\MallFaq;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

final class MallContentDetailAndSearchApiTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_article_page_resolves_detail_from_query_id(): void
    {
        $article = MallArticle::query()->create([
            'title' => '运费说明',
            'content' => '满 99 包邮，偏远地区除外。',
            'category' => 'help',
            'status' => 'published',
            'published_at' => now(),
        ]);

        $response = $this->getJson('/api/v1/front-pages/article?channel=all&id='.$article->id);

        $response->assertOk();

        $detail = collect($response->json('data.document.shell.slots.main'))
            ->firstWhere('type', 'mall.article-detail');

        $this->assertIsArray($detail);
        $this->assertSame('mall.content.articles.get', $detail['call']['capability'] ?? null);
        $this->assertSame('运费说明', $detail['props']['article']['title'] ?? null);
        $this->assertStringContainsString('包邮', (string) ($detail['props']['article']['content'] ?? ''));
    }

    public function test_help_page_faq_search_filters_by_query(): void
    {
        MallFaq::query()->create([
            'question' => '如何联系客服？',
            'answer' => '请提交工单。',
            'category' => 'support',
            'sort' => 1,
        ]);
        MallFaq::query()->create([
            'question' => '支持货到付款吗？',
            'answer' => '暂不支持。',
            'category' => 'payment',
            'sort' => 2,
        ]);

        $response = $this->getJson('/api/v1/front-pages/help?channel=all&q='.rawurlencode('工单'));

        $response->assertOk();

        $search = collect($response->json('data.document.shell.slots.main'))
            ->firstWhere('type', 'mall.faq-search');

        $this->assertIsArray($search);
        $this->assertSame('mall.content.faqs.search', $search['call']['capability'] ?? null);
        $this->assertSame('工单', $search['props']['q'] ?? null);
        $this->assertCount(1, $search['props']['items'] ?? []);
        $this->assertSame('如何联系客服？', $search['props']['items'][0]['question'] ?? null);
    }

    public function test_article_list_and_faq_search_block_types_expose_default_call(): void
    {
        $response = $this->getJson('/api/v1/front-shell/block-types');

        $response->assertOk();

        $types = collect($response->json('data'))->keyBy('type');

        $this->assertSame(
            'mall.content.articles.list',
            $types->get('mall.article-list')['defaultCall']['capability'] ?? null,
        );
        $this->assertSame(
            '{{ query.page }}',
            $types->get('mall.article-list')['defaultCall']['args']['page'] ?? null,
        );
        $this->assertSame(
            'mall.content.articles.get',
            $types->get('mall.article-detail')['defaultCall']['capability'] ?? null,
        );
        $this->assertSame(
            'mall.content.faqs.search',
            $types->get('mall.faq-search')['defaultCall']['capability'] ?? null,
        );
        $this->assertSame(
            '{{ query.q }}',
            $types->get('mall.faq-search')['defaultCall']['args']['q'] ?? null,
        );
        $this->assertSame(
            '{{ query.faqPage }}',
            $types->get('mall.faq-search')['defaultCall']['args']['page'] ?? null,
        );
    }

    public function test_help_page_article_list_paginates(): void
    {
        foreach (range(1, 10) as $i) {
            MallArticle::query()->create([
                'title' => "帮助文章 {$i}",
                'content' => "正文 {$i}",
                'category' => 'help',
                'status' => 'published',
                'published_at' => now()->subMinutes(10 - $i),
            ]);
        }

        $page1 = $this->getJson('/api/v1/front-pages/help?channel=all&page=1');
        $page1->assertOk();
        $list1 = collect($page1->json('data.document.shell.slots.main'))
            ->firstWhere('type', 'mall.article-list');

        $this->assertIsArray($list1);
        $this->assertSame(1, $list1['props']['page'] ?? null);
        $this->assertTrue($list1['props']['hasMore'] ?? false);
        $this->assertCount(8, $list1['props']['items'] ?? []);

        $page2 = $this->getJson('/api/v1/front-pages/help?channel=all&page=2');
        $page2->assertOk();
        $list2 = collect($page2->json('data.document.shell.slots.main'))
            ->firstWhere('type', 'mall.article-list');

        $this->assertIsArray($list2);
        $this->assertSame(2, $list2['props']['page'] ?? null);
        $this->assertFalse($list2['props']['hasMore'] ?? true);
        $this->assertCount(2, $list2['props']['items'] ?? []);
        $this->assertNotSame(
            $list1['props']['items'][0]['id'] ?? null,
            $list2['props']['items'][0]['id'] ?? null,
        );
    }

    public function test_help_and_article_pages_expose_share_seo_meta(): void
    {
        $help = $this->getJson('/api/v1/front-pages/help?channel=all');
        $help->assertOk();
        $this->assertSame('帮助中心', $help->json('data.document.meta.seo.title'));
        $this->assertSame('ERP Global', $help->json('data.document.meta.seo.siteName'));
        $this->assertSame('website', $help->json('data.document.meta.seo.type'));
        $this->assertSame('/brand/help-share.png', $help->json('data.document.meta.seo.image'));
        $this->assertSame('/brand/help-share.zh_CN.png', $help->json('data.document.meta.seo.images.zh_CN'));
        $this->assertSame('/brand/help-share.en.png', $help->json('data.document.meta.seo.images.en'));

        $article = $this->getJson('/api/v1/front-pages/article?channel=all&id=1');
        $article->assertOk();
        $this->assertSame('帮助文章', $article->json('data.document.meta.seo.title'));
        $this->assertSame('article', $article->json('data.document.meta.seo.type'));
        $this->assertSame('/brand/article-share.png', $article->json('data.document.meta.seo.image'));
        $this->assertSame('/brand/article-share.zh_CN.png', $article->json('data.document.meta.seo.images.zh_CN'));
        $this->assertSame('/brand/article-share.en.png', $article->json('data.document.meta.seo.images.en'));

        $home = $this->getJson('/api/v1/front-pages/home?channel=all');
        $home->assertOk();
        $this->assertSame('Home', $home->json('data.document.meta.seo.title'));
        $this->assertSame('website', $home->json('data.document.meta.seo.type'));
        $this->assertSame('/brand/home-share.png', $home->json('data.document.meta.seo.image'));
        $this->assertSame('/brand/home-share.zh_CN.png', $home->json('data.document.meta.seo.images.zh_CN'));
        $this->assertSame('/brand/home-share.en.png', $home->json('data.document.meta.seo.images.en'));
    }

    public function test_help_page_faq_search_paginates_with_faq_page(): void
    {
        foreach (range(1, 25) as $i) {
            MallFaq::query()->create([
                'question' => "问题 {$i}",
                'answer' => "答案 {$i}",
                'category' => 'help',
                'sort' => $i,
            ]);
        }

        $page1 = $this->getJson('/api/v1/front-pages/help?channel=all');
        $page1->assertOk();
        $faq1 = collect($page1->json('data.document.shell.slots.main'))
            ->firstWhere('type', 'mall.faq-search');

        $this->assertIsArray($faq1);
        $this->assertSame(1, $faq1['props']['page'] ?? null);
        $this->assertTrue($faq1['props']['hasMore'] ?? false);
        $this->assertCount(20, $faq1['props']['items'] ?? []);

        $page2 = $this->getJson('/api/v1/front-pages/help?channel=all&faqPage=2');
        $page2->assertOk();
        $faq2 = collect($page2->json('data.document.shell.slots.main'))
            ->firstWhere('type', 'mall.faq-search');

        $this->assertIsArray($faq2);
        $this->assertSame(2, $faq2['props']['page'] ?? null);
        $this->assertFalse($faq2['props']['hasMore'] ?? true);
        $this->assertCount(5, $faq2['props']['items'] ?? []);
    }
}
