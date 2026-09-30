<?php

declare(strict_types=1);

namespace Tests\Unit\MallStorefrontApi;

use Gz168\FrontTemplate\Infrastructure\YamlDocumentLoader;
use Gz168\MallCore\Contracts\BannerLookupContract;
use Gz168\MallCore\Data\BannerCard;
use Gz168\MallStorefrontApi\FrontTemplates\MallBannersHomeHandler;
use PHPUnit\Framework\TestCase;

final class MallBannersHomeHandlerTest extends TestCase
{
    public function test_prefers_ops_banners_from_mall_content(): void
    {
        $lookup = $this->createMock(BannerLookupContract::class);
        $lookup->method('publishedForPosition')->willReturn([
            new BannerCard(
                title: '运营 Banner',
                subtitle: null,
                href: '/promo',
                imageUrl: 'https://cdn.example/b.jpg',
                tone: null,
            ),
        ]);

        $handler = new MallBannersHomeHandler($lookup, new YamlDocumentLoader);
        $result = $handler->handle(['position' => 'home', 'limit' => 8]);

        $this->assertSame('mall-content', $result['source']);
        $this->assertSame('运营 Banner', $result['items'][0]['title']);
        $this->assertSame('/promo', $result['items'][0]['href']);
        $this->assertSame('https://cdn.example/b.jpg', $result['items'][0]['imageUrl']);
    }

    public function test_falls_back_to_yaml_when_ops_empty(): void
    {
        $lookup = $this->createMock(BannerLookupContract::class);
        $lookup->method('publishedForPosition')->willReturn([]);

        $handler = new MallBannersHomeHandler($lookup, new YamlDocumentLoader);
        $result = $handler->handle([]);

        $this->assertSame('mall.banners.home', $result['source']);
        $this->assertNotEmpty($result['items']);
        $this->assertSame('精选好物', $result['items'][0]['title']);
    }
}
