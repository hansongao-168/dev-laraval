<?php

declare(strict_types=1);

namespace Tests\Feature\FrontNav;

use Illuminate\Contracts\Auth\Authenticatable;
use Tests\TestCase;

/**
 * End-to-end "real business module integration" test.
 *
 * After Gz168\Customer\Providers\CustomerServiceProvider::packageBooted()
 * is wired into the host application, Customer registers three NavItems
 * under the 'customer' group. This test boots the host's full provider
 * stack (no manual registry.setUp) and verifies the items appear in
 * GET /api/v1/front-nav with the right shape, location, auth, and
 * parent/child nesting.
 *
 * This is the proof that other modules can plug into front-nav without
 * any cross-module coupling.
 */
final class FrontNavCustomerIntegrationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config()->set('front-nav.cache.ttl', 0);
        config()->set('front-nav.front.enabled', true);
        // No reset(): we want Customer's packageBooted() registration to be
        // already materialised by the host's ServiceProvider boot sequence.
    }

    public function test_customer_group_appears_in_sidebar_response(): void
    {
        $response = $this->actingAs($this->makeAuthedVisitor())
            ->getJson('/api/v1/front-nav?location=sidebar');

        $response->assertOk();

        $keys = array_column($response->json('data'), 'key');
        self::assertContains('customer.profile', $keys);
        self::assertContains('customer.settings', $keys);
        self::assertNotContains('customer.addresses', $keys,
            'customer.addresses is a child of customer.profile and must not be top-level');
    }

    public function test_customer_addresses_nested_under_profile(): void
    {
        $response = $this->actingAs($this->makeAuthedVisitor())
            ->getJson('/api/v1/front-nav?location=sidebar');

        $profile = collect($response->json('data'))
            ->firstWhere('key', 'customer.profile');

        self::assertNotNull($profile);
        self::assertCount(1, $profile['children']);
        self::assertSame('customer.addresses', $profile['children'][0]['key']);
        self::assertSame('/customer/addresses', $profile['children'][0]['url']);
    }

    public function test_customer_items_have_label_key_for_client_i18n(): void
    {
        $response = $this->actingAs($this->makeAuthedVisitor())
            ->getJson('/api/v1/front-nav?location=sidebar&locale=zh-CN');

        $profile = collect($response->json('data'))
            ->firstWhere('key', 'customer.profile');

        self::assertSame('My profile', $profile['label']);
        self::assertSame('customer.profile', $profile['labelKey']);
        self::assertSame(['en', 'zh-CN'], $profile['i18nLocales']);
    }

    public function test_customer_items_hidden_for_anonymous_visitor(): void
    {
        $response = $this->getJson('/api/v1/front-nav?location=sidebar');

        $response->assertOk();
        $keys = array_column($response->json('data'), 'key');

        // No 'customer.' prefix in guest output (all 3 require auth).
        foreach ($keys as $key) {
            self::assertStringStartsNotWith('customer.', $key);
        }
    }

    public function test_cross_group_aggregation_preserves_customer_and_core(): void
    {
        // core (header) + customer (sidebar) live in different locations.
        // Same location ⇒ both groups' items compete for sort order.
        $sidebar = $this->actingAs($this->makeAuthedVisitor())
            ->getJson('/api/v1/front-nav?location=sidebar')
            ->json('data');

        $header = $this->actingAs($this->makeAuthedVisitor())
            ->getJson('/api/v1/front-nav?location=header')
            ->json('data');

        self::assertGreaterThanOrEqual(2, count($sidebar));
        self::assertGreaterThanOrEqual(2, count($header));

        // Header should still have the built-in 'core.logout' alongside any
        // future modules registered there.
        $headerKeys = array_column($header, 'key');
        self::assertContains('core.home', $headerKeys);
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
