<?php

declare(strict_types=1);

namespace Tests\Unit\ApiDoc;

use Gz168\ApiDoc\Enums\ApiDocContentFormat;
use Gz168\ApiDoc\Services\ApiDocContentRenderer;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ApiDocContentRendererTest extends TestCase
{
    #[Test]
    public function markdown_renders_and_strips_script(): void
    {
        $renderer = new ApiDocContentRenderer;

        $html = $renderer->toHtml("**bold**\n\n<script>alert(1)</script>", ApiDocContentFormat::Markdown);

        $this->assertStringContainsString('<strong>bold</strong>', $html);
        $this->assertStringNotContainsString('<script>', $html);
    }

    #[Test]
    public function html_sanitizes_event_handlers_and_javascript_urls(): void
    {
        $renderer = new ApiDocContentRenderer;

        $html = $renderer->toHtml(
            '<a href="javascript:alert(1)" onclick="x">x</a><p onerror="y">ok</p>',
            ApiDocContentFormat::Html,
        );

        $this->assertStringNotContainsString('javascript:', $html);
        $this->assertStringNotContainsString('onclick', $html);
        $this->assertStringNotContainsString('onerror', $html);
        $this->assertStringContainsString('<p>ok</p>', $html);
    }

    #[Test]
    public function format_mode_html_joins_primary_and_secondary_spans(): void
    {
        $renderer = new ApiDocContentRenderer;

        $joined = $renderer->formatModeHtml(
            [
                'zh' => '<p>中文</p>',
                'en' => '<p>English</p>',
                'fr' => '<p>Français</p>',
            ],
            ['zh', 'en', 'fr'],
        );

        $this->assertSame(
            '<p>中文</p><span class="en"><p>English</p></span><span class="fr"><p>Français</p></span>',
            $joined,
        );
    }

    #[Test]
    public function format_both_html_delegates_to_format_mode_html(): void
    {
        $renderer = new ApiDocContentRenderer;

        $this->assertSame(
            '<p>FR</p><span class="zh"><p>ZH</p></span>',
            $renderer->formatBothHtml('<p>FR</p>', '<p>ZH</p>'),
        );
    }
}
