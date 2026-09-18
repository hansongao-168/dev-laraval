<?php

declare(strict_types=1);

namespace Tests\Unit\ApiDoc;

use Gz168\ApiDoc\Support\ApiDocIntroShape;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ApiDocIntroShapeTest extends TestCase
{
    #[Test]
    public function paras_round_trip_through_form_and_storage_shapes(): void
    {
        $storage = [
            ['fr' => 'Bonjour', 'zh' => '你好', 'en' => 'Hello'],
        ];

        $form = ApiDocIntroShape::parasForForm($storage);
        $this->assertSame('Bonjour', $form[0]['text']['fr']);

        $back = ApiDocIntroShape::parasForStorage($form);
        $this->assertSame($storage, $back);
    }

    #[Test]
    public function base_round_trip_and_legacy_numeric_rows(): void
    {
        $storage = [
            [['fr' => 'URL', 'zh' => '地址', 'en' => 'URL'], 'https://example.test'],
        ];

        $form = ApiDocIntroShape::baseForForm($storage);
        $this->assertSame('https://example.test', $form[0]['value']);
        $this->assertSame('地址', $form[0]['label']['zh']);

        $back = ApiDocIntroShape::baseForStorage($form);
        $this->assertSame($storage, $back);
    }
}
