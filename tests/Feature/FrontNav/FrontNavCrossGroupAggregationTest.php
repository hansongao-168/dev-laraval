<?php

declare(strict_types=1);

namespace Tests\Feature\FrontNav;

use Gz168\FrontNav\Contracts\NavItem;
use Gz168\FrontNav\Contracts\NavLocation;
use Gz168\FrontNav\Contracts\NavRegistry;
use Gz168\FrontNav\Front\Http\Controllers\Api\V1\NavController;
use Tests\TestCase;

/**
 * Cross-group aggregation contract.
 *
 * Simulates the realistic scenario where multiple business modules
 * each register their own group (customer, order, product, …) and the
 * Resolver must merge them into a single response, sorted by sort+key,
 * filtered by visibility, with children attached under their parents.
 *
 * No production code is touched; we drive the Registry directly through
 * its public API and assert what NavController returns.
 */
final class FrontNavCrossGroupAggregationTest extends TestCase
{
    private function buildItem(string $key, NavLocation $location, int $sort, array $overrides = []): NavItem
    {
        $base = [
            'key' => $key,
            'label' => ucwords(str_replace('.', ' ', $key)),
            'location' => $location,
            'url' => '/'.$key,
            'sort' => $sort,
        ];

        return new NavItem(...array_merge($base, $overrides));
    }

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('front-nav.cache.ttl', 0);
        config()->set('front-nav.front.enabled', true);
        config()->set('front-nav.builtin_groups', []); // start clean

        /** @var NavRegistry $registry */
        $registry = $this->app->make(NavRegistry::class);
        if (method_exists($registry, 'reset')) {
            $registry->reset();
        }
    }

    public function test_merges_multiple_groups_into_sorted_top_level(): void
    {
        /** @var NavRegistry $registry */
        $registry = $this->app->make(NavRegistry::class);

        $registry->group('customer', function ($r): void {
            $r->add($this->buildItem('customer.profile', NavLocation::Sidebar, 20));
            $r->add($this->buildItem('customer.address', NavLocation::Sidebar, 10));
        });
        $registry->group('order', function ($r): void {
            $r->add($this->buildItem('order.list', NavLocation::Sidebar, 5));
            $r->add($this->buildItem('order.detail', NavLocation::Sidebar, 15));
        });
        if (method_exists($registry, 'flush')) {
            $registry->flush();
        }

        $response = $this->getJson('/api/v1/front-nav?location=sidebar');
        $response->assertOk();

        $keys = array_column($response->json('data'), 'key');
        self::assertSame(
            ['order.list', 'customer.address', 'order.detail', 'customer.profile'],
            $keys,
            'Items must be sorted globally by sort then key across all groups',
        );

        // And each group contributes to the response — no isolation.
        self::assertContains('customer.profile', $keys);
        self::assertContains('order.list', $keys);
    }

    public function test_respects_per_group_requires_auth_in_merged_view(): void
    {
        /** @var NavRegistry $registry */
        $registry = $this->app->make(NavRegistry::class);

        $registry->group('public', function ($r): void {
            $r->add($this->buildItem('public.home', NavLocation::Header, 0));
        });
        $registry->group('customer', function ($r): void {
            $r->add($this->buildItem('customer.profile', NavLocation::Header, 10, [
                'requiresAuth' => true,
            ]));
        });
        $registry->group('admin', function ($r): void {
            $r->add($this->buildItem('admin.dashboard', NavLocation::Header, 20, [
                'requiresAuth' => true,
                'permission' => 'admin.view',
            ]));
        });
        if (method_exists($registry, 'flush')) {
            $registry->flush();
        }

        // Anonymous visitor ⇒ only public.
        $guest = $this->getJson('/api/v1/front-nav?location=header');
        $guestKeys = array_column($guest->json('data'), 'key');
        self::assertSame(['public.home'], $guestKeys);
    }

    public function test_orphans_are_promoted_to_top_when_parent_missing(): void
    {
        /** @var NavRegistry $registry */
        $registry = $this->app->make(NavRegistry::class);

        // Parent registered, then a child with parent='missing' from another group.
        $registry->group('customer', function ($r): void {
            $r->add($this->buildItem('customer.root', NavLocation::Sidebar, 1));
            $r->add($this->buildItem('customer.profile', NavLocation::Sidebar, 2, [
                'parent' => 'customer.root',
            ]));
        });
        $registry->group('order', function ($r): void {
            $r->add($this->buildItem('order.orphan', NavLocation::Sidebar, 3, [
                'parent' => 'does.not.exist',
            ]));
        });
        if (method_exists($registry, 'flush')) {
            $registry->flush();
        }

        $response = $this->getJson('/api/v1/front-nav?location=sidebar');
        $keys = array_column($response->json('data'), 'key');

        // customer.root stays top, customer.profile becomes child, order.orphan promoted.
        self::assertSame(['customer.root', 'order.orphan'], $keys);

        $root = collect($response->json('data'))->firstWhere('key', 'customer.root');
        self::assertCount(1, $root['children']);
        self::assertSame('customer.profile', $root['children'][0]['key']);
    }

    public function test_registry_snapshot_reflects_every_registered_group(): void
    {
        /** @var NavRegistry $registry */
        $registry = $this->app->make(NavRegistry::class);

        $registry->group('customer', fn ($r) => $r->add($this->buildItem('c', NavLocation::Header, 1)));
        $registry->group('order', fn ($r) => $r->add($this->buildItem('o', NavLocation::Header, 2)));
        $registry->group('product', fn ($r) => $r->add($this->buildItem('p', NavLocation::Header, 3)));
        $registry->flush();

        // The audit-context producer on the Registry must know about
        // every group that registered, regardless of which module did so.
        self::assertSame(['customer', 'order', 'product'], $registry->groups());
        self::assertSame(
            ['customer' => 1, 'order' => 1, 'product' => 1],
            $registry->lastFlushCounts(),
        );

        // Signature must change when any group adds items — the cache key
        // downstream depends on this.
        $firstSig = $registry->signature();

        $registry->reset();
        $registry->group('customer', fn ($r) => $r->add($this->buildItem('c', NavLocation::Header, 1)));
        $registry->group('order', fn ($r) => $r->add($this->buildItem('o', NavLocation::Header, 2)));
        $registry->group('product', fn ($r) => $r->add($this->buildItem('p', NavLocation::Header, 3)));
        $registry->group('inventory', fn ($r) => $r->add($this->buildItem('i', NavLocation::Header, 4)));
        $registry->flush();

        self::assertNotSame($firstSig, $registry->signature());
        self::assertSame(4, count($registry->lastFlushCounts()));
    }
}
