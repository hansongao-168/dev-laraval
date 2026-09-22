<?php

declare(strict_types=1);

namespace Tests\Feature\ApiDoc;

use App\Models\User;
use Filament\Facades\Filament;
use Gz168\ApiDoc\Database\Seeders\ApiDocDisplayModeSeeder;
use Gz168\ApiDoc\Filament\Resources\ApiDocSectionResource\Pages\CreateApiDocSection;
use Gz168\ApiDoc\Models\ApiDocGroup;
use Gz168\ApiDoc\Models\ApiDocNav;
use Gz168\ApiDoc\Models\ApiDocSection;
use Gz168\ApiDoc\Models\ApiDocTemplate;
use Gz168\ApiDoc\Services\ApiDocRenderer;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Livewire\Livewire;
use PHPUnit\Framework\Attributes\Test;
use RuntimeException;
use Tests\TestCase;

class ApiDocNavigationTest extends TestCase
{
    use LazilyRefreshDatabase;

    #[Test]
    public function renderer_nests_nav_group_and_section(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);

        $nav = ApiDocNav::factory()->create([
            'code' => 'guides',
            'label' => ['fr' => 'Guides', 'zh' => '指南', 'en' => 'Guides'],
            'sort' => 1,
        ]);
        $group = ApiDocGroup::factory()->create([
            'nav_id' => $nav->id,
            'code' => 'auth',
            'label' => ['fr' => 'Auth', 'zh' => '认证', 'en' => 'Auth'],
            'sort' => 1,
        ]);
        ApiDocSection::factory()->create([
            'group_id' => $group->id,
            'slug' => 'oauth',
            'nav_label' => ['fr' => 'Jeton', 'zh' => '令牌', 'en' => 'Token'],
            'is_intro' => false,
            'is_active' => true,
        ]);

        $payload = app(ApiDocRenderer::class)->render('fr', html: false);
        $top = $payload['nav'][0] ?? null;

        $this->assertIsArray($top);
        $this->assertSame('guides', $top['code']);
        $this->assertSame('Guides', $top['label']);
        $this->assertSame('auth', $top['groups'][0]['code']);
        $this->assertSame('oauth', $top['groups'][0]['items'][0]['slug']);
        $this->assertSame('classic', $payload['sections'][0]['template']);
    }

    #[Test]
    public function section_without_template_is_rejected(): void
    {
        $section = ApiDocSection::factory()->make([
            'slug' => 'missing-template',
        ]);
        $section->template_id = null;

        $this->expectException(RuntimeException::class);
        $section->save();
    }

    #[Test]
    public function section_form_requires_a_front_template(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);

        $admin = User::factory()->make();
        $admin->forceFill([
            'is_protected' => true,
            'is_super_admin' => true,
        ])->saveQuietly();
        $this->actingAs($admin);
        Filament::setCurrentPanel(Filament::getPanel('admin'));

        $template = ApiDocTemplate::query()->where('code', 'classic')->firstOrFail();

        Livewire::test(CreateApiDocSection::class)
            ->fillForm([
                'slug' => 'needs-template',
                'nav_label' => ['fr' => 'Titre', 'zh' => '标题', 'en' => 'Title'],
                'title' => ['fr' => 'Titre', 'zh' => '标题', 'en' => 'Title'],
                'is_intro' => false,
                'is_active' => true,
                'sort' => 0,
            ])
            ->call('create')
            ->assertHasFormErrors(['template_id']);

        Livewire::test(CreateApiDocSection::class)
            ->fillForm([
                'slug' => 'has-template',
                'template_id' => $template->id,
                'nav_label' => ['fr' => 'Titre', 'zh' => '标题', 'en' => 'Title'],
                'title' => ['fr' => 'Titre', 'zh' => '标题', 'en' => 'Title'],
                'is_intro' => false,
                'is_active' => true,
                'sort' => 1,
            ])
            ->call('create')
            ->assertHasNoFormErrors();

        $this->assertSame($template->id, ApiDocSection::query()->where('slug', 'has-template')->value('template_id'));
    }

    #[Test]
    public function front_nav_renders_three_levels(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);

        $nav = ApiDocNav::factory()->create([
            'code' => 'guides',
            'label' => ['fr' => 'Guides FR', 'zh' => '指南', 'en' => 'Guides'],
        ]);
        $group = ApiDocGroup::factory()->create([
            'nav_id' => $nav->id,
            'label' => ['fr' => 'Auth FR', 'zh' => '认证', 'en' => 'Auth'],
        ]);
        ApiDocSection::factory()->create([
            'group_id' => $group->id,
            'slug' => 'oauth',
            'nav_label' => ['fr' => 'Jeton FR', 'zh' => '令牌', 'en' => 'Token'],
            'is_intro' => false,
        ]);

        $this->get('/api-doc?mode=fr')
            ->assertOk()
            ->assertSee('class="navtop"', false)
            ->assertSee('Guides FR', false)
            ->assertSee('Auth FR', false)
            ->assertSee('Jeton FR', false);
    }
}
