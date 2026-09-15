<?php

declare(strict_types=1);

namespace Tests\Unit\ApiDoc;

use Gz168\ApiDoc\Services\ApiDocTemplateResolver;
use Illuminate\Support\Facades\Log;
use PHPUnit\Framework\Attributes\Test;
use RuntimeException;
use Tests\TestCase;

class ApiDocTemplateResolverTest extends TestCase
{
    #[Test]
    public function resolve_null_and_classic_use_default_skin(): void
    {
        $resolver = app(ApiDocTemplateResolver::class);

        $fromNull = $resolver->resolve(null);
        $fromClassic = $resolver->resolve('classic');

        $this->assertSame('classic', $fromNull->key);
        $this->assertSame('classic', $fromClassic->key);
        $this->assertSame('gz168-api-doc::front', $fromNull->viewsPrefix);
        $this->assertSame('gz168-api-doc::front.api-doc-page', $fromNull->view('api-doc-page'));
        $this->assertSame('gz168-api-doc::front.layout', $fromNull->view('layout'));
    }

    #[Test]
    public function resolve_unknown_key_falls_back_and_logs_warning(): void
    {
        Log::spy();
        $resolver = app(ApiDocTemplateResolver::class);

        $resolved = $resolver->resolve('nope', 'fr');

        $this->assertSame('classic', $resolved->key);
        Log::shouldHaveReceived('warning')->once();
    }

    #[Test]
    public function options_match_catalog_labels(): void
    {
        $options = app(ApiDocTemplateResolver::class)->options();

        $this->assertSame(['classic' => '经典'], $options);
        $this->assertTrue(app(ApiDocTemplateResolver::class)->isRegistered('classic'));
        $this->assertFalse(app(ApiDocTemplateResolver::class)->isRegistered('nope'));
    }

    #[Test]
    public function missing_default_in_catalog_fails_fast(): void
    {
        config([
            'api-doc.templates' => [
                'default' => 'missing',
                'catalog' => [
                    'classic' => [
                        'label' => '经典',
                        'views_prefix' => 'gz168-api-doc::front',
                        'assets' => [],
                    ],
                ],
            ],
        ]);

        $this->expectException(RuntimeException::class);
        app(ApiDocTemplateResolver::class)->resolve(null);
    }
}
