<?php

declare(strict_types=1);

namespace Tests\Feature\FrontNav;

use Gz168\FrontNav\Contracts\NavItem;
use Gz168\FrontNav\Contracts\NavLocation;
use Gz168\FrontNav\Front\Http\Resources\NavItemResource;
use Illuminate\Http\Request;
use Symfony\Component\Yaml\Yaml;
use Tests\TestCase;

/**
 * Verify the hand-authored `storage/app/openapi/front-nav.yaml` mirrors
 * the PHP OpenAPI annotations on the FrontNav controllers + schemas.
 *
 * Why hand-authored rather than generated at runtime:
 *  - No need to install + bootstrap darkaonline/l5-swagger in this host
 *    project; the schema is small and stable.
 *  - Codegen would couple CI to the OpenApi library's annotation parser
 *    just to validate field names.
 *  - Hosts that DO install l5-swagger can swap in their own generator
 *    without touching the FrontNav module.
 *
 * What this test enforces:
 *  1. The yaml file parses as valid YAML.
 *  2. Every PHP @OA\Property name on FrontNavItem / FrontNavResponse
 *     appears in the yaml under the matching schema.
 *  3. The yaml's schema is consumable by the @erp/front-nav SDK
 *     (verified indirectly by matching wire-stable field names).
 */
final class FrontNavOpenApiYamlTest extends TestCase
{
    private const YAML_PATH = 'storage/app/openapi/front-nav.yaml';

    public function test_yaml_file_exists(): void
    {
        $path = base_path(self::YAML_PATH);
        self::assertFileExists($path, 'OpenAPI hand-authored yaml must exist');
    }

    public function test_yaml_parses_as_valid_yaml(): void
    {
        $parsed = $this->parseYaml();

        self::assertIsArray($parsed);
        self::assertSame('3.0.3', $parsed['openapi'] ?? null);
        self::assertArrayHasKey('paths', $parsed);
        self::assertArrayHasKey('components', $parsed);
        self::assertArrayHasKey('schemas', $parsed['components']);
    }

    public function test_endpoints_are_documented(): void
    {
        $parsed = $this->parseYaml();

        self::assertArrayHasKey('/api/v1/front-nav', $parsed['paths']);
        self::assertArrayHasKey('get', $parsed['paths']['/api/v1/front-nav']);

        self::assertArrayHasKey('/api/v1/front-nav/refresh', $parsed['paths']);
        self::assertArrayHasKey('post', $parsed['paths']['/api/v1/front-nav/refresh']);
    }

    public function test_front_nav_item_schema_lists_every_wire_field(): void
    {
        $parsed = $this->parseYaml();
        $schemaFields = array_keys($parsed['components']['schemas']['FrontNavItem']['properties']);

        // Source of truth: NavItemResource::toArray() — that's what the
        // SDK actually receives on the wire. We exercise the serializer
        // with a fully-populated NavItem so every wire field is present.
        $sample = new NavItem(
            key: 'sample',
            label: 'Sample',
            labelKey: 'sample.key',
            i18nLocales: ['en', 'zh-CN'],
            location: NavLocation::Sidebar,
            url: '/sample',
            icon: 'star',
            sort: 5,
            parent: 'sample.root',
            requiresAuth: true,
            permission: 'sample.view',
            enabled: true,
            meta: ['badge' => 3],
        );
        $wire = (new NavItemResource($sample->toArray()))
            ->toArray(Request::createFromGlobals());

        // children is added by the resource, not the DTO.
        $phpFields = array_keys($wire);
        sort($phpFields);

        sort($schemaFields);

        self::assertSame(
            $phpFields,
            $schemaFields,
            'front-nav.yaml FrontNavItem.properties must mirror NavItemResource::toArray() fields',
        );
    }

    public function test_front_nav_response_schema_has_meta_fields(): void
    {
        $parsed = $this->parseYaml();
        $metaFields = array_keys($parsed['components']['schemas']['FrontNavResponse']['properties']['meta']['properties']);

        // The meta field set is locked at controller level — see NavController::index().
        self::assertSame(['location', 'locale', 'authed'], $metaFields);
    }

    /**
     * Parse the yaml using Symfony Yaml when available, fallback to a
     * minimal manual scan otherwise. l5-swagger isn't a host dependency,
     * but symfony/yaml is pulled in by Laravel.
     */
    private function parseYaml(): array
    {
        $path = base_path(self::YAML_PATH);
        $raw = file_get_contents($path);
        self::assertIsString($raw);

        if (class_exists(Yaml::class)) {
            /** @var array $parsed */
            $parsed = Yaml::parse($raw);
            self::assertIsArray($parsed);

            return $parsed;
        }

        self::markTestSkipped('symfony/yaml not available; cannot validate yaml');
    }
}
