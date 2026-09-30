<?php

declare(strict_types=1);

namespace Tests\Feature\MallContent;

use Gz168\MallContent\Database\Seeders\MallContentPermissionSeeder;
use Gz168\RolePermission\Models\Permission;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

final class MallContentPermissionSeederTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_seeds_mall_content_permissions(): void
    {
        if (! Schema::hasTable('permissions')) {
            $this->markTestSkipped('RolePermission migrations are not loaded in this test DB.');
        }

        $this->seed(MallContentPermissionSeeder::class);

        $slugs = [
            'mall.content.banners.view',
            'mall.content.banners.manage',
            'mall.content.articles.view',
            'mall.content.articles.manage',
            'mall.content.faqs.view',
            'mall.content.faqs.manage',
        ];

        foreach ($slugs as $slug) {
            $this->assertNotNull(Permission::query()->where('slug', $slug)->first());
        }
    }
}
