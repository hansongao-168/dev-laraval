<?php

namespace Tests\Feature;

use Filament\Facades\Filament;
use Gz168\AttributeManagement\Filament\Resources\AttributeDefinitionResource;
use Gz168\GmailApi\Services\GmailApiService;
use Gz168\KafkaManagement\Filament\Pages\KafkaManagementPage;
use Gz168\ModuleCore\Data\ModuleDefinition;
use Gz168\ModuleCore\Support\ModulePathResolver;
use Gz168\ModuleCore\Support\ModuleScanner;
use Gz168\ModuleSettings\Filament\Pages\ModuleSettingsPage;
use Gz168\RedisManagement\Filament\Pages\RedisManagementPage;
use Gz168\UserManagement\Filament\Resources\UserResource;
use Tests\TestCase;

class AdminPanelModuleDiscoveryTest extends TestCase
{
    public function test_all_gz168_modules_are_installed_and_active(): void
    {
        $modules = (new ModuleScanner(base_path('gz168')))->scan();

        $this->assertCount(27, $modules);
        $this->assertNotContains(false, array_map(
            static fn (ModuleDefinition $module): bool => $module->active,
            $modules,
        ));
        $this->assertTrue(app()->bound(GmailApiService::class));
    }

    public function test_module_infrastructure_is_resolved_as_shared_services(): void
    {
        $this->assertSame(app(ModuleScanner::class), app(ModuleScanner::class));
        $this->assertSame(app(ModulePathResolver::class), app(ModulePathResolver::class));
        $this->assertSame('module-core', app(ModulePathResolver::class)->resolveByAlias('module-core')->alias);
    }

    public function test_filament_assets_are_discovered_from_module_source_paths(): void
    {
        $panel = Filament::getPanel('admin');

        $this->assertContains(AttributeDefinitionResource::class, $panel->getResources());
        $this->assertContains(UserResource::class, $panel->getResources());
        $this->assertContains(KafkaManagementPage::class, $panel->getPages());
        $this->assertContains(RedisManagementPage::class, $panel->getPages());
    }

    public function test_module_settings_page_lists_every_installed_module(): void
    {
        $this->assertCount(27, (new ModuleSettingsPage)->getInstalledModules());
    }
}
