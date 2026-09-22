<?php

declare(strict_types=1);

namespace Tests\Unit\ApiDoc;

use Gz168\ApiDoc\Enums\ApiDocContentFormat;
use Gz168\ApiDoc\Enums\ApiDocSectionContentType;
use Gz168\ApiDoc\Models\ApiDocArticle;
use Gz168\ApiDoc\Models\ApiDocSection;
use Gz168\ApiDoc\Services\ApiDocHtmlToMarkdown;
use Gz168\ApiDoc\Services\ApiDocSectionMarkdownService;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use InvalidArgumentException;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ApiDocSectionMarkdownServiceTest extends TestCase
{
    use LazilyRefreshDatabase;

    #[Test]
    public function html_to_markdown_converts_common_tags(): void
    {
        $markdown = app(ApiDocHtmlToMarkdown::class)->convert(
            '<h2>Title</h2><p>Hello <strong>world</strong></p><ul><li>One</li><li>Two</li></ul>'
        );

        $this->assertStringContainsString('## Title', $markdown);
        $this->assertStringContainsString('**world**', $markdown);
        $this->assertStringContainsString('- One', $markdown);
        $this->assertStringContainsString('- Two', $markdown);
    }

    #[Test]
    public function html_to_markdown_converts_tiptap_json(): void
    {
        $json = json_encode([
            'type' => 'doc',
            'content' => [
                [
                    'type' => 'paragraph',
                    'content' => [
                        ['type' => 'text', 'text' => 'Bonjour '],
                        ['type' => 'text', 'marks' => [['type' => 'bold']], 'text' => 'API'],
                    ],
                ],
            ],
        ], JSON_THROW_ON_ERROR);

        $markdown = app(ApiDocHtmlToMarkdown::class)->convert($json);

        $this->assertStringContainsString('Bonjour', $markdown);
        $this->assertStringContainsString('**API**', $markdown);
    }

    #[Test]
    public function generate_selected_language_only(): void
    {
        $section = ApiDocSection::factory()->create([
            'slug' => 'oauth-html',
            'content_type' => ApiDocSectionContentType::Html,
            'article_id' => null,
            'title' => ['fr' => 'OAuth FR', 'zh' => 'OAuth 中文', 'en' => ''],
            'verb' => 'POST',
            'path' => '/oauth/token',
        ]);

        $section->paras()->create([
            'sort' => 0,
            'content_format' => ApiDocContentFormat::Html->value,
            'text' => [
                'fr' => '<p>Bonjour <strong>API</strong></p>',
                'zh' => '<p>你好 <em>接口</em></p>',
                'en' => '<p>Hello</p>',
            ],
        ]);

        $article = app(ApiDocSectionMarkdownService::class)->generateFromHtml($section, ['zh']);

        $section->refresh();
        $this->assertSame(ApiDocSectionContentType::Md, $section->content_type);
        $this->assertSame($article->id, $section->article_id);
        $this->assertSame('', $article->body_fr);
        $this->assertSame('', $article->body_en);
        $this->assertStringContainsString('# OAuth 中文', $article->body_zh);
        $this->assertStringContainsString('*接口*', $article->body_zh);
        $this->assertStringContainsString('`POST /oauth/token`', $article->body_zh);
    }

    #[Test]
    public function generate_second_language_updates_existing_article(): void
    {
        $section = ApiDocSection::factory()->create([
            'slug' => 'oauth-html',
            'content_type' => ApiDocSectionContentType::Html,
            'title' => ['fr' => 'OAuth FR', 'zh' => 'OAuth 中文', 'en' => ''],
        ]);
        $section->paras()->create([
            'sort' => 0,
            'content_format' => ApiDocContentFormat::Html->value,
            'text' => [
                'fr' => '<p>Bonjour</p>',
                'zh' => '<p>你好</p>',
                'en' => '',
            ],
        ]);

        $service = app(ApiDocSectionMarkdownService::class);
        $article = $service->generateFromHtml($section, ['zh']);
        $service->generateFromHtml($section->fresh(), ['fr']);

        $article->refresh();
        $this->assertStringContainsString('你好', $article->body_zh);
        $this->assertStringContainsString('Bonjour', $article->body_fr);
    }

    #[Test]
    public function generate_rejects_empty_selected_language(): void
    {
        $section = ApiDocSection::factory()->create([
            'content_type' => ApiDocSectionContentType::Html,
            'title' => ['fr' => '', 'zh' => '', 'en' => ''],
            'verb' => null,
            'path' => null,
        ]);

        $this->expectException(InvalidArgumentException::class);
        app(ApiDocSectionMarkdownService::class)->generateFromHtml($section, ['en']);
    }

    #[Test]
    public function download_rejects_html_sections(): void
    {
        $section = ApiDocSection::factory()->create([
            'content_type' => ApiDocSectionContentType::Html,
            'article_id' => null,
        ]);

        $this->expectException(InvalidArgumentException::class);
        app(ApiDocSectionMarkdownService::class)->downloadZip($section);
    }

    #[Test]
    public function unique_slug_when_article_already_exists(): void
    {
        ApiDocArticle::factory()->create(['slug' => 'dup-slug']);

        $section = ApiDocSection::factory()->create([
            'slug' => 'dup-slug',
            'content_type' => ApiDocSectionContentType::Html,
        ]);
        $section->paras()->create([
            'sort' => 0,
            'text' => ['fr' => 'body', 'zh' => '', 'en' => ''],
            'content_format' => ApiDocContentFormat::Markdown->value,
        ]);

        $article = app(ApiDocSectionMarkdownService::class)->generateFromHtml($section, ['fr']);

        $this->assertSame('dup-slug-2', $article->slug);
    }
}
