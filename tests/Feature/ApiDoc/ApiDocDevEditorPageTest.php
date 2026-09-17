<?php

declare(strict_types=1);

namespace Tests\Feature\ApiDoc;

use App\Models\User;
use Filament\Facades\Filament;
use Gz168\ApiDoc\Filament\Pages\ApiDocDevEditorPage;
use Gz168\ApiDoc\Services\ApiDocCacheManager;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\File;
use Livewire\Livewire;
use Mockery;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ApiDocDevEditorPageTest extends TestCase
{
    use LazilyRefreshDatabase;

    private string $tmp;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tmp = sys_get_temp_dir().'/api-doc-dev-editor-page-'.uniqid();
        File::ensureDirectoryExists($this->tmp.'/front');
        File::put($this->tmp.'/front/demo.blade.php', '<div>hi</div>');

        config([
            'api-doc.dev_editor' => [
                'enabled' => true,
                'max_bytes' => 1024,
                'extensions' => ['blade.php', 'css', 'js', 'md', 'html'],
                'roots' => [
                    ['key' => 'fixture', 'label' => 'Fixture', 'path' => 'absolute:'.$this->tmp],
                ],
            ],
        ]);
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->tmp);
        parent::tearDown();
    }

    #[Test]
    public function non_protected_admin_cannot_access_page(): void
    {
        $user = User::factory()->make();
        $user->forceFill(['is_protected' => false, 'is_super_admin' => true])->saveQuietly();
        $this->actingAs($user);
        Filament::setCurrentPanel(Filament::getPanel('admin'));

        $this->assertFalse(ApiDocDevEditorPage::canAccess());
    }

    #[Test]
    public function protected_admin_can_access_when_enabled(): void
    {
        $user = User::factory()->make();
        $user->forceFill(['is_protected' => true, 'is_super_admin' => true])->saveQuietly();
        $this->actingAs($user);
        Filament::setCurrentPanel(Filament::getPanel('admin'));
        config(['api-doc.dev_editor.enabled' => true]);

        $this->assertTrue(ApiDocDevEditorPage::canAccess());
    }

    #[Test]
    public function disabled_config_blocks_access_even_for_protected_admin(): void
    {
        $user = User::factory()->make();
        $user->forceFill(['is_protected' => true, 'is_super_admin' => true])->saveQuietly();
        $this->actingAs($user);
        Filament::setCurrentPanel(Filament::getPanel('admin'));
        config(['api-doc.dev_editor.enabled' => false]);

        $this->assertFalse(ApiDocDevEditorPage::canAccess());
    }

    #[Test]
    public function livewire_save_writes_fixture_and_flushes_cache(): void
    {
        $user = User::factory()->make();
        $user->forceFill(['is_protected' => true, 'is_super_admin' => true])->saveQuietly();
        $this->actingAs($user);
        Filament::setCurrentPanel(Filament::getPanel('admin'));

        $cache = Mockery::mock(ApiDocCacheManager::class);
        $cache->shouldReceive('flush')->once();
        $this->app->instance(ApiDocCacheManager::class, $cache);

        Livewire::test(ApiDocDevEditorPage::class)
            ->assertSet('rootKey', 'fixture')
            ->call('openFile', 'front/demo.blade.php')
            ->assertSet('content', '<div>hi</div>')
            ->set('content', '<div>saved</div>')
            ->call('save');

        $this->assertSame('<div>saved</div>', File::get($this->tmp.'/front/demo.blade.php'));
    }
}
