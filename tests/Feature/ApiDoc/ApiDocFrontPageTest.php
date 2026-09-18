<?php

declare(strict_types=1);

namespace Tests\Feature\ApiDoc;

use Gz168\ApiDoc\Database\Seeders\ApiDocDisplayModeSeeder;
use Gz168\ApiDoc\Models\ApiDocDisplayMode;
use Gz168\ApiDoc\Models\ApiDocSection;
use Gz168\ApiDoc\Models\ApiDocSetting;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ApiDocFrontPageTest extends TestCase
{
    use LazilyRefreshDatabase;

    #[Test]
    public function api_doc_page_renders_layout_classes(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);

        ApiDocSetting::current()->update([
            'brand_name' => 'API Colis',
            'version_label' => 'v2',
        ]);

        ApiDocSection::factory()->create([
            'slug' => 'intro',
            'is_intro' => true,
            'intro_h1' => ['fr' => 'API Colis v2', 'zh' => '包裹 API v2'],
            'title' => ['fr' => 'Intro', 'zh' => '简介'],
            'nav_label' => ['fr' => 'Intro', 'zh' => '简介'],
        ]);

        ApiDocSection::factory()->create([
            'slug' => 'oauth',
            'title' => ['fr' => 'Obtenir un jeton', 'zh' => '获取令牌'],
            'nav_label' => ['fr' => 'Authentification', 'zh' => '身份认证'],
            'verb' => 'POST',
            'path' => '/oauth2/token',
        ]);

        $response = $this->get('/api-doc');

        $response->assertOk();
        $response->assertSee('class="wrap"', false);
        $response->assertSee('class="langs"', false);
        $response->assertSee('API Colis', false);
        $response->assertDontSee('API COLIS V2 V2', false);
    }

    #[Test]
    public function mode_fr_zh_and_legacy_both_include_zh_spans(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);

        ApiDocSetting::current();

        ApiDocSection::factory()->create([
            'slug' => 'oauth',
            'title' => ['fr' => 'Obtenir un jeton', 'zh' => '获取令牌'],
            'nav_label' => ['fr' => 'Authentification', 'zh' => '身份认证'],
            'verb' => 'POST',
            'path' => '/oauth2/token',
        ]);

        $this->get('/api-doc?mode=fr_zh')->assertOk()->assertSee('class="zh"', false);
        $this->get('/api-doc?lang=both')->assertOk()->assertSee('class="zh"', false);
    }

    #[Test]
    public function header_omits_inactive_display_modes(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);
        ApiDocDisplayMode::query()->where('code', 'en')->update(['is_active' => false]);

        ApiDocSection::factory()->create([
            'slug' => 'intro',
            'is_intro' => true,
        ]);

        $html = $this->get('/api-doc')->assertOk()->getContent();

        $this->assertStringNotContainsString('>英文<', $html);
        $this->assertStringContainsString('法文', $html);
    }
}
