<?php

declare(strict_types=1);

namespace Tests\Feature\FrontNav;

use Gz168\FrontNav\Contracts\NavItem;
use Gz168\FrontNav\Contracts\NavLocation;
use Gz168\FrontNav\Contracts\NavRegistry;
use Tests\TestCase;

/**
 * Verify the M5 i18n surface:
 *
 *   - Query param `?locale=zh-CN` filters items whose `i18nLocales`
 *     whitelist does not include it.
 *   - Response payload exposes `labelKey` and `i18nLocales` for the
 *     front-end SDK to resolve translations.
 *   - Response `meta.locale` echoes back what the resolver saw.
 */
final class FrontNavI18nTest extends TestCase
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

        $registry->group('i18n', function ($r): void {
            $r->add(new NavItem(
                key: 'i18n.home',
                label: 'Home',
                labelKey: 'nav.home',
                i18nLocales: ['en', 'zh-CN'],
                location: NavLocation::Header,
                url: '/',
                sort: 1,
            ));
            $r->add(new NavItem(
                key: 'i18n.dashboard',
                label: 'Dashboard',
                labelKey: 'nav.dashboard',
                i18nLocales: ['en'],
                location: NavLocation::Header,
                url: '/dashboard',
                sort: 2,
            ));
            $r->add(new NavItem(
                key: 'i18n.agnostic',
                label: 'Agnostic',
                location: NavLocation::Header,
                url: '/agnostic',
                sort: 3,
            ));
        });
        if (method_exists($registry, 'flush')) {
            $registry->flush();
        }
    }

    public function test_locale_filter_excludes_items_not_in_whitelist(): void
    {
        $response = $this->getJson('/api/v1/front-nav?location=header&locale=zh-CN');

        $response->assertOk();
        $response->assertJsonPath('meta.locale', 'zh-CN');

        $keys = array_column($response->json('data'), 'key');
        self::assertContains('i18n.home', $keys);     // zh-CN whitelisted
        self::assertNotContains('i18n.dashboard', $keys); // en only
        self::assertContains('i18n.agnostic', $keys); // no whitelist ⇒ always shown
    }

    public function test_locale_en_includes_dashboard_but_excludes_none(): void
    {
        $response = $this->getJson('/api/v1/front-nav?location=header&locale=en');

        $response->assertOk();
        $response->assertJsonPath('meta.locale', 'en');

        $keys = array_column($response->json('data'), 'key');
        self::assertContains('i18n.home', $keys);
        self::assertContains('i18n.dashboard', $keys);
        self::assertContains('i18n.agnostic', $keys);
    }

    public function test_response_carries_label_key_and_locales(): void
    {
        $response = $this->getJson('/api/v1/front-nav?location=header&locale=zh-CN');

        $home = collect($response->json('data'))
            ->firstWhere('key', 'i18n.home');

        self::assertNotNull($home);
        self::assertSame('Home', $home['label']);
        self::assertSame('nav.home', $home['labelKey']);
        self::assertSame(['en', 'zh-CN'], $home['i18nLocales']);
    }

    public function test_legacy_clients_without_locale_get_everything(): void
    {
        $response = $this->getJson('/api/v1/front-nav?location=header');

        $response->assertOk();
        $response->assertJsonPath('meta.locale', null);

        $keys = array_column($response->json('data'), 'key');
        // No locale ⇒ whitelist items are NOT filtered out.
        self::assertContains('i18n.home', $keys);
        self::assertContains('i18n.dashboard', $keys);
        self::assertContains('i18n.agnostic', $keys);
    }
}
