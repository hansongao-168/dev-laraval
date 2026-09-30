<?php

declare(strict_types=1);

namespace Tests\Feature\MallContent;

use App\Models\User;
use Filament\Facades\Filament;
use Gz168\MallContent\Filament\Resources\MallArticleResource;
use Gz168\MallContent\Filament\Resources\MallArticleResource\Pages\CreateMallArticle;
use Gz168\MallContent\Models\MallArticle;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

final class MallArticleResourceTest extends TestCase
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

        $this->assertContains(MallArticleResource::class, $resources);
    }

    public function test_can_create_published_article(): void
    {
        $this->actingAsFilamentAdmin();

        Livewire::test(CreateMallArticle::class)
            ->fillForm([
                'title' => '退货说明',
                'category' => 'help',
                'status' => 'published',
                'published_at' => now()->toDateTimeString(),
                'content' => '支持七天无理由退货。',
            ])
            ->call('create')
            ->assertHasNoFormErrors();

        $article = MallArticle::query()->where('title', '退货说明')->first();
        $this->assertNotNull($article);
        $this->assertSame('published', $article->status);
        $this->assertSame('help', $article->category);
        $this->assertStringContainsString('七天', (string) $article->content);
    }
}
