<?php

declare(strict_types=1);

namespace Tests\Unit\FrontPage;

use Gz168\FrontPage\Application\JsonSchemaValidator;
use Tests\TestCase;

final class JsonSchemaValidatorTest extends TestCase
{
    public function test_accepts_valid_page_document_against_front_schema(): void
    {
        $schema = json_decode(
            (string) file_get_contents(base_path('packages/front-schema/schemas/page-document.json')),
            true,
        );

        $errors = (new JsonSchemaValidator)->validate([
            'schemaVersion' => 1,
            'page' => [
                'slug' => 'home',
                'channel' => 'all',
                'shellKey' => 'storefront.main',
            ],
            'shell' => [
                'key' => 'storefront.main',
                'slots' => [
                    'main' => [
                        ['id' => 'b1', 'type' => 'content.rich-text'],
                    ],
                ],
            ],
        ], $schema);

        $this->assertSame([], $errors);
    }

    public function test_rejects_invalid_call_on_error(): void
    {
        $schema = json_decode(
            (string) file_get_contents(base_path('packages/front-schema/schemas/page-document.json')),
            true,
        );

        $errors = (new JsonSchemaValidator)->validate([
            'schemaVersion' => 1,
            'page' => [
                'slug' => 'home',
                'channel' => 'all',
                'shellKey' => 'storefront.main',
            ],
            'shell' => [
                'key' => 'storefront.main',
                'slots' => [
                    'main' => [
                        [
                            'id' => 'b1',
                            'type' => 'mall.product-grid',
                            'call' => [
                                'capability' => 'mall.catalog.collection',
                                'onError' => 'nope',
                            ],
                        ],
                    ],
                ],
            ],
        ], $schema);

        $this->assertNotSame([], $errors);
        $this->assertTrue(collect($errors)->contains(fn (string $e): bool => str_contains($e, 'enum')));
    }
}
