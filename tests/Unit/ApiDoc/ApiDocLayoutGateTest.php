<?php

declare(strict_types=1);

namespace Tests\Unit\ApiDoc;

use App\Models\User;
use Gz168\ApiDoc\Support\ApiDocLayoutGate;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ApiDocLayoutGateTest extends TestCase
{
    use LazilyRefreshDatabase;

    #[Test]
    public function super_admin_is_allowed(): void
    {
        $user = User::factory()->make();
        $user->forceFill(['is_super_admin' => true, 'is_protected' => false])->saveQuietly();
        $this->assertTrue(ApiDocLayoutGate::allows($user));
    }

    #[Test]
    public function user_without_permission_is_denied(): void
    {
        $user = User::factory()->make();
        $user->forceFill(['is_super_admin' => false, 'is_protected' => false])->saveQuietly();
        $this->assertFalse(ApiDocLayoutGate::allows($user));
    }
}
