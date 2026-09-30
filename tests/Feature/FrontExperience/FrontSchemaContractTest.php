<?php

declare(strict_types=1);

namespace Tests\Feature\FrontExperience;

use Gz168\FrontTemplate\Infrastructure\YamlDocumentLoader;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * Structural contract checks aligned with packages/front-schema schemas.
 * No JSON-Schema engine dependency — mirrors required fields only.
 */
final class FrontSchemaContractTest extends TestCase
{
    public function test_home_page_yaml_matches_page_document_contract(): void
    {
        $path = base_path('gz168/FrontPage/resources/pages/home.all.yaml');
        $doc = app(YamlDocumentLoader::class)->load($path);

        $this->assertSame(1, $doc['schemaVersion'] ?? null);
        $this->assertIsArray($doc['page'] ?? null);
        $this->assertNotSame('', $doc['page']['slug'] ?? '');
        $this->assertNotSame('', $doc['page']['channel'] ?? '');
        $this->assertNotSame('', $doc['page']['shellKey'] ?? '');
        $this->assertContains($doc['page']['themePolicy'] ?? null, [
            'follow_schedule',
            'ignore_schedule',
            'force_locked',
            null,
        ]);
        $this->assertIsArray($doc['shell']['slots'] ?? null);

        foreach ($doc['shell']['slots'] as $blocks) {
            $this->assertIsArray($blocks);
            foreach ($blocks as $block) {
                $this->assertIsString($block['id'] ?? null);
                $this->assertIsString($block['type'] ?? null);
                if (isset($block['call'])) {
                    $this->assertIsString($block['call']['capability'] ?? null);
                    $this->assertContains($block['call']['onError'] ?? 'fail', ['fail', 'omit', 'empty']);
                }
            }
        }
    }

    #[DataProvider('skinCodes')]
    public function test_skin_manifest_matches_contract(string $code): void
    {
        $path = base_path("gz168/FrontTemplate/resources/skins/{$code}/manifest.yaml");
        $manifest = app(YamlDocumentLoader::class)->load($path);

        $this->assertSame($code, $manifest['code'] ?? null);
        $this->assertSame(1, $manifest['schemaVersion'] ?? null);
        $this->assertIsArray($manifest['parts'] ?? null);

        foreach ($manifest['parts'] as $part) {
            $this->assertIsString($part['key'] ?? null);
            $partFile = base_path("gz168/FrontTemplate/resources/skins/{$code}/parts/{$part['key']}.yaml");
            $this->assertFileExists($partFile);
        }
    }

    #[DataProvider('themeCodes')]
    public function test_theme_yaml_matches_contract(string $code): void
    {
        $path = base_path("gz168/FrontTemplate/resources/themes/{$code}.yaml");
        $theme = app(YamlDocumentLoader::class)->load($path);

        $this->assertSame($code, $theme['code'] ?? null);
        $this->assertIsString($theme['skinCode'] ?? null);
        $this->assertFileExists(base_path('gz168/FrontTemplate/resources/skins/'.$theme['skinCode'].'/manifest.yaml'));
    }

    /**
     * @return list<array{0: string}>
     */
    public static function skinCodes(): array
    {
        return [
            ['classic'],
            ['national-day'],
            ['new-year'],
            ['christmas'],
        ];
    }

    /**
     * @return list<array{0: string}>
     */
    public static function themeCodes(): array
    {
        return [
            ['national-day'],
            ['new-year'],
            ['christmas'],
        ];
    }
}
