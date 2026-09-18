<?php

declare(strict_types=1);

namespace Tests\Feature\ApiDoc;

use App\Models\User;
use Gz168\ApiDoc\Database\Seeders\ApiDocTemplateSeeder;
use Gz168\ApiDoc\Models\ApiDocTemplate;
use Gz168\ApiDoc\Services\ApiDocTemplateSkinCopier;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\File;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ApiDocTemplateSkinCopierTest extends TestCase
{
    use LazilyRefreshDatabase;

    private function tempDir(): string
    {
        return sys_get_temp_dir().'/api-doc-copier-'.uniqid();
    }

    private function packageRoot(): string
    {
        return dirname(__DIR__, 3).'/gz168/ApiDoc';
    }

    #[Test]
    public function creates_directory_and_prefills_when_dir_missing(): void
    {
        $this->seed(ApiDocTemplateSeeder::class);
        $template = ApiDocTemplate::factory()->create([
            'code' => 'skin-a',
            'views_prefix' => ApiDocTemplate::prefixForCode('skin-a'),
            'is_active' => true,
        ]);

        $copier = new ApiDocTemplateSkinCopier(
            viewsDir: $this->packageRoot().'/resources/views/front',
            cssPath: $this->packageRoot().'/resources/css/api-doc.css',
            jsPath: $this->packageRoot().'/resources/js/front/api-doc/api-doc.js',
        );
        $copier->copy($template, null);

        $this->assertDirectoryExists($this->packageRoot().'/resources/views/front-skin-a');
        $this->assertFileExists($this->packageRoot().'/resources/views/front-skin-a/api-doc-page.blade.php');
        $this->assertArrayHasKey('page', $template->fresh()->body_parts);
        $this->assertNotEmpty($template->fresh()->css_text);
        $this->assertNull($template->fresh()->js_text);

        File::deleteDirectory($this->packageRoot().'/resources/views/front-skin-a');
    }

    #[Test]
    public function skips_file_copy_when_directory_exists(): void
    {
        $this->seed(ApiDocTemplateSeeder::class);
        $template = ApiDocTemplate::factory()->create([
            'code' => 'skin-b',
            'views_prefix' => ApiDocTemplate::prefixForCode('skin-b'),
        ]);
        $dir = $this->packageRoot().'/resources/views/front-skin-b';
        File::ensureDirectoryExists($dir);
        $sentinel = $dir.'/SENTINEL.txt';
        File::put($sentinel, 'preserve');

        $copier = new ApiDocTemplateSkinCopier(
            viewsDir: $this->packageRoot().'/resources/views/front',
            cssPath: $this->packageRoot().'/resources/css/api-doc.css',
            jsPath: $this->packageRoot().'/resources/js/front/api-doc/api-doc.js',
        );
        $copier->copy($template, null);

        $this->assertSame('preserve', File::get($sentinel));
        $this->assertFileDoesNotExist($dir.'/api-doc-page.blade.php');

        File::deleteDirectory($dir);
    }

    #[Test]
    public function admin_creator_populates_js_text(): void
    {
        $this->seed(ApiDocTemplateSeeder::class);
        $admin = User::factory()->create([
            'is_protected' => true,
            'is_super_admin' => true,
        ]);
        $this->actingAs($admin);
        $template = ApiDocTemplate::factory()->create([
            'code' => 'skin-c',
            'views_prefix' => ApiDocTemplate::prefixForCode('skin-c'),
        ]);

        $copier = new ApiDocTemplateSkinCopier(
            viewsDir: $this->packageRoot().'/resources/views/front',
            cssPath: $this->packageRoot().'/resources/css/api-doc.css',
            jsPath: $this->packageRoot().'/resources/js/front/api-doc/api-doc.js',
        );
        $copier->copy($template, $admin);

        $this->assertNotNull($template->fresh()->js_text);

        File::deleteDirectory($this->packageRoot().'/resources/views/front-skin-c');
    }
}
