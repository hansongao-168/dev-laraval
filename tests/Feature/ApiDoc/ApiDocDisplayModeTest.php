<?php

declare(strict_types=1);

namespace Tests\Feature\ApiDoc;

use App\Models\User;
use Filament\Facades\Filament;
use Gz168\ApiDoc\Database\Seeders\ApiDocDisplayModeSeeder;
use Gz168\ApiDoc\Filament\Resources\ApiDocDisplayModeResource\Pages\CreateApiDocDisplayMode;
use Gz168\ApiDoc\Filament\Resources\ApiDocDisplayModeResource\Pages\EditApiDocDisplayMode;
use Gz168\ApiDoc\Models\ApiDocDisplayMode;
use Gz168\ApiDoc\Models\ApiDocSetting;
use Gz168\ApiDoc\Models\ApiDocTemplate;
use Gz168\ApiDoc\Services\ApiDocDisplayModeResolver;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Livewire\Livewire;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ApiDocDisplayModeTest extends TestCase
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
    public function seeder_inserts_five_modes_with_one_default(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);

        $this->assertSame(5, ApiDocDisplayMode::query()->count());
        $this->assertSame(1, ApiDocDisplayMode::query()->where('is_default', true)->count());
        $this->assertSame(['fr'], ApiDocDisplayMode::query()->where('code', 'fr')->value('locales'));
        $this->assertSame(['fr', 'zh'], ApiDocDisplayMode::query()->where('code', 'fr_zh')->value('locales'));
    }

    #[Test]
    public function seeder_sets_template_key_classic_on_all_modes(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);

        $this->assertSame(
            5,
            ApiDocDisplayMode::query()->where('template_key', 'classic')->count(),
        );
        $this->assertSame(0, ApiDocDisplayMode::query()->whereNull('template_key')->count());
    }

    #[Test]
    public function model_rejects_unknown_template_key(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);
        $mode = ApiDocDisplayMode::query()->where('code', 'zh')->firstOrFail();

        $this->expectException(\RuntimeException::class);
        $mode->template_key = 'not-a-skin';
        $mode->save();
    }

    #[Test]
    public function resolver_maps_legacy_lang_both_to_fr_zh(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);
        $mode = app(ApiDocDisplayModeResolver::class)->resolve(null, 'both');
        $this->assertSame('fr_zh', $mode->code);
    }

    #[Test]
    public function resolver_prefers_mode_query_over_lang(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);
        $mode = app(ApiDocDisplayModeResolver::class)->resolve('en', 'zh');
        $this->assertSame('en', $mode->code);
    }

    #[Test]
    public function resolver_falls_back_when_mode_inactive(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);
        ApiDocDisplayMode::query()->where('code', 'en')->update(['is_active' => false]);
        $mode = app(ApiDocDisplayModeResolver::class)->resolve('en', null);
        $this->assertTrue($mode->is_default);
    }

    #[Test]
    public function cannot_deactivate_last_active_mode(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);
        ApiDocDisplayMode::query()->where('code', '!=', 'fr')->update(['is_active' => false]);
        $fr = ApiDocDisplayMode::query()->where('code', 'fr')->firstOrFail();

        $this->expectException(\RuntimeException::class);
        $fr->is_active = false;
        $fr->save();
    }

    #[Test]
    public function cannot_delete_last_active_default_mode(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);
        ApiDocDisplayMode::query()->where('code', '!=', 'fr')->update(['is_active' => false]);
        $fr = ApiDocDisplayMode::query()->where('code', 'fr')->firstOrFail();

        $this->expectException(\RuntimeException::class);
        $fr->delete();
    }

    #[Test]
    public function cannot_unset_only_active_default(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);
        $fr = ApiDocDisplayMode::query()->where('code', 'fr')->firstOrFail();

        $this->expectException(\RuntimeException::class);
        $fr->is_default = false;
        $fr->save();
    }

    #[Test]
    public function cannot_change_seeded_display_mode_code(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);
        $fr = ApiDocDisplayMode::query()->where('code', 'fr')->firstOrFail();

        $this->expectException(\RuntimeException::class);
        $fr->code = 'fr_custom';
        $fr->save();
    }

    #[Test]
    public function setting_default_syncs_settings_locale(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);
        $zh = ApiDocDisplayMode::query()->where('code', 'zh')->firstOrFail();
        $zh->is_default = true;
        $zh->save();

        ApiDocDisplayMode::query()->whereKeyNot($zh->getKey())->update(['is_default' => false]);
        app(ApiDocDisplayModeResolver::class)->syncSettingDefaultLocale($zh->fresh());

        $this->assertSame('zh', ApiDocSetting::current()->default_locale);
        $this->assertSame(1, ApiDocDisplayMode::query()->where('is_default', true)->count());
    }

    #[Test]
    public function edit_page_default_syncs_settings_locale(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);
        $this->actingAsFilamentAdmin();

        ApiDocSetting::current()->update(['default_locale' => 'fr']);

        $zh = ApiDocDisplayMode::query()->where('code', 'zh')->firstOrFail();

        Livewire::test(EditApiDocDisplayMode::class, ['record' => $zh->getKey()])
            ->fillForm([
                'is_default' => true,
            ])
            ->call('save')
            ->assertHasNoFormErrors();

        $this->assertSame(1, ApiDocDisplayMode::query()->where('is_default', true)->count());
        $this->assertTrue((bool) $zh->fresh()->is_default);
        $this->assertSame('zh', ApiDocSetting::current()->default_locale);
    }

    #[Test]
    public function create_page_default_syncs_settings_locale(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);
        $this->actingAsFilamentAdmin();

        ApiDocSetting::current()->update(['default_locale' => 'fr']);

        Livewire::test(CreateApiDocDisplayMode::class)
            ->fillForm([
                'code' => 'custom_en',
                'label' => 'Custom EN',
                'locale' => 'en',
                'sort' => 99,
                'is_active' => true,
                'is_default' => true,
            ])
            ->call('create')
            ->assertHasNoFormErrors();

        $created = ApiDocDisplayMode::query()->where('code', 'custom_en')->firstOrFail();

        $this->assertSame(['en'], $created->locales);
        $this->assertTrue((bool) $created->is_default);
        $this->assertSame(1, ApiDocDisplayMode::query()->where('is_default', true)->count());
        $this->assertSame('en', ApiDocSetting::current()->default_locale);
    }

    #[Test]
    public function language_form_saves_single_locale_and_keeps_template_key(): void
    {
        $this->actingAsFilamentAdmin();
        $this->seed(ApiDocDisplayModeSeeder::class);
        $zh = ApiDocDisplayMode::query()->where('code', 'zh')->firstOrFail();

        Livewire::test(EditApiDocDisplayMode::class, ['record' => $zh->getKey()])
            ->fillForm([
                'label' => '中文',
                'locale' => 'zh',
                'sort' => $zh->sort,
                'is_active' => true,
                'is_default' => false,
            ])
            ->call('save')
            ->assertHasNoFormErrors();

        $fresh = $zh->fresh();
        $this->assertSame(['zh'], $fresh->locales);
        $this->assertSame('classic', $fresh->template_key);
    }

    #[Test]
    public function language_form_requires_a_locale(): void
    {
        $this->actingAsFilamentAdmin();
        $this->seed(ApiDocDisplayModeSeeder::class);
        $zh = ApiDocDisplayMode::query()->where('code', 'zh')->firstOrFail();

        Livewire::test(EditApiDocDisplayMode::class, ['record' => $zh->getKey()])
            ->fillForm([
                'label' => $zh->label,
                'locale' => null,
                'sort' => $zh->sort,
                'is_active' => true,
                'is_default' => false,
            ])
            ->call('save')
            ->assertHasFormErrors(['locale']);
    }

    #[Test]
    public function model_rejects_inactive_template_key(): void
    {
        $this->seed(ApiDocDisplayModeSeeder::class);
        ApiDocTemplate::factory()->create([
            'code' => 'idle',
            'is_active' => true,
            'sort' => 40,
        ]);
        $idle = ApiDocTemplate::query()->where('code', 'idle')->firstOrFail();
        $idle->is_active = false;
        $idle->save();

        $mode = ApiDocDisplayMode::query()->where('code', 'zh')->firstOrFail();
        $this->expectException(\RuntimeException::class);
        $mode->template_key = 'idle';
        $mode->save();
    }
}
