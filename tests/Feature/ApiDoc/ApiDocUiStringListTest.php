<?php

declare(strict_types=1);

namespace Tests\Feature\ApiDoc;

use App\Models\User;
use Filament\Facades\Filament;
use Gz168\ApiDoc\Filament\Resources\ApiDocUiStringResource\Pages\ListApiDocUiStrings;
use Gz168\ApiDoc\Models\ApiDocUiString;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Livewire\Livewire;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ApiDocUiStringListTest extends TestCase
{
    use LazilyRefreshDatabase;

    #[Test]
    public function list_page_sorts_by_code_without_a_sort_column(): void
    {
        $admin = User::factory()->make();
        $admin->forceFill([
            'is_protected' => true,
            'is_super_admin' => true,
        ])->saveQuietly();
        $this->actingAs($admin);
        Filament::setCurrentPanel(Filament::getPanel('admin'));

        ApiDocUiString::query()->create([
            'code' => 'quickH',
            'text' => ['fr' => 'Démarrage rapide', 'zh' => '快速开始', 'en' => ''],
            'is_active' => true,
        ]);

        Livewire::test(ListApiDocUiStrings::class)
            ->assertOk()
            ->assertSee('quickH');
    }
}
