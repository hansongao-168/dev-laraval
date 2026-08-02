<?php

namespace Tests\Feature;

use App\Models\User;
use Gz168\GitManagement\Support\GitManagementAuthorization;
use Gz168\RedisManagement\Filament\Pages\RedisManagementPage;
use Gz168\RolePermission\Contracts\Authorizable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The host `User` model must satisfy `Gz168\RolePermission\Contracts\Authorizable`
 * and short-circuit `hasPermission()` for the protected super administrator.
 * Otherwise gz168 Filament pages and resources that gate `canAccess()` and
 * `shouldRegisterNavigation()` on `hasPermission(...)` disappear from the
 * admin sidebar even though the protected admin can authenticate.
 */
class AdminModuleVisibilityForSuperAdminTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_model_implements_authorizable_contract(): void
    {
        $user = User::factory()->create();

        $this->assertInstanceOf(Authorizable::class, $user);
    }

    public function test_super_administrator_bypasses_permission_lookup(): void
    {
        $admin = $this->createProtectedSuperAdministrator();

        // Slug intentionally does not exist anywhere — the bypass must still grant it.
        $this->assertTrue($admin->hasPermission('redis-management.view'));
        $this->assertTrue($admin->hasPermission('git-management.view'));
        $this->assertTrue($admin->hasPermission('any-arbitrary-slug'));
    }

    public function test_regular_user_without_admin_flag_fails_permission_lookup(): void
    {
        $user = User::factory()->create();
        $user->forceFill(['is_super_admin' => false, 'is_admin' => false])->save();

        $this->assertFalse($user->hasPermission('redis-management.view'));
    }

    public function test_regular_admin_user_bypasses_permission_lookup(): void
    {
        $user = User::factory()->create();
        $user->forceFill(['is_super_admin' => false, 'is_admin' => true])->save();

        $this->assertTrue($user->hasPermission('redis-management.view'));
    }

    public function test_gz168_admin_pages_are_accessible_to_super_admin(): void
    {
        $admin = $this->createProtectedSuperAdministrator();
        auth()->login($admin);

        $this->assertTrue(GitManagementAuthorization::canView());
        $this->assertTrue(RedisManagementPage::canAccess());
    }

    private function createProtectedSuperAdministrator(): User
    {
        $admin = User::factory()->make();
        $admin->forceFill([
            'is_protected' => true,
            'is_super_admin' => true,
        ])->saveQuietly();

        return $admin;
    }
}
