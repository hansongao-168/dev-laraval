<?php

declare(strict_types=1);

namespace Tests\Unit\MallStorefrontApi;

use Gz168\MallCore\Contracts\CatalogProductLookupContract;
use Gz168\MallCore\Contracts\PricingResolverContract;
use Gz168\MallCore\Contracts\ProductSearchContract;
use Gz168\MallCore\Data\ProductSummary;
use Gz168\MallCore\Data\SearchHit;
use Gz168\MallCore\ValueObjects\Money;
use Gz168\MallStorefrontApi\FrontTemplates\MallCatalogCollectionHandler;
use PHPUnit\Framework\TestCase;

final class MallCatalogCollectionHandlerTest extends TestCase
{
    public function test_hydrates_search_hits_into_grid_items(): void
    {
        $search = $this->createMock(ProductSearchContract::class);
        $search->method('search')->willReturn([
            new SearchHit(sku: 'DEMO-001', score: 1.0),
        ]);

        $catalog = $this->createMock(CatalogProductLookupContract::class);
        $catalog->method('batchBySkus')->willReturn([
            'DEMO-001' => new ProductSummary(sku: 'DEMO-001', name: 'Demo 商品', published: true),
        ]);

        $pricing = $this->createMock(PricingResolverContract::class);
        $pricing->method('batchResolve')->willReturn([
            'DEMO-001' => Money::fromCents(19900, 'CNY'),
        ]);

        $handler = new MallCatalogCollectionHandler($search, $catalog, $pricing);
        $result = $handler->handle(['collection' => 'hot', 'limit' => 8]);

        $this->assertSame('catalog', $result['source']);
        $this->assertSame('热销推荐', $result['title']);
        $this->assertSame('DEMO-001', $result['items'][0]['sku']);
        $this->assertSame('¥199.00', $result['items'][0]['price']);
    }

    public function test_empty_search_returns_empty_payload_for_skin_fallback(): void
    {
        $search = $this->createMock(ProductSearchContract::class);
        $search->method('search')->willReturn([]);

        $handler = new MallCatalogCollectionHandler(
            $search,
            $this->createMock(CatalogProductLookupContract::class),
            $this->createMock(PricingResolverContract::class),
        );

        $this->assertSame([], $handler->handle(['collection' => 'hot']));
    }
}
