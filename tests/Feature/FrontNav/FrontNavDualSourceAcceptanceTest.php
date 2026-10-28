<?php

declare(strict_types=1);

namespace Tests\Feature\FrontNav;

use Gz168\FrontNav\Admin\Filament\Pages\ContractNavPage;
use Gz168\FrontNav\Admin\Filament\Resources\FrontNavItemResource;
use Gz168\FrontNav\Admin\Support\AdminGate;
use Gz168\FrontNav\Contracts\NavItem;
use Gz168\FrontNav\Contracts\NavLocation;
use Gz168\FrontNav\Contracts\NavRegistry;
use Gz168\FrontNav\Models\FrontNavItem;
use Gz168\FrontNav\Providers\FrontNavServiceProvider;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * §8 acceptance matrix for optional dual sources (YAML vs Admin DB).
 */
final class FrontNavDualSourceAcceptanceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('front-nav.cache.ttl', 0);
        config()->set('front-nav.front.enabled', true);
        unset($_ENV['GZ168_FRONTAV_ADMIN_ENABLED']);
    }

    protected function tearDown(): void
    {
        unset($_ENV['GZ168_FRONTAV_ADMIN_ENABLED']);
        parent::tearDown();
    }

    public function test_yaml_only_exposes_contract_items_and_hides_admin_surface(): void
    {
        config()->set('front-nav.contract_bus.enabled', true);
        config()->set('front-nav.admin.enabled', false);
        $_ENV['GZ168_FRONTAV_ADMIN_ENABLED'] = 'false';

        $this->rehydrateFrontNav();

        /** @var NavRegistry $registry */
        $registry = $this->app->make(NavRegistry::class);
        self::assertContains('customer', $registry->groups());
        self::assertNotEmpty($registry->itemsInGroup('customer'));

        $response = $this->getJson('/api/v1/front-nav?location=header');
        $response->assertOk();
        $keys = array_column($response->json('data'), 'key');
        self::assertContains('customer.login', $keys);

        self::assertFalse(AdminGate::enabled());
        self::assertFalse(FrontNavItemResource::canAccess());
        self::assertFalse(ContractNavPage::canAccess());
    }

    public function test_admin_only_serves_db_items_without_contract_group(): void
    {
        config()->set('front-nav.contract_bus.enabled', false);
        config()->set('front-nav.admin.enabled', true);
        $_ENV['GZ168_FRONTAV_ADMIN_ENABLED'] = 'true';

        FrontNavItem::query()->create([
            'group' => 'ops',
            'key' => 'ops.banner',
            'label' => '运营入口',
            'url' => '/ops',
            'location' => NavLocation::Header->value,
            'sort' => 1,
            'enabled' => true,
            'requires_auth' => false,
        ]);

        $this->rehydrateFrontNav();

        /** @var NavRegistry $registry */
        $registry = $this->app->make(NavRegistry::class);
        self::assertNotContains('customer', $registry->groups());
        self::assertContains('ops', $registry->groups());

        $response = $this->getJson('/api/v1/front-nav?location=header');
        $response->assertOk();
        $keys = array_column($response->json('data'), 'key');
        self::assertContains('ops.banner', $keys);
        self::assertNotContains('customer.login', $keys);
        self::assertTrue(AdminGate::enabled());
    }

    public function test_dual_on_prefer_admin_overrides_same_key(): void
    {
        config()->set('front-nav.contract_bus.enabled', true);
        config()->set('front-nav.admin.enabled', true);
        config()->set('front-nav.merge.strategy', 'prefer_admin');
        $_ENV['GZ168_FRONTAV_ADMIN_ENABLED'] = 'true';

        FrontNavItem::query()->create([
            'group' => 'customer',
            'key' => 'customer.login',
            'label' => '后台登录文案',
            'url' => '/login-admin',
            'location' => NavLocation::Header->value,
            'sort' => 90,
            'enabled' => true,
            'requires_auth' => false,
        ]);

        $this->rehydrateFrontNav();

        /** @var NavRegistry $registry */
        $registry = $this->app->make(NavRegistry::class);
        $byKey = [];
        foreach ($registry->itemsInGroup('customer') as $item) {
            self::assertInstanceOf(NavItem::class, $item);
            $byKey[$item->key] = $item;
        }

        self::assertSame('后台登录文案', $byKey['customer.login']->label);
        self::assertSame('/login-admin', $byKey['customer.login']->url);
        self::assertArrayHasKey('customer.register', $byKey);
    }

    public function test_front_nav_source_has_no_business_module_imports(): void
    {
        $root = base_path('gz168/FrontNav/src');
        $hits = [];

        foreach (new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($root)) as $file) {
            if (! $file->isFile() || $file->getExtension() !== 'php') {
                continue;
            }
            $contents = (string) file_get_contents($file->getPathname());
            if (preg_match('/use\s+Gz168\\\\(Customer|Mall|Order|Product|DemoConsumer)\b/', $contents)) {
                $hits[] = $file->getPathname();
            }
        }

        self::assertSame([], $hits, 'FrontNav must not use business module types');
    }

    private function rehydrateFrontNav(): void
    {
        /** @var FrontNavServiceProvider $provider */
        $provider = $this->app->getProvider(FrontNavServiceProvider::class);
        self::assertInstanceOf(FrontNavServiceProvider::class, $provider);

        /** @var NavRegistry $registry */
        $registry = $this->app->make(NavRegistry::class);
        if (method_exists($registry, 'reset')) {
            $registry->reset();
        }

        $provider->hydrateRegistry();
    }
}
