<?php

declare(strict_types=1);

namespace Tests\Unit\ApiDoc;

use Gz168\ApiDoc\Models\ApiDocArticle;
use Gz168\ApiDoc\Services\ApiDocArticleImportExport;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;
use ZipArchive;

class ApiDocArticleImportExportTest extends TestCase
{
    use LazilyRefreshDatabase;

    #[Test]
    public function parse_zip_language_map_supports_common_filenames(): void
    {
        $service = app(ApiDocArticleImportExport::class);

        $map = $service->parseZipLanguageMap([
            'fr.md',
            'nested/zh.md',
            'guide.en.md',
            'oauth-fr.md',
            'readme.txt',
        ]);

        $this->assertSame('fr.md', $map['fr']);
        $this->assertSame('nested/zh.md', $map['zh']);
        $this->assertSame('guide.en.md', $map['en']);
    }

    #[Test]
    public function import_language_overwrites_one_locale_only(): void
    {
        $article = ApiDocArticle::factory()->create([
            'body_fr' => 'old-fr',
            'body_zh' => 'old-zh',
            'body_en' => 'old-en',
        ]);

        app(ApiDocArticleImportExport::class)->importLanguage($article, 'zh', 'new-zh-body');

        $article->refresh();
        $this->assertSame('old-fr', $article->body_fr);
        $this->assertSame('new-zh-body', $article->body_zh);
        $this->assertSame('old-en', $article->body_en);
    }

    #[Test]
    public function import_zip_writes_detected_languages_and_skips_missing(): void
    {
        $article = ApiDocArticle::factory()->create([
            'body_fr' => 'keep-fr',
            'body_zh' => 'old-zh',
            'body_en' => 'old-en',
        ]);

        $zipPath = tempnam(sys_get_temp_dir(), 'api-doc-zip-').'.zip';
        $zip = new ZipArchive;
        $this->assertTrue($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE));
        $zip->addFromString('zh.md', 'zip-zh');
        $zip->addFromString('en.md', 'zip-en');
        $zip->close();

        $result = app(ApiDocArticleImportExport::class)->importZip($article, $zipPath);
        @unlink($zipPath);

        $article->refresh();
        $this->assertSame(['zh', 'en'], $result['imported']);
        $this->assertContains('fr', $result['skipped']);
        $this->assertSame('keep-fr', $article->body_fr);
        $this->assertSame('zip-zh', $article->body_zh);
        $this->assertSame('zip-en', $article->body_en);
    }
}
