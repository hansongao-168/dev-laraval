<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use LogicException;
use Tests\TestCase;

class ProtectedSuperAdministratorTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_protected_administrator_can_modify_allowed_attributes(): void
    {
        $admin = $this->createProtectedAdministrator();

        $admin->forceFill([
            'email' => 'updated@example.com',
            'password' => 'updated-password',
            'is_super_admin' => false,
        ])->save();

        $admin->refresh();

        $this->assertSame('updated@example.com', $admin->email);
        $this->assertTrue(Hash::check('updated-password', $admin->password));
        $this->assertFalse($admin->is_super_admin);
        $this->assertTrue($admin->is_protected);
    }

    public function test_the_protected_administrator_cannot_modify_other_attributes(): void
    {
        $admin = $this->createProtectedAdministrator();

        $this->expectException(LogicException::class);

        $admin->update(['name' => 'Changed']);
    }

    public function test_the_protected_administrator_cannot_be_deleted_after_demotion(): void
    {
        $admin = $this->createProtectedAdministrator();
        $admin->forceFill([
            'is_super_admin' => false,
        ])->save();

        $this->expectException(LogicException::class);

        $admin->delete();
    }

    public function test_a_regular_user_can_still_be_modified_and_deleted(): void
    {
        $user = User::factory()->create();

        $user->update(['name' => 'Changed']);

        $this->assertSame('Changed', $user->fresh()->name);
        $this->assertTrue((bool) $user->delete());
    }

    private function createProtectedAdministrator(): User
    {
        $admin = User::factory()->make();
        $admin->forceFill([
            'is_protected' => true,
            'is_super_admin' => true,
        ])->saveQuietly();

        return $admin;
    }
}
