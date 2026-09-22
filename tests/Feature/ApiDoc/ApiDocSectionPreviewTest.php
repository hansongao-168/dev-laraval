<?php

declare(strict_types=1);

namespace Tests\Feature\ApiDoc;

use App\Models\User;
use Filament\Facades\Filament;
use Filament\Support\Enums\Width;
use Gz168\ApiDoc\Database\Seeders\ApiDocDisplayModeSeeder;
use Gz168\ApiDoc\Filament\Resources\ApiDocSectionResource;
use Gz168\ApiDoc\Filament\Resources\ApiDocSectionResource\Pages\EditApiDocSection;
use Gz168\ApiDoc\Filament\Resources\ApiDocSectionResource\RelationManagers\BaseRowsRelationManager;
use Gz168\ApiDoc\Filament\Resources\ApiDocSectionResource\RelationManagers\BlocksRelationManager;
use Gz168\ApiDoc\Filament\Resources\ApiDocSectionResource\RelationManagers\NotesRelationManager;
use Gz168\ApiDoc\Filament\Resources\ApiDocSectionResource\RelationManagers\ParamRowsRelationManager;
use Gz168\ApiDoc\Filament\Resources\ApiDocSectionResource\RelationManagers\ParasRelationManager;
use Gz168\ApiDoc\Models\ApiDocSection;
use Gz168\ApiDoc\Models\ApiDocSetting;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Livewire\Livewire;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ApiDocSectionPreviewTest extends TestCase
{
    use LazilyRefreshDatabase;

    private function actingAsFilamentAdmin(): User
    {
        $admin = User::factory()->make();
        $admin->forceFill([
            'is_protected' => true,
            'is_super_admin' => true,
        ])->saveQuietly();
        $this->actingAs($admin);
        Filament::setCurrentPanel(Filament::getPanel('admin'));

        return $admin;
    }

    #[Test]
    public function front_preview_url_uses_section_hash_anchor(): void
    {
        $section = ApiDocSection::factory()->make([
            'slug' => 'oauth-token',
        ]);

        $this->assertSame(
            url('/api-doc#s=oauth-token'),
            ApiDocSectionResource::frontPreviewUrl($section),
        );

        $this->assertSame(
            url('/api-doc?admin_embed=1#s=oauth-token'),
            ApiDocSectionResource::frontPreviewUrl($section, adminEmbed: true),
        );
    }

    #[Test]
    public function edit_page_is_full_width_and_exposes_preview_tab(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);
        ApiDocSetting::current();
        $this->actingAsFilamentAdmin();

        $section = ApiDocSection::factory()->create([
            'slug' => 'oauth-token',
            'is_active' => true,
        ]);

        $component = Livewire::test(EditApiDocSection::class, ['record' => $section->getKey()]);

        $this->assertSame(Width::Full, $component->instance()->getMaxContentWidth());
        $component
            ->assertOk()
            ->assertSee('前台预览', false)
            ->assertSee('#s=oauth-token', false)
            ->assertSee('/api-doc?admin_embed=1#s=oauth-token', false);
    }

    #[Test]
    public function edit_page_labels_child_content_with_front_template_parts(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);
        ApiDocSetting::current();
        $this->actingAsFilamentAdmin();

        $section = ApiDocSection::factory()->create([
            'slug' => 'intro',
            'is_intro' => true,
            'is_active' => true,
        ]);

        Livewire::test(EditApiDocSection::class, ['record' => $section->getKey()])
            ->assertOk()
            ->assertSee('前台模板分区 nav、api_section、intro_section', false)
            ->assertSee('所属前台模板分区：导航标题与分组', false)
            ->assertSee('介绍页内容', false)
            ->assertSee('{para}', false)
            ->assertSee('前台模板占位 {para}', false)
            ->assertSee('基础代码块', false)
            ->assertSee('{base.label}', false)
            ->assertDontSee('正文段落', false)
            ->assertDontSee('基础信息表', false)
            ->assertSee('前台模板分区 note', false)
            ->assertSee('{block.code}', false)
            ->assertSee('前台模板分区 param_table 与 ret_table', false)
            ->tap(function ($component): void {
                $html = $component->html();
                $intro = strpos($html, '介绍页内容');
                $base = strpos($html, '基础代码块');
                $notes = strpos($html, '提示与告警');
                $this->assertNotFalse($intro);
                $this->assertNotFalse($base);
                $this->assertNotFalse($notes);
                $this->assertLessThan($base, $intro);
                $this->assertLessThan($notes, $base);
            });

        Livewire::test(ParasRelationManager::class, [
            'ownerRecord' => $section,
            'pageClass' => EditApiDocSection::class,
        ])
            ->assertOk()
            ->assertSee('所属前台模板占位：{para}', false);

        Livewire::test(BaseRowsRelationManager::class, [
            'ownerRecord' => $section,
            'pageClass' => EditApiDocSection::class,
        ])
            ->assertOk()
            ->assertSee('所属前台模板占位：{base.label}', false);

        foreach ([
            NotesRelationManager::class => '所属前台模板分区：note',
            BlocksRelationManager::class => '所属前台模板占位：{block.code}',
            ParamRowsRelationManager::class => '所属前台模板分区：表格类型「请求参数」',
        ] as $manager => $label) {
            Livewire::test($manager, [
                'ownerRecord' => $section,
                'pageClass' => EditApiDocSection::class,
            ])
                ->assertOk()
                ->assertSee($label, false);
        }
    }
}
