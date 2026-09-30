<?php

declare(strict_types=1);

namespace Tests\Feature\FrontExperience;

use Gz168\FrontTemplate\Application\WriteThemeOverlaysAction;
use Gz168\FrontTemplate\Infrastructure\ThemeFilesystem;
use Gz168\FrontTemplate\Infrastructure\YamlDocumentLoader;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

final class ThemeOverlaysWritebackTest extends TestCase
{
    private string $tempRoot;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tempRoot = storage_path('framework/testing/front-themes-'.uniqid('', true));
        File::ensureDirectoryExists($this->tempRoot);

        File::put($this->tempRoot.'/studio-theme.yaml', <<<'YAML'
code: studio-theme
label:
  en: Studio Theme
skinCode: classic
enabled: true
channels: [all]
YAML);

        $this->app->singleton(ThemeFilesystem::class, function (): ThemeFilesystem {
            return new ThemeFilesystem($this->tempRoot, $this->app->make(YamlDocumentLoader::class));
        });
        $this->app->forgetInstance(WriteThemeOverlaysAction::class);
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->tempRoot);
        parent::tearDown();
    }

    public function test_put_writes_page_overlays_to_theme_yaml(): void
    {
        $overlays = [
            'home' => [
                'main' => [
                    'prepend' => [
                        [
                            'id' => 'studio-announce',
                            'type' => 'shell.announcement',
                            'props' => ['text' => 'Hello from Studio'],
                        ],
                    ],
                    'append' => [],
                ],
            ],
        ];

        $response = $this->putJson('/api/v1/front-templates/themes/studio-theme/page-overlays', [
            'pageOverlays' => $overlays,
        ]);

        $response->assertOk()
            ->assertJsonPath('data.relative', 'studio-theme.yaml')
            ->assertJsonPath('data.theme.pageOverlays.home.main.prepend.0.id', 'studio-announce');

        $loaded = app(YamlDocumentLoader::class)->load($this->tempRoot.'/studio-theme.yaml');
        $this->assertSame('studio-announce', $loaded['pageOverlays']['home']['main']['prepend'][0]['id']);
        $this->assertSame('classic', $loaded['skinCode']);
    }

    public function test_put_rejects_invalid_overlay_shape(): void
    {
        $this->putJson('/api/v1/front-templates/themes/studio-theme/page-overlays', [
            'pageOverlays' => [
                'home' => [
                    'main' => [
                        'prepend' => [
                            ['id' => 'broken'],
                        ],
                    ],
                ],
            ],
        ])->assertStatus(422);
    }

    public function test_put_clears_overlays_with_null(): void
    {
        File::put($this->tempRoot.'/studio-theme.yaml', <<<'YAML'
code: studio-theme
skinCode: classic
enabled: true
pageOverlays:
  home:
    main:
      prepend:
        - id: old
          type: shell.announcement
YAML);

        $this->putJson('/api/v1/front-templates/themes/studio-theme/page-overlays', [
            'pageOverlays' => null,
        ])->assertOk();

        $loaded = app(YamlDocumentLoader::class)->load($this->tempRoot.'/studio-theme.yaml');
        $this->assertArrayNotHasKey('pageOverlays', $loaded);
    }

    public function test_put_disabled_in_production(): void
    {
        $previous = (string) $this->app->environment();
        $this->app->detectEnvironment(fn (): string => 'production');

        try {
            $this->putJson('/api/v1/front-templates/themes/studio-theme/page-overlays', [
                'pageOverlays' => [],
            ])->assertNotFound();
        } finally {
            $this->app->detectEnvironment(fn (): string => $previous);
        }
    }

    public function test_put_writes_overlay_placeholders_to_theme_yaml(): void
    {
        $response = $this->putJson('/api/v1/front-templates/themes/studio-theme/page-overlays', [
            'pageOverlays' => null,
            'overlayPlaceholders' => [
                ['slug' => 'home', 'slot' => 'main'],
                ['slug' => 'help', 'slot' => 'main'],
                ['slug' => 'home', 'slot' => 'main'],
            ],
        ]);

        $response->assertOk()
            ->assertJsonPath('data.theme.overlayPlaceholders.0.slug', 'home')
            ->assertJsonPath('data.theme.overlayPlaceholders.0.slot', 'main')
            ->assertJsonPath('data.theme.overlayPlaceholders.1.slug', 'help')
            ->assertJsonCount(2, 'data.theme.overlayPlaceholders');

        $loaded = app(YamlDocumentLoader::class)->load($this->tempRoot.'/studio-theme.yaml');
        $this->assertSame(
            [
                ['slug' => 'home', 'slot' => 'main'],
                ['slug' => 'help', 'slot' => 'main'],
            ],
            $loaded['overlayPlaceholders'],
        );
        $this->assertArrayNotHasKey('pageOverlays', $loaded);
    }

    public function test_put_clears_overlay_placeholders_with_null(): void
    {
        File::put($this->tempRoot.'/studio-theme.yaml', <<<'YAML'
code: studio-theme
skinCode: classic
enabled: true
overlayPlaceholders:
  - slug: home
    slot: main
YAML);

        $this->putJson('/api/v1/front-templates/themes/studio-theme/page-overlays', [
            'pageOverlays' => null,
            'overlayPlaceholders' => null,
        ])->assertOk();

        $loaded = app(YamlDocumentLoader::class)->load($this->tempRoot.'/studio-theme.yaml');
        $this->assertArrayNotHasKey('overlayPlaceholders', $loaded);
    }

    public function test_put_rejects_invalid_overlay_placeholders(): void
    {
        $this->putJson('/api/v1/front-templates/themes/studio-theme/page-overlays', [
            'pageOverlays' => null,
            'overlayPlaceholders' => [
                ['slug' => 'bad slug!', 'slot' => 'main'],
            ],
        ])->assertStatus(422);
    }

    public function test_show_theme_returns_document(): void
    {
        $this->getJson('/api/v1/front-templates/themes/studio-theme')
            ->assertOk()
            ->assertJsonPath('data.code', 'studio-theme')
            ->assertJsonPath('data.skinCode', 'classic');
    }
}
