<?php

declare(strict_types=1);

namespace Tests\Feature\FrontNav;

use Tests\TestCase;

/**
 * Cross-contract alignment guard: `storage/app/openapi/front-nav.yaml`
 * wire spec must list the same NavItem fields as the SDK's TypeScript
 * `NavItem` interface.
 *
 * This is the third leg of the four-source sync contract:
 *   1. Gz168\FrontNav\Contracts\NavItem (PHP DTO)
 *   2. NavItemResource::toArray()        (serializer)
 *   3. storage/app/openapi/front-nav.yaml (wire spec)
 *   4. packages/front-nav/src/core/types.d.ts (SDK type)
 *
 * M15 guards 1↔3. This test guards 3↔4 — every yaml `FrontNavItem`
 * property must appear in the SDK `NavItem` interface, and vice-versa.
 */
final class FrontNavSdkYamlAlignmentTest extends TestCase
{
    public function test_yaml_schema_matches_sdk_nav_item_fields(): void
    {
        $yamlProps = $this->yamlNavItemProperties();
        $sdkFields = $this->sdkNavItemFields();
        $expectedSdk = $this->expectedSdkFields();

        // The SDK interface must be a superset of the wire spec: every
        // property the API returns has a typed field in the SDK.
        $missingInSdk = array_values(array_diff($yamlProps, $sdkFields));
        self::assertSame([], $missingInSdk,
            'Every yaml FrontNavItem property must have a matching SDK NavItem field. Missing: '.implode(', ', $missingInSdk));

        // The SDK must not declare fields the wire never sends.
        $extraInSdk = array_values(array_diff($expectedSdk, $yamlProps));
        self::assertSame([], $extraInSdk,
            'SDK NavItem must not declare fields absent from yaml. Extra: '.implode(', ', $extraInSdk));
    }

    /**
     * @return array<int, string>
     */
    private function yamlNavItemProperties(): array
    {
        $path = base_path('storage/app/openapi/front-nav.yaml');
        $raw = file_get_contents($path);
        self::assertIsString($raw);

        // Locate the `FrontNavItem:` schema, then within it the
        // `properties:` block. Property keys are the 6-space-indented
        // lines directly under `properties:`.
        $pos = strpos($raw, '    FrontNavItem:');
        self::assertNotFalse($pos, 'FrontNavItem schema not found in yaml');
        $itemBlock = substr($raw, $pos);

        $propPos = strpos($itemBlock, '      properties:');
        self::assertNotFalse($propPos, 'FrontNavItem.properties not found in yaml');
        $propBlock = substr($itemBlock, $propPos);

        // Stop at the next top-level key (8 spaces = nested; 4+ = end of
        // this schema's properties). Property keys are 6-space indented.
        $end = preg_match('/\n    [A-Z]\w+:/', $propBlock, $_, PREG_OFFSET_CAPTURE);
        if ($end) {
            $propBlock = substr($propBlock, 0, $_[0][1]);
        }

        // Property keys are 8-space indented (nested under `properties:`).
        preg_match_all('/^        ([a-zA-Z][a-zA-Z0-9]*):/m', $propBlock, $m);
        $props = array_unique($m[1]);
        sort($props);

        return array_values($props);
    }

    /**
     * @return array<int, string>
     */
    private function sdkNavItemFields(): array
    {
        $path = base_path('packages/front-nav/src/core/types.d.ts');
        $raw = file_get_contents($path);
        self::assertIsString($raw);

        // Match field declarations `  name: type;` inside the NavItem interface.
        if (! preg_match('/export interface NavItem \{(.*?)\n\}/s', $raw, $m)) {
            self::fail('NavItem interface not found in SDK types.d.ts');
        }

        preg_match_all('/^\s{2}([a-zA-Z][a-zA-Z0-9]*):/m', $m[1], $f);
        $fields = array_unique($f[1]);
        sort($fields);

        return array_values($fields);
    }

    /**
     * The SDK fields that correspond to wire-stable NavItem fields.
     * `children` is included because the serializer emits it.
     *
     * @return array<int, string>
     */
    private function expectedSdkFields(): array
    {
        $fields = [
            'children', 'enabled', 'i18nLocales', 'icon', 'key', 'label',
            'labelKey', 'location', 'meta', 'parent', 'permission',
            'requiresAuth', 'sort', 'url',
        ];
        sort($fields);

        return $fields;
    }
}
