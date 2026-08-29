<?php

namespace Tests\Feature;

use Gz168\RolePermission\Database\Seeders\PermissionSeeder;
use Gz168\RolePermission\Models\Permission;
use Gz168\RolePermission\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MailPermissionsSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeder_creates_all_mail_permissions(): void
    {
        $this->seed(PermissionSeeder::class);

        foreach (['mail.view', 'mail.create', 'mail.edit', 'mail.delete', 'mail.authorize', 'mail.send'] as $slug) {
            $this->assertDatabaseHas('permissions', ['slug' => $slug]);
        }
    }

    public function test_seeder_is_idempotent(): void
    {
        $this->seed(PermissionSeeder::class);
        $this->seed(PermissionSeeder::class);

        $this->assertSame(1, Permission::query()->where('slug', 'mail.send')->count());
    }

    public function test_admin_role_receives_mail_permissions(): void
    {
        Role::query()->firstOrCreate(['slug' => 'admin'], ['name' => 'Admin']);

        $this->seed(PermissionSeeder::class);

        $admin = Role::query()->where('slug', 'admin')->firstOrFail();

        $this->assertTrue($admin->permissions()->where('slug', 'mail.view')->exists());
        $this->assertTrue($admin->permissions()->where('slug', 'mail.send')->exists());
    }
}
