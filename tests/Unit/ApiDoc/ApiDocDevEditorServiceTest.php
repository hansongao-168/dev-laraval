<?php

declare(strict_types=1);

namespace Tests\Unit\ApiDoc;

use Gz168\ApiDoc\Services\ApiDocCacheManager;
use Gz168\ApiDoc\Services\ApiDocDevEditorService;
use Illuminate\Support\Facades\File;
use Mockery;
use PHPUnit\Framework\Attributes\Test;
use RuntimeException;
use Tests\TestCase;

class ApiDocDevEditorServiceTest extends TestCase
{
    private string $tmp;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tmp = sys_get_temp_dir().'/api-doc-dev-editor-'.uniqid();
        File::ensureDirectoryExists($this->tmp.'/front');
        File::put($this->tmp.'/front/demo.blade.php', '<div>hi</div>');
        File::put($this->tmp.'/front/skip.txt', 'nope');
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
    public function rejects_path_traversal(): void
    {
        $this->expectException(RuntimeException::class);
        app(ApiDocDevEditorService::class)->read('fixture', '../front/demo.blade.php');
    }

    #[Test]
    public function rejects_bad_extension(): void
    {
        $this->expectException(RuntimeException::class);
        app(ApiDocDevEditorService::class)->read('fixture', 'front/skip.txt');
    }

    #[Test]
    public function reads_and_writes_allowed_file_and_flushes_cache(): void
    {
        $cache = Mockery::mock(ApiDocCacheManager::class);
        $cache->shouldReceive('flush')->once();
        $this->app->instance(ApiDocCacheManager::class, $cache);

        $svc = app(ApiDocDevEditorService::class);
        $this->assertSame('<div>hi</div>', $svc->read('fixture', 'front/demo.blade.php'));
        $svc->write('fixture', 'front/demo.blade.php', '<div>yo</div>');
        $this->assertSame('<div>yo</div>', File::get($this->tmp.'/front/demo.blade.php'));
    }

    #[Test]
    public function rejects_symlink_escape_when_possible(): void
    {
        $outside = sys_get_temp_dir().'/api-doc-dev-editor-outside-'.uniqid();
        File::ensureDirectoryExists($outside);
        File::put($outside.'/secret.blade.php', 'secret');

        $link = $this->tmp.'/front/escape.blade.php';

        if (! @symlink($outside.'/secret.blade.php', $link)) {
            File::deleteDirectory($outside);
            $this->markTestSkipped('Unable to create symlink in this environment.');
        }

        try {
            $this->expectException(RuntimeException::class);
            app(ApiDocDevEditorService::class)->read('fixture', 'front/escape.blade.php');
        } finally {
            @unlink($link);
            File::deleteDirectory($outside);
        }
    }

    #[Test]
    public function list_tree_filters_extensions_and_only_prefix(): void
    {
        File::ensureDirectoryExists($this->tmp.'/front-skin');
        File::ensureDirectoryExists($this->tmp.'/filament');
        File::put($this->tmp.'/front-skin/page.blade.php', 'skin');
        File::put($this->tmp.'/filament/page.blade.php', 'nope');

        config([
            'api-doc.dev_editor.roots' => [
                [
                    'key' => 'skins',
                    'label' => 'Skins',
                    'path' => 'absolute:'.$this->tmp,
                    'only_prefix' => 'front-',
                ],
            ],
        ]);

        $tree = app(ApiDocDevEditorService::class)->listTree('skins');
        $paths = $this->flattenTreePaths($tree);

        $this->assertContains('front-skin/page.blade.php', $paths);
        $this->assertNotContains('filament/page.blade.php', $paths);
        $this->assertNotContains('front/skip.txt', $paths);
    }

    /**
     * @param  list<array{path:string,type:string,children?:array}>  $nodes
     * @return list<string>
     */
    private function flattenTreePaths(array $nodes): array
    {
        $paths = [];

        foreach ($nodes as $node) {
            if (($node['type'] ?? '') === 'file') {
                $paths[] = $node['path'];
            }

            foreach ($this->flattenTreePaths($node['children'] ?? []) as $child) {
                $paths[] = $child;
            }
        }

        return $paths;
    }
}
