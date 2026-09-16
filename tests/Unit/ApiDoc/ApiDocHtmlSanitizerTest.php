<?php

declare(strict_types=1);

namespace Tests\Unit\ApiDoc;

use Gz168\ApiDoc\Services\ApiDocHtmlSanitizer;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ApiDocHtmlSanitizerTest extends TestCase
{
    #[Test]
    public function strips_script_and_event_handlers(): void
    {
        $html = '<p class="ok">keep</p><script>alert(1)</script><img src="x" onerror="alert(1)">';
        $out = app(ApiDocHtmlSanitizer::class)->sanitizeHtml($html);

        $this->assertStringContainsString('keep', $out);
        $this->assertStringContainsString('class="ok"', $out);
        $this->assertStringNotContainsString('<script', $out);
        $this->assertStringNotContainsString('onerror', strtolower($out));
    }

    #[Test]
    public function strips_iframe_object_embed(): void
    {
        $html = '<iframe src="https://x"></iframe><object></object><embed src="x">';
        $out = app(ApiDocHtmlSanitizer::class)->sanitizeHtml($html);

        $this->assertStringNotContainsString('<iframe', strtolower($out));
        $this->assertStringNotContainsString('<object', strtolower($out));
        $this->assertStringNotContainsString('<embed', strtolower($out));
    }

    #[Test]
    public function sanitizes_css_expression_and_javascript(): void
    {
        $css = 'body{color:red;width:expression(alert(1));background:url(javascript:alert(1))}';
        $out = app(ApiDocHtmlSanitizer::class)->sanitizeCss($css);

        $this->assertStringContainsString('color:red', $out);
        $this->assertStringNotContainsStringIgnoringCase('expression', $out);
        $this->assertStringNotContainsStringIgnoringCase('javascript:', $out);
    }
}
