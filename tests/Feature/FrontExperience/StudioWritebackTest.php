<?php

declare(strict_types=1);

namespace Tests\Feature\FrontExperience;

use Gz168\FrontPage\Infrastructure\PageFilesystem;
use Gz168\FrontTemplate\Infrastructure\YamlDocumentLoader;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

final class StudioWritebackTest extends TestCase
{
    private string $tempRoot;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tempRoot = storage_path('framework/testing/front-pages-'.uniqid('', true));
        File::ensureDirectoryExists($this->tempRoot);

        $this->app->singleton(PageFilesystem::class, function (): PageFilesystem {
            return new PageFilesystem($this->tempRoot, $this->app->make(YamlDocumentLoader::class));
        });
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->tempRoot);
        parent::tearDown();
    }

    public function test_put_writes_yaml_under_pages_root_in_testing(): void
    {
        $document = [
            'schemaVersion' => 1,
            'page' => [
                'slug' => 'studio-demo',
                'channel' => 'all',
                'shellKey' => 'storefront.main',
                'defaultSkinCode' => 'classic',
                'themePolicy' => 'follow_schedule',
            ],
            'shell' => [
                'key' => 'storefront.main',
                'slots' => [
                    'header' => [
                        ['id' => 'n1', 'type' => 'shell.nav-bar', 'props' => ['navLocation' => 'header']],
                    ],
                    'main' => [],
                    'footer' => [],
                    'floating' => [],
                ],
            ],
        ];

        $response = $this->putJson('/api/v1/front-pages/studio-demo', [
            'channel' => 'all',
            'document' => $document,
        ]);

        $response->assertOk()
            ->assertJsonPath('data.relative', 'studio-demo.all.yaml');

        $path = $this->tempRoot.'/studio-demo.all.yaml';
        $this->assertFileExists($path);

        $loaded = app(YamlDocumentLoader::class)->load($path);
        $this->assertSame('studio-demo', $loaded['page']['slug']);
    }

    public function test_put_strips_theme_overlay_blocks(): void
    {
        $document = [
            'schemaVersion' => 1,
            'page' => [
                'slug' => 'studio-overlay',
                'channel' => 'all',
                'shellKey' => 'storefront.main',
                'defaultSkinCode' => 'classic',
                'themePolicy' => 'follow_schedule',
            ],
            'shell' => [
                'key' => 'storefront.main',
                'slots' => [
                    'header' => [],
                    'main' => [
                        [
                            'id' => 'xmas-announce',
                            'type' => 'shell.announcement',
                            'props' => [
                                'text' => 'Merry',
                                'themeOverlay' => true,
                                'themeCode' => 'christmas',
                            ],
                        ],
                        [
                            'id' => 'banner',
                            'type' => 'mall.banner-carousel',
                            'props' => ['partKey' => 'mall.banner.home'],
                        ],
                    ],
                    'footer' => [],
                    'floating' => [],
                ],
            ],
        ];

        $this->putJson('/api/v1/front-pages/studio-overlay', [
            'channel' => 'all',
            'document' => $document,
        ])->assertOk();

        $loaded = app(YamlDocumentLoader::class)->load($this->tempRoot.'/studio-overlay.all.yaml');
        $ids = array_column($loaded['shell']['slots']['main'], 'id');
        $this->assertSame(['banner'], $ids);
    }

    public function test_put_rejects_path_traversal_slug(): void
    {
        $this->putJson('/api/v1/front-pages/../evil', [
            'channel' => 'all',
            'document' => [
                'schemaVersion' => 1,
                'page' => ['slug' => 'x', 'channel' => 'all', 'shellKey' => 'storefront.main'],
                'shell' => ['key' => 'storefront.main', 'slots' => []],
            ],
        ])->assertStatus(422);
    }

    public function test_put_disabled_in_production(): void
    {
        $previous = (string) $this->app->environment();
        $this->app->detectEnvironment(fn (): string => 'production');

        try {
            $this->putJson('/api/v1/front-pages/studio-demo', [
                'channel' => 'all',
                'document' => [
                    'schemaVersion' => 1,
                    'page' => ['slug' => 'studio-demo', 'channel' => 'all', 'shellKey' => 'storefront.main'],
                    'shell' => ['key' => 'storefront.main', 'slots' => []],
                ],
            ])->assertNotFound();
        } finally {
            $this->app->detectEnvironment(fn (): string => $previous);
        }
    }
}
