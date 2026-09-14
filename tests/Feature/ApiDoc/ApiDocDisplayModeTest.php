<?php

declare(strict_types=1);

namespace Tests\Feature\ApiDoc;

use Gz168\ApiDoc\Database\Seeders\ApiDocDisplayModeSeeder;
use Gz168\ApiDoc\Models\ApiDocDisplayMode;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ApiDocDisplayModeTest extends TestCase
{
    use LazilyRefreshDatabase;

    #[Test]
    public function seeder_inserts_five_modes_with_one_default(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);

        $this->assertSame(5, ApiDocDisplayMode::query()->count());
        $this->assertSame(1, ApiDocDisplayMode::query()->where('is_default', true)->count());
        $this->assertSame(['fr'], ApiDocDisplayMode::query()->where('code', 'fr')->value('locales'));
        $this->assertSame(['fr', 'zh'], ApiDocDisplayMode::query()->where('code', 'fr_zh')->value('locales'));
    }
}
