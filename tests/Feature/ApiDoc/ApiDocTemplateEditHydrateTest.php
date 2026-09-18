<?php

declare(strict_types=1);

namespace Tests\Feature\ApiDoc;

use App\Models\User;
use Filament\Facades\Filament;
use Gz168\ApiDoc\Database\Seeders\ApiDocTemplateSeeder;
use Gz168\ApiDoc\Filament\Resources\ApiDocTemplateResource\Pages\EditApiDocTemplate;
use Gz168\ApiDoc\Models\ApiDocTemplate;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Livewire\Livewire;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ApiDocTemplateEditHydrateTest extends TestCase
{
    use LazilyRefreshDatabase;

    #[Test]
    public function edit_form_hydrates_empty_classic_parts_from_blade_files(): void
    {
        $this->seed(ApiDocTemplateSeeder::class);

        $admin = User::factory()->make();
        $admin->forceFill([
            'is_protected' => true,
            'is_super_admin' => true,
        ])->saveQuietly();
        $this->actingAs($admin);
        Filament::setCurrentPanel(Filament::getPanel('admin'));

        $classic = ApiDocTemplate::query()->where('code', 'classic')->firstOrFail();
        $this->assertSame([], $classic->body_parts ?? []);

        Livewire::test(EditApiDocTemplate::class, ['record' => $classic->getKey()])
            ->assertFormSet(function (array $state): array {
                $page = (string) ($state['body_parts']['page'] ?? '');
                $header = (string) ($state['body_parts']['header'] ?? '');
                $css = (string) ($state['css_text'] ?? '');

                $this->assertStringContainsString('api_doc_part', $page);
                $this->assertStringContainsString('langs', $header);
                $this->assertGreaterThan(50, strlen($css));

                return [];
            });
    }
}
