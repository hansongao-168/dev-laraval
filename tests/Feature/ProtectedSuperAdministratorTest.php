<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use LogicException;
use Tests\TestCase;

class ProtectedSuperAdministratorTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_super_administrator_cannot_be_modified(): void
    {
        $admin = $this->createProtectedAdministrator();

        $this->expectException(LogicException::class);

        $admin->update(['name' => 'Changed']);
    }

    public function test_the_super_administrator_cannot_be_deleted(): void
    {
        $admin = $this->createProtectedAdministrator();

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
        $admin->forceFill(['is_super_admin' => true])->saveQuietly();

        return $admin;
    }
}
