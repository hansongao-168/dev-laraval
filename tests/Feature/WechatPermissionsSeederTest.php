<?php

namespace Tests\Feature;

use Gz168\RolePermission\Database\Seeders\PermissionSeeder;
use Gz168\RolePermission\Models\Permission;
use Gz168\RolePermission\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WechatPermissionsSeederTest extends TestCase
{
    use RefreshDatabase;

    /** @var list<string> */
    protected array $slugs = [
        'wechat.view',
        'wechat.create',
        'wechat.edit',
        'wechat.delete',
        'wechat.authorize',
        'wechat.pay.manage',
        'wechat.pay.view',
        'wechat.pay.transfer',
        'wechat.message.send',
        'wechat.message.view',
        'wechat.oa.manage',
        'wechat.oa.view',
    ];

    public function test_seeder_creates_all_wechat_permissions(): void
    {
        $this->seed(PermissionSeeder::class);

        foreach ($this->slugs as $slug) {
            $this->assertDatabaseHas('permissions', ['slug' => $slug]);
        }
    }

    public function test_seeder_is_idempotent(): void
    {
        $this->seed(PermissionSeeder::class);
        $this->seed(PermissionSeeder::class);

        foreach ($this->slugs as $slug) {
            $this->assertSame(1, Permission::query()->where('slug', $slug)->count());
        }
    }

    public function test_admin_role_receives_wechat_permissions(): void
    {
        Role::query()->firstOrCreate(['slug' => 'admin'], ['name' => 'Admin']);

        $this->seed(PermissionSeeder::class);

        $admin = Role::query()->where('slug', 'admin')->firstOrFail();

        foreach ($this->slugs as $slug) {
            $this->assertTrue($admin->permissions()->where('slug', $slug)->exists(), "admin role should have [$slug]");
        }
    }
}
