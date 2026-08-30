<?php

declare(strict_types=1);

namespace Tests\Feature\FrontNav;

use Gz168\FrontNav\Contracts\NavItem;
use Gz168\FrontNav\Contracts\NavLocation;
use Gz168\FrontNav\Contracts\NavRegistrar;
use Gz168\FrontNav\Contracts\NavRegistry;
use Illuminate\Contracts\Auth\Access\Authorizable;
use Illuminate\Contracts\Auth\Authenticatable;
use Tests\TestCase;

/**
 * End-to-end "real business module integration" test.
 *
 * CustomerServiceProvider binds its own NavRegistrar implementation
 * under the 'customer' group. The FrontNav ServiceProvider pulls
 * that Registrar from the Container during its boot sequence and
 * materialises its NavItems into the registry. This test verifies
 * the full pull-based contract works without any cross-module
 * coupling.
 */
final class FrontNavCustomerIntegrationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config()->set('front-nav.cache.ttl', 0);
        config()->set('front-nav.front.enabled', true);
    }

    public function test_customer_items_appear_in_sidebar_for_authed_visitor(): void
    {
        $response = $this->actingAs($this->makeAuthedVisitor())
            ->getJson('/api/v1/front-nav?location=sidebar');

        $response->assertOk();

        $keys = array_column($response->json('data'), 'key');
        // Customer registers 'customer.me' for authed users.
        self::assertContains('customer.me', $keys);
    }

    public function test_customer_login_and_register_appear_for_anonymous_visitor(): void
    {
        $response = $this->getJson('/api/v1/front-nav?location=sidebar');

        $response->assertOk();

        $keys = array_column($response->json('data'), 'key');
        // 'customer.login' + 'customer.register' use the 'guest' visibility,
        // so they show up for anonymous visitors.
        self::assertContains('customer.login', $keys);
        self::assertContains('customer.register', $keys);
        // 'customer.me' is auth-required and must be hidden.
        self::assertNotContains('customer.me', $keys);
    }

    public function test_customer_me_settings_nested_under_customer_me(): void
    {
        $response = $this->actingAs($this->makeAuthedVisitor())
            ->getJson('/api/v1/front-nav?location=sidebar');

        $response->assertOk();

        $me = collect($response->json('data'))
            ->firstWhere('key', 'customer.me');

        self::assertNotNull($me, 'customer.me should be in the sidebar for an authed visitor');
        self::assertCount(1, $me['children']);
        self::assertSame('customer.me.settings', $me['children'][0]['key']);
    }

    public function test_customer_registrar_is_pulled_via_container(): void
    {
        // Pull mode: business module binds a NavRegistrar implementation
        // into the container; front-nav discovers it during boot.
        self::assertTrue($this->app->bound(NavRegistrar::class));

        /** @var NavRegistrar $registrar */
        $registrar = $this->app->make(NavRegistrar::class);

        self::assertSame('customer', $registrar->group());
        self::assertSame(NavLocation::Sidebar, $registrar->location());

        $items = $registrar->items();
        self::assertGreaterThanOrEqual(4, count($items));

        // Every item must be a valid NavItem — verifies the pull contract.
        foreach ($items as $item) {
            self::assertInstanceOf(NavItem::class, $item);
        }
    }

    public function test_registry_snapshot_contains_customer_group(): void
    {
        /** @var NavRegistry $registry */
        $registry = $this->app->make(NavRegistry::class);

        // Customer should be in the groups list, alongside the builtin 'core'.
        self::assertContains('customer', $registry->groups());
        self::assertContains('core', $registry->groups());
    }

    public function test_cross_group_aggregation_preserves_customer_and_core(): void
    {
        // core (header) + customer (sidebar) live in different locations.
        $sidebar = $this->actingAs($this->makeAuthedVisitor())
            ->getJson('/api/v1/front-nav?location=sidebar')
            ->json('data');

        $header = $this->actingAs($this->makeAuthedVisitor())
            ->getJson('/api/v1/front-nav?location=header')
            ->json('data');

        self::assertNotEmpty($sidebar, 'sidebar must contain customer items');
        self::assertNotEmpty($header, 'header must contain core items');

        $headerKeys = array_column($header, 'key');
        self::assertContains('core.home', $headerKeys);
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
