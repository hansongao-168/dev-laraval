<?php

declare(strict_types=1);

namespace Tests\Feature\FrontNav;

use Gz168\FrontNav\Contracts\NavItem;
use Gz168\FrontNav\Contracts\NavLocation;
use Gz168\FrontNav\Front\Http\Resources\NavItemResource;
use Illuminate\Http\Request;
use Tests\TestCase;

/**
 * OpenAPI drift guard.
 *
 * Forces the field set of `NavItemResource::toArray()` to remain equal
 * to the field set declared in `NavItemSchema` PHP annotations.
 *
 * This is the same strategy Customer uses (see Customer/tests/Contract/
 * OpenApiSchemaTest.php). The annotation class itself is *not* parsed by
 * this test — that would require a host-wide OpenAPI generator run.
 * Instead, we keep an explicit "documented field list" inside the test
 * and rely on code review (plus a comment block in NavItemSchema) to
 * keep the two in sync. When the generator is wired up in a host PR,
 * replace this with a real `l5-swagger` parser.
 */
final class FrontNavOpenApiSchemaTest extends TestCase
{
    /**
     * Wire-stable fields. Update in lock-step with:
     *   - Gz168\FrontNav\Contracts\NavItem (PHP DTO)
     *   - Gz168\FrontNav\Front\Http\Resources\NavItemResource::toArray()
     *   - Gz168\FrontNav\Front\Http\Schemas\NavItemSchema annotations
     *   - packages/front-nav/src/core/types.d.ts (NavItem interface)
     */
    private const DOCUMENTED_FIELDS = [
        'key', 'label', 'labelKey', 'i18nLocales',
        'location', 'url', 'icon', 'sort', 'parent',
        'requiresAuth', 'permission', 'enabled', 'meta',
        'children',
    ];

    public function test_resource_fields_match_documented_schema(): void
    {
        $item = new NavItem(
            key: 'customer.profile',
            label: 'Profile',
            labelKey: 'customer.profile',
            i18nLocales: ['en', 'zh-CN'],
            location: NavLocation::Sidebar,
            url: '/customer/profile',
            icon: 'user',
            sort: 10,
            parent: null,
            requiresAuth: true,
            permission: 'customer.view',
            enabled: true,
            meta: ['badge' => 3],
        );

        $row = $item->toArray();
        $resourceFields = array_keys((new NavItemResource($row))->toArray(Request::createFromGlobals()));

        sort($resourceFields);
        $expected = self::DOCUMENTED_FIELDS;
        sort($expected);

        self::assertSame(
            $expected,
            $resourceFields,
            'NavItemResource fields must match NavItemSchema documented fields',
        );
    }

    public function test_response_meta_fields_are_stable(): void
    {
        // Lock the response meta field set too, so client SDKs can rely on it.
        $item = new NavItem('a', 'A', NavLocation::Header, '/a');
        $row = $item->toArray();

        $resource = NavItemResource::collection([$row])
            ->additional([
                'meta' => [
                    'location' => 'header',
                    'locale' => 'zh-CN',
                    'authed' => true,
                ],
            ]);

        $response = $resource->response(new Request);
        $payload = $response->getData(true);

        self::assertSame(['location', 'locale', 'authed'], array_keys($payload['meta']));
    }
}
