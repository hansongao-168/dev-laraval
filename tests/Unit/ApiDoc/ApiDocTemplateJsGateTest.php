<?php

declare(strict_types=1);

namespace Tests\Unit\ApiDoc;

use App\Models\User;
use Gz168\ApiDoc\Support\ApiDocTemplateJsGate;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ApiDocTemplateJsGateTest extends TestCase
{
    #[Test]
    public function denies_anonymous_users(): void
    {
        $this->assertFalse(ApiDocTemplateJsGate::allows(null));
    }

    #[Test]
    public function denies_super_admin_without_protected(): void
    {
        $user = new User;
        $user->forceFill(['is_protected' => false, 'is_super_admin' => true]);
        $this->assertFalse(ApiDocTemplateJsGate::allows($user));
    }

    #[Test]
    public function denies_protected_user_without_super_admin(): void
    {
        $user = new User;
        $user->forceFill(['is_protected' => true, 'is_super_admin' => false]);
        $this->assertFalse(ApiDocTemplateJsGate::allows($user));
    }

    #[Test]
    public function allows_protected_super_admin(): void
    {
        $user = new User;
        $user->forceFill(['is_protected' => true, 'is_super_admin' => true]);
        $this->assertTrue(ApiDocTemplateJsGate::allows($user));
    }
}
