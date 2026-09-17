<?php

declare(strict_types=1);

namespace Tests\Feature\ApiDoc;

use Gz168\ApiDoc\Services\ApiDocResolvedTemplate;
use Gz168\ApiDoc\Services\ApiDocTemplateViewResolver;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ApiDocTemplateRenderJsTest extends TestCase
{
    #[Test]
    public function inline_js_returns_skin_value_or_repo_default(): void
    {
        $repo = (string) file_get_contents(dirname(__DIR__, 3).'/gz168/ApiDoc/resources/js/front/api-doc/api-doc.js');

        $custom = new ApiDocResolvedTemplate(
            key: 'skin', label: 'Skin', viewsPrefix: 'gz168-api-doc::front',
            assets: [], bodyParts: [], cssText: null, jsText: 'console.log(42);',
        );
        $empty = new ApiDocResolvedTemplate(
            key: 'classic', label: 'Classic', viewsPrefix: 'gz168-api-doc::front',
            assets: [], bodyParts: [], cssText: null, jsText: null,
        );

        $resolver = app(ApiDocTemplateViewResolver::class);

        $this->assertSame('console.log(42);', $resolver->inlineJs($custom));
        $this->assertSame($repo, $resolver->inlineJs($empty));
    }
}
