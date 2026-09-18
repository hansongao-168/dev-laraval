<?php

declare(strict_types=1);

namespace Tests\Unit\ApiDoc;

use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ApiDocHelperTest extends TestCase
{
    #[Test]
    public function required_label_follows_single_locale_and_mode_codes(): void
    {
        $this->assertSame('oui', api_doc_required_label('y', 'fr'));
        $this->assertSame('是', api_doc_required_label('y', 'zh'));
        $this->assertSame('yes', api_doc_required_label('y', 'en'));
        $this->assertSame('non', api_doc_required_label('n', 'fr'));

        $both = api_doc_required_label('y', 'fr_zh');
        $this->assertStringContainsString('oui', $both);
        $this->assertStringContainsString('class="zh"', $both);
        $this->assertStringContainsString('是', $both);

        $triple = api_doc_required_label('n', 'zh_en_fr');
        $this->assertStringContainsString('否', $triple);
        $this->assertStringContainsString('class="en"', $triple);
        $this->assertStringContainsString('no', $triple);
    }

    #[Test]
    public function locales_helper_prefers_bound_request_locales(): void
    {
        app()->instance('api-doc.locales', ['en', 'zh']);

        $this->assertSame(['en', 'zh'], api_doc_locales_for_lang('fr'));
    }
}
