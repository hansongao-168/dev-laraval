<?php

declare(strict_types=1);

namespace Tests\Unit\ApiDoc;

use Gz168\ApiDoc\Casts\LocalizedString;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class LocalizedStringFormatTest extends TestCase
{
    #[Test]
    public function pick_returns_requested_locale_with_fallback(): void
    {
        $value = ['fr' => 'Bonjour', 'zh' => '你好', 'en' => 'Hello'];

        $this->assertSame('Bonjour', LocalizedString::pick($value, 'fr'));
        $this->assertSame('你好', LocalizedString::pick($value, 'zh'));
        $this->assertSame('Hello', LocalizedString::pick($value, 'en'));
        $this->assertSame('Bonjour', LocalizedString::pick($value, 'both'));
        $this->assertSame('Hello', LocalizedString::pick(['fr' => '', 'zh' => '', 'en' => 'Hello'], 'zh'));
    }

    #[Test]
    public function format_both_wraps_chinese_in_zh_span(): void
    {
        $html = LocalizedString::format(['fr' => 'Bonjour', 'zh' => '你好'], 'both');

        $this->assertSame('Bonjour<span class="zh">你好</span>', $html);
    }

    #[Test]
    public function format_escapes_html_in_both_mode(): void
    {
        $html = LocalizedString::format(['fr' => '<b>x</b>', 'zh' => '<i>y</i>'], 'both');

        $this->assertSame('&lt;b&gt;x&lt;/b&gt;<span class="zh">&lt;i&gt;y&lt;/i&gt;</span>', $html);
    }

    #[Test]
    public function required_label_follows_locale(): void
    {
        $this->assertSame('oui', api_doc_required_label('y', 'fr'));
        $this->assertSame('是', api_doc_required_label('y', 'zh'));
        $this->assertSame('oui<span class="zh">是</span>', api_doc_required_label('y', 'both'));
        $this->assertSame('non', api_doc_required_label('n', 'fr'));
    }

    #[Test]
    public function format_compact_joins_with_slash(): void
    {
        $this->assertSame(
            'Copier / 复制',
            LocalizedString::formatCompact(['fr' => 'Copier', 'zh' => '复制'], 'both'),
        );
    }

    #[Test]
    public function pick_for_mode_falls_back_only_inside_mode_locales(): void
    {
        $value = ['fr' => 'Bonjour', 'zh' => '', 'en' => 'Hello'];

        $this->assertSame('Hello', LocalizedString::pickForMode($value, ['zh', 'en']));
        $this->assertSame('', LocalizedString::pickForMode(['fr' => 'Bonjour', 'zh' => '', 'en' => ''], ['zh', 'en']));
    }

    #[Test]
    public function format_for_mode_wraps_secondary_locales(): void
    {
        $html = LocalizedString::formatForMode(
            ['fr' => 'Bonjour', 'zh' => '你好', 'en' => 'Hello'],
            ['fr', 'zh'],
        );

        $this->assertSame('Bonjour<span class="zh">你好</span>', $html);
    }

    #[Test]
    public function format_for_mode_supports_three_locales(): void
    {
        $html = LocalizedString::formatForMode(
            ['fr' => 'Bonjour', 'zh' => '你好', 'en' => 'Hello'],
            ['zh', 'en', 'fr'],
        );

        $this->assertSame('你好<span class="en">Hello</span><span class="fr">Bonjour</span>', $html);
    }

    #[Test]
    public function format_for_mode_handles_null_value(): void
    {
        $this->assertSame('', LocalizedString::formatForMode(null, ['fr', 'zh']));
    }
}
