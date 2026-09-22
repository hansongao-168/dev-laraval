<?php

declare(strict_types=1);

namespace Tests\Feature\ApiDoc;

use Gz168\ApiDoc\Enums\ApiDocSectionContentType;
use Gz168\ApiDoc\Filament\Resources\ApiDocSectionResource\Pages\EditApiDocSection;
use Gz168\ApiDoc\Filament\Resources\ApiDocSectionResource\RelationManagers\BaseRowsRelationManager;
use Gz168\ApiDoc\Filament\Resources\ApiDocSectionResource\RelationManagers\BlocksRelationManager;
use Gz168\ApiDoc\Filament\Resources\ApiDocSectionResource\RelationManagers\NotesRelationManager;
use Gz168\ApiDoc\Filament\Resources\ApiDocSectionResource\RelationManagers\ParamRowsRelationManager;
use Gz168\ApiDoc\Filament\Resources\ApiDocSectionResource\RelationManagers\ParasRelationManager;
use Gz168\ApiDoc\Filament\Resources\ApiDocSectionResource\RelationManagers\QuickstartStepsRelationManager;
use Gz168\ApiDoc\Models\ApiDocArticle;
use Gz168\ApiDoc\Models\ApiDocSection;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ApiDocHtmlSectionTemplateSettingsTest extends TestCase
{
    use LazilyRefreshDatabase;

    /**
     * @return list<class-string>
     */
    private function allHtmlManagers(): array
    {
        return [
            ParasRelationManager::class,
            NotesRelationManager::class,
            BlocksRelationManager::class,
            ParamRowsRelationManager::class,
            BaseRowsRelationManager::class,
            QuickstartStepsRelationManager::class,
        ];
    }

    #[Test]
    public function html_sections_expose_all_template_relation_managers(): void
    {
        $section = ApiDocSection::factory()->create([
            'content_type' => ApiDocSectionContentType::Html,
            'is_intro' => false,
        ]);

        foreach ($this->allHtmlManagers() as $manager) {
            $this->assertTrue(
                $manager::canViewForRecord($section, EditApiDocSection::class),
                $manager.' should be visible for HTML sections',
            );
        }
    }

    #[Test]
    public function html_intro_sections_also_expose_all_template_managers(): void
    {
        $section = ApiDocSection::factory()->create([
            'content_type' => ApiDocSectionContentType::Html,
            'is_intro' => true,
        ]);

        foreach ($this->allHtmlManagers() as $manager) {
            $this->assertTrue(
                $manager::canViewForRecord($section, EditApiDocSection::class),
                $manager.' should be visible for HTML intro sections',
            );
        }
    }

    #[Test]
    public function md_sections_hide_all_html_template_managers(): void
    {
        $article = ApiDocArticle::factory()->create();
        $section = ApiDocSection::factory()->create([
            'content_type' => ApiDocSectionContentType::Md,
            'article_id' => $article->id,
            'is_intro' => true,
        ]);

        foreach ($this->allHtmlManagers() as $manager) {
            $this->assertFalse(
                $manager::canViewForRecord($section, EditApiDocSection::class),
                $manager.' should be hidden for MD sections',
            );
        }
    }
}
