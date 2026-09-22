<?php

declare(strict_types=1);

namespace Tests\Feature\ApiDoc;

use Gz168\ApiDoc\Database\Seeders\ApiDocDisplayModeSeeder;
use Gz168\ApiDoc\Models\ApiDocQuickstartStep;
use Gz168\ApiDoc\Models\ApiDocSection;
use Gz168\ApiDoc\Models\ApiDocSetting;
use Gz168\ApiDoc\Models\ApiDocUiString;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ApiDocSectionQuickstartTest extends TestCase
{
    use LazilyRefreshDatabase;

    #[Test]
    public function intro_quickstart_copy_comes_from_the_section_not_ui_strings(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);
        ApiDocSetting::current();

        ApiDocUiString::query()->create([
            'code' => 'quickH',
            'text' => ['fr' => 'SHOULD-NOT-SHOW', 'zh' => '', 'en' => ''],
            'is_active' => true,
        ]);
        ApiDocUiString::query()->create([
            'code' => 'quickSub',
            'text' => ['fr' => 'SHOULD-NOT-SHOW-SUB', 'zh' => '', 'en' => ''],
            'is_active' => true,
        ]);

        $intro = ApiDocSection::factory()->create([
            'slug' => 'intro',
            'is_intro' => true,
            'is_active' => true,
            'intro_h1' => ['fr' => 'Intro', 'zh' => '', 'en' => ''],
            'intro_quick_heading' => ['fr' => 'Démarrage rapide', 'zh' => '快速开始', 'en' => ''],
            'intro_quick_sub' => ['fr' => 'Premier appel réussi en une quinzaine de minutes.', 'zh' => '', 'en' => ''],
        ]);

        ApiDocQuickstartStep::query()->create([
            'section_id' => $intro->id,
            'heading' => ['fr' => 'Créer vos identifiants', 'zh' => '', 'en' => ''],
            'description' => ['fr' => 'Etape du chapitre', 'zh' => '', 'en' => ''],
            'sort' => 0,
            'is_active' => true,
        ]);

        ApiDocQuickstartStep::query()->create([
            'section_id' => null,
            'heading' => ['fr' => 'ORPHAN-STEP', 'zh' => '', 'en' => ''],
            'description' => ['fr' => 'Orphelin', 'zh' => '', 'en' => ''],
            'sort' => 1,
            'is_active' => true,
        ]);

        $this->get('/api-doc')
            ->assertOk()
            ->assertSee('Démarrage rapide', false)
            ->assertSee('Premier appel réussi en une quinzaine de minutes.', false)
            ->assertSee('Créer vos identifiants', false)
            ->assertDontSee('SHOULD-NOT-SHOW', false)
            ->assertDontSee('ORPHAN-STEP', false);
    }
}
