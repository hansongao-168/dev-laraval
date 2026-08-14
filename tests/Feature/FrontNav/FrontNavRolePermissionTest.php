<?php

declare(strict_types=1);

namespace Tests\Feature\FrontNav;

use Gz168\FrontNav\Contracts\Authorizable as FrontNavAuthorizable;
use Gz168\FrontNav\Contracts\NavItem;
use Gz168\FrontNav\Contracts\NavLocation;
use Gz168\FrontNav\Contracts\NavRegistry;
use Gz168\FrontNav\Resolver\RolePermissionAwareVisibility;
use Gz168\FrontNav\Resolver\VisibilityChecker;
use Illuminate\Contracts\Auth\Authenticatable;
use Tests\TestCase;

/**
 * End-to-end check: when the host swaps in RolePermissionAwareVisibility
 * AND registers a visitor that implements our Authorizable contract,
 * NavItem::permission is enforced against the visitor's hasPermission().
 *
 * Verifies the duck-typed contract: the visitor does NOT need to be a
 * gz168/role-permission Authorizable — anything implementing the same
 * shape works, which keeps FrontNav from depending on that module.
 */
final class FrontNavRolePermissionTest extends TestCase
{
    /** @var array<string, bool> */
    private array $granted = [];

    private function makeVisitor(): Authenticatable&FrontNavAuthorizable
    {
        $granted = &$this->granted;

        return new class($granted) implements Authenticatable, FrontNavAuthorizable
        {
            /** @param array<string, bool> $granted */
            public function __construct(private array &$granted) {}

            public function hasPermission(string $slug): bool
            {
                return $this->granted[$slug] ?? false;
            }

            public function getAuthIdentifierName(): string
            {
                return 'id';
            }

            public function getAuthIdentifier(): mixed
            {
                return 99;
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

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('front-nav.cache.ttl', 0);
        config()->set('front-nav.front.enabled', true);
        // Swap to the role-permission-aware visibility implementation.
        $this->app->singleton(
            VisibilityChecker::class,
            fn () => new RolePermissionAwareVisibility(null, null),
        );

        /** @var NavRegistry $registry */
        $registry = $this->app->make(NavRegistry::class);
        if (method_exists($registry, 'reset')) {
            $registry->reset();
        }
        $registry->group('admin', function ($r): void {
            $r->add(new NavItem(
                key: 'admin.dashboard',
                label: '控制台',
                location: NavLocation::Sidebar,
                url: '/admin',
                sort: 1,
                requiresAuth: true,
                permission: 'admin.view',
            ));
            $r->add(new NavItem(
                key: 'admin.users',
                label: '用户管理',
                location: NavLocation::Sidebar,
                url: '/admin/users',
                sort: 2,
                requiresAuth: true,
                permission: 'admin.users.manage',
            ));
        });
        if (method_exists($registry, 'flush')) {
            $registry->flush();
        }
    }

    public function test_visitor_without_required_permission_is_hidden(): void
    {
        $this->granted = ['admin.view' => true]; // only dashboard allowed

        $response = $this->actingAs($this->makeVisitor())
            ->getJson('/api/v1/front-nav?location=sidebar');

        $response->assertOk();

        $keys = array_column($response->json('data'), 'key');
        self::assertContains('admin.dashboard', $keys);
        self::assertNotContains('admin.users', $keys);
    }

    public function test_visitor_with_all_permissions_sees_everything(): void
    {
        $this->granted = [
            'admin.view' => true,
            'admin.users.manage' => true,
        ];

        $response = $this->actingAs($this->makeVisitor())
            ->getJson('/api/v1/front-nav?location=sidebar');

        $keys = array_column($response->json('data'), 'key');
        self::assertContains('admin.dashboard', $keys);
        self::assertContains('admin.users', $keys);
    }

    public function test_anonymous_visitor_with_requires_auth_is_hidden(): void
    {
        // No actingAs — guest.
        $response = $this->getJson('/api/v1/front-nav?location=sidebar');

        $keys = array_column($response->json('data'), 'key');
        self::assertNotContains('admin.dashboard', $keys);
        self::assertNotContains('admin.users', $keys);
    }
}
