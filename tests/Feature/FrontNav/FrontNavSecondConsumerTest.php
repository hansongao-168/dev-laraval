<?php

declare(strict_types=1);

namespace Tests\Feature\FrontNav;

use Gz168\FrontNav\Contracts\NavRegistry;
use Illuminate\Contracts\Auth\Access\Authorizable;
use Illuminate\Contracts\Auth\Authenticatable;
use Tests\TestCase;

/**
 * End-to-end "second consumer" verification.
 *
 * After Gz168\DemoConsumer is required into the host (push-mode
 * integration), the registry must hold items from THREE sources:
 *   - core (FrontNav builtin)
 *   - customer (gz168/customer, pull-mode)
 *   - demo (gz168/demo-consumer, push-mode)
 *
 * This test proves:
 *   1. DemoConsumer's ServiceProvider boots without error.
 *   2. The `demo` group is registered alongside `core` and `customer`.
 *   3. Items from all three groups appear in the same HTTP response.
 *   4. Both push and pull modes coexist — no ordering constraint.
 */
final class FrontNavSecondConsumerTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config()->set('front-nav.cache.ttl', 0);
        config()->set('front-nav.front.enabled', true);
    }

    public function test_registry_holds_three_distinct_groups(): void
    {
        /** @var NavRegistry $registry */
        $registry = $this->app->make(NavRegistry::class);

        $groups = $registry->groups();

        self::assertContains('core', $groups);
        self::assertContains('customer', $groups);
        self::assertContains('demo', $groups, 'demo group must be registered alongside core/customer');
    }

    public function test_demo_items_appear_in_http_response(): void
    {
        // demo.dashboard lives in header.
        $response = $this->getJson('/api/v1/front-nav?location=header');
        $response->assertOk();

        $keys = array_column($response->json('data'), 'key');
        self::assertContains('core.home', $keys);
        self::assertContains('demo.dashboard', $keys);
        // demo.dashboard sits before core.home in the global sort (sort=5 < 0 is false,
        // but core.home is sort=0, demo.dashboard sort=5 ⇒ core.home first).
        self::assertLessThan(
            array_search('demo.dashboard', $keys, true),
            array_search('core.home', $keys, true),
        );
    }

    public function test_cross_consumer_aggregation_in_sidebar(): void
    {
        // Sidebar combines customer + demo items for guests.
        $response = $this->getJson('/api/v1/front-nav?location=sidebar');
        $response->assertOk();

        $keys = array_column($response->json('data'), 'key');
        // Customer guest items
        self::assertContains('customer.login', $keys);
        self::assertContains('customer.register', $keys);
        // Demo auth-gated items must NOT appear for guests.
        self::assertNotContains('demo.reports', $keys);
        self::assertNotContains('demo.settings', $keys);
        self::assertNotContains('demo.submenu', $keys);
    }

    public function test_demo_items_visible_to_authed_visitors(): void
    {
        $response = $this->actingAs($this->makeAuthedVisitor())
            ->getJson('/api/v1/front-nav?location=sidebar');
        $response->assertOk();

        $keys = array_column($response->json('data'), 'key');

        // Customer's auth-gated item shows up.
        self::assertContains('customer.me', $keys);
        // DemoConsumer's auth-gated items show up (requiresAuth: true but no
        // permission ⇒ visible).
        self::assertContains('demo.reports', $keys);
        // demo.settings carries permission='demo.settings' and the test
        // visitor doesn't grant it, so the DefaultVisibility's Gate check
        // hides it — that's the correct production behaviour.
        self::assertNotContains('demo.settings', $keys);
        // demo.submenu is a child of demo.reports — not top-level.
        self::assertNotContains('demo.submenu', $keys);
    }

    public function test_demo_submenu_nested_under_demo_reports(): void
    {
        $response = $this->actingAs($this->makeAuthedVisitor())
            ->getJson('/api/v1/front-nav?location=sidebar');
        $response->assertOk();

        $reports = collect($response->json('data'))
            ->firstWhere('key', 'demo.reports');

        self::assertNotNull($reports, 'demo.reports must be top-level for authed visitor');
        self::assertCount(1, $reports['children']);
        self::assertSame('demo.submenu', $reports['children'][0]['key']);
    }

    public function test_customer_and_demo_items_sorted_independently(): void
    {
        $response = $this->actingAs($this->makeAuthedVisitor())
            ->getJson('/api/v1/front-nav?location=sidebar');
        $response->assertOk();

        $rows = $response->json('data');
        // customer.me (sort=10) appears before demo.reports (sort=50) — proves
        // the resolver does global sort across groups, not per-group.
        $keys = array_column($rows, 'key');
        $customerIdx = array_search('customer.me', $keys, true);
        $demoIdx = array_search('demo.reports', $keys, true);

        self::assertNotFalse($customerIdx);
        self::assertNotFalse($demoIdx);
        self::assertLessThan($demoIdx, $customerIdx);
    }

    private function makeAuthedVisitor(): object
    {
        return new class implements Authenticatable, Authorizable
        {
            public function getAuthIdentifierName(): string
            {
                return 'id';
            }

            public function getAuthIdentifier(): mixed
            {
                return 42;
            }

            public function getAuthPasswordName(): string
            {
                return 'password';
            }

            public function getAuthPassword(): string
            {
                return 'x';
            }

            public function getRememberToken(): string
            {
                return '';
            }

            public function setRememberToken($value): void {}

            public function getRememberTokenName(): string
            {
                return '';
            }

            /**
             * The test visitor grants no permissions: permission-gated
             * items must stay hidden (see the demo.settings assertion).
             */
            public function can($abilities, $arguments = []): bool
            {
                return false;
            }

            public function cant($abilities, $arguments = []): bool
            {
                return ! $this->can($abilities, $arguments);
            }

            public function cannot($abilities, $arguments = []): bool
            {
                return $this->cant($abilities, $arguments);
            }
        };
    }
}
