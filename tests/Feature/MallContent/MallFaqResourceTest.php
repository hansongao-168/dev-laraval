<?php

declare(strict_types=1);

namespace Tests\Feature\MallContent;

use App\Models\User;
use Filament\Facades\Filament;
use Gz168\MallContent\Filament\Resources\MallFaqResource;
use Gz168\MallContent\Filament\Resources\MallFaqResource\Pages\CreateMallFaq;
use Gz168\MallContent\Models\MallFaq;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

final class MallFaqResourceTest extends TestCase
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

    public function test_resource_is_registered_on_admin_panel(): void
    {
        $this->actingAsFilamentAdmin();

        $resources = Filament::getCurrentPanel()?->getResources() ?? [];

        $this->assertContains(MallFaqResource::class, $resources);
    }

    public function test_can_create_faq(): void
    {
        $this->actingAsFilamentAdmin();

        Livewire::test(CreateMallFaq::class)
            ->fillForm([
                'question' => '如何联系客服？',
                'answer' => '请在订单页提交工单。',
                'category' => 'support',
                'sort' => 10,
            ])
            ->call('create')
            ->assertHasNoFormErrors();

        $faq = MallFaq::query()->where('question', '如何联系客服？')->first();
        $this->assertNotNull($faq);
        $this->assertSame(10, $faq->sort);
        $this->assertSame('support', $faq->category);
    }
}
