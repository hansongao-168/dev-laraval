<?php

declare(strict_types=1);

namespace Tests\Feature\FrontNav;

use Gz168\ContractBus\Contracts\ContractBusRegistry;
use Gz168\ContractBus\Contracts\ContractKind;
use Gz168\FrontNav\Contracts\NavItem;
use Gz168\FrontNav\Contracts\NavLocation;
use Gz168\FrontNav\Contracts\NavRegistrar;
use Gz168\FrontNav\Contracts\NavRegistry;
use Illuminate\Contracts\Auth\Authenticatable;
use Tests\TestCase;

/**
 * End-to-end "real business module integration" test.
 *
 * Customer declares its NavItems in the `nav:` block of its ContractBus
 * contract (gz168/Customer/resources/contracts/contract.yaml). FrontNav
 * reads them through the ContractBusRegistry on the first registry read
 * and registers them under the 'customer' group. This test verifies the
 * contract-driven integration works without any cross-module `use`.
 *
 * Blade top bar consumes location=header; account-area APIs may use sidebar.
 */
final class FrontNavCustomerIntegrationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config()->set('front-nav.cache.ttl', 0);
        config()->set('front-nav.front.enabled', true);
    }

    public function test_customer_account_items_appear_in_header_for_authed_visitor(): void
    {
        $response = $this->actingAs($this->makeAuthedVisitor())
            ->getJson('/api/v1/front-nav?location=header');

        $response->assertOk();

        $keys = array_column($response->json('data'), 'key');
        self::assertContains('customer.me', $keys);
        self::assertContains('customer.logout', $keys);
        self::assertNotContains('customer.login', $keys);
        self::assertNotContains('customer.register', $keys);
    }

    public function test_customer_login_and_register_appear_for_anonymous_visitor(): void
    {
        $response = $this->getJson('/api/v1/front-nav?location=header');

        $response->assertOk();

        $keys = array_column($response->json('data'), 'key');
        self::assertContains('customer.login', $keys);
        self::assertContains('customer.register', $keys);
        self::assertNotContains('customer.me', $keys);
        self::assertNotContains('customer.logout', $keys);
    }

    public function test_customer_me_settings_is_sidebar_top_level_for_authed(): void
    {
        $response = $this->actingAs($this->makeAuthedVisitor())
            ->getJson('/api/v1/front-nav?location=sidebar');

        $response->assertOk();

        $keys = array_column($response->json('data'), 'key');
        self::assertContains('customer.me.settings', $keys);

        $settings = collect($response->json('data'))
            ->firstWhere('key', 'customer.me.settings');

        self::assertNotNull($settings);
        self::assertSame([], $settings['children']);
        self::assertSame('/account/settings', $settings['url']);
    }

    public function test_customer_nav_is_declared_through_contract_bus(): void
    {
        self::assertFalse($this->app->bound(NavRegistrar::class));

        $expected = [
            'customer.login',
            'customer.register',
            'customer.me',
            'customer.logout',
            'customer.me.settings',
        ];

        $contracts = $this->app->make(ContractBusRegistry::class)->registry();
        foreach ($expected as $key) {
            self::assertNotNull(
                $contracts->find(ContractKind::Nav, 'customer', $key),
                "{$key} must be declared in the customer contract",
            );
        }

        /** @var NavRegistry $registry */
        $registry = $this->app->make(NavRegistry::class);
        $items = $registry->itemsInGroup('customer');

        self::assertCount(5, $items);

        $byKey = [];
        foreach ($items as $item) {
            self::assertInstanceOf(NavItem::class, $item);
            $byKey[$item->key] = $item;
        }

        self::assertSame(NavLocation::Header, $byKey['customer.login']->location);
        self::assertSame(NavLocation::Header, $byKey['customer.register']->location);
        self::assertSame(NavLocation::Header, $byKey['customer.me']->location);
        self::assertSame(NavLocation::Header, $byKey['customer.logout']->location);
        self::assertSame(NavLocation::Sidebar, $byKey['customer.me.settings']->location);
        self::assertSame('/account', $byKey['customer.me']->url);
        self::assertTrue(($byKey['customer.login']->meta['requiresGuest'] ?? false) === true);
        self::assertSame('post', $byKey['customer.logout']->meta['method'] ?? null);
    }

    public function test_contract_nav_can_be_disabled_via_config(): void
    {
        config()->set('front-nav.contract_bus.enabled', false);

        /** @var NavRegistry $registry */
        $registry = $this->app->make(NavRegistry::class);

        self::assertNotContains('customer', $registry->groups());
        self::assertContains('core', $registry->groups());
    }

    public function test_registry_snapshot_contains_customer_group(): void
    {
        /** @var NavRegistry $registry */
        $registry = $this->app->make(NavRegistry::class);

        self::assertContains('customer', $registry->groups());
        self::assertContains('core', $registry->groups());
    }

    public function test_cross_group_aggregation_preserves_customer_and_core(): void
    {
        $sidebar = $this->actingAs($this->makeAuthedVisitor())
            ->getJson('/api/v1/front-nav?location=sidebar')
            ->json('data');

        $header = $this->actingAs($this->makeAuthedVisitor())
            ->getJson('/api/v1/front-nav?location=header')
            ->json('data');

        self::assertNotEmpty($sidebar, 'sidebar must contain customer.me.settings (and/or demo)');
        self::assertNotEmpty($header, 'header must contain core + customer account items');

        $headerKeys = array_column($header, 'key');
        self::assertContains('core.home', $headerKeys);
        self::assertContains('customer.me', $headerKeys);

        $sidebarKeys = array_column($sidebar, 'key');
        self::assertContains('customer.me.settings', $sidebarKeys);
    }

    private function makeAuthedVisitor(): object
    {
        return new class implements Authenticatable
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
        };
    }
}
