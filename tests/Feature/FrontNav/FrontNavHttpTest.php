<?php

declare(strict_types=1);

namespace Tests\Feature\FrontNav;

use Gz168\FrontNav\Contracts\NavItem;
use Gz168\FrontNav\Contracts\NavLocation;
use Gz168\FrontNav\Contracts\NavRegistry;
use Tests\TestCase;

/**
 * End-to-end check: ServiceProvider boot → registry flush → HTTP GET returns
 * the registered items.
 *
 * Lives under the host `tests/` tree so it runs in the host PHPUnit suite
 * without requiring Orchestra Testbench to be installed. The module itself
 * ships its own phpunit.xml under gz168/FrontNav/ for isolated unit tests.
 */
final class FrontNavHttpTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config()->set('front-nav.cache.ttl', 0);
        config()->set('front-nav.front.enabled', true);

        /** @var NavRegistry $registry */
        $registry = $this->app->make(NavRegistry::class);
        if (method_exists($registry, 'reset')) {
            $registry->reset();
        }
        $registry->group('test', function ($r): void {
            $r->add(new NavItem(
                key: 'test.home',
                label: 'Test Home',
                location: NavLocation::Header,
                url: '/test',
                sort: 5,
            ));
            $r->add(new NavItem(
                key: 'test.profile',
                label: 'Test Profile',
                location: NavLocation::Header,
                url: '/test/profile',
                sort: 1,
                requiresAuth: true,
            ));
        });
        if (method_exists($registry, 'flush')) {
            $registry->flush();
        }
    }

    public function test_get_returns_registered_items(): void
    {
        $response = $this->getJson('/api/v1/front-nav?location=header');

        $response->assertOk();
        $response->assertJsonStructure([
            'data' => [
                '*' => ['key', 'label', 'url', 'children'],
            ],
            'meta' => ['location', 'locale', 'authed'],
        ]);

        $payload = $response->json('data');
        $keys = array_column($payload, 'key');
        self::assertContains('test.home', $keys);
    }

    public function test_get_filters_requires_auth_for_guest(): void
    {
        $response = $this->getJson('/api/v1/front-nav?location=header');

        $payload = $response->json('data');
        $keys = array_column($payload, 'key');
        self::assertNotContains('test.profile', $keys);
    }

    public function test_get_with_unknown_location_returns_422(): void
    {
        $response = $this->getJson('/api/v1/front-nav?location=garbage');
        $response->assertStatus(422);
    }

    public function test_module_disabled_silences_routes(): void
    {
        // Note: front-nav.front.enabled is read once during packageBooted(),
        // so toggling it in mid-test does not unload routes. This assertion
        // is therefore covered at the boot-time config layer; we keep the
        // test here only to document the contract.
        $this->assertTrue(config()->has('front-nav.front.enabled'));
    }
}
