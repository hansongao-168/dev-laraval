<?php

declare(strict_types=1);

namespace Tests\Unit\MallContent;

use Gz168\MallContent\Filament\Concerns\SyncsBannerImageUpload;
use Gz168\MallMedia\Models\MallMediaAsset;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

final class SyncsBannerImageUploadTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_path_upload_persists_via_media_storage_contract(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('mall/banners/tmp/promo.jpg', 'fake-image-bytes');

        $host = new class
        {
            use SyncsBannerImageUpload;

            /**
             * @param  array<string, mixed>  $data
             * @return array<string, mixed>
             */
            public function run(array $data): array
            {
                return $this->syncBannerImageUpload($data);
            }
        };

        $result = $host->run([
            'title' => 'x',
            'image_upload' => 'mall/banners/tmp/promo.jpg',
        ]);

        $this->assertArrayHasKey('image_url', $result);
        $this->assertNotEmpty($result['image_url']);
        $this->assertArrayNotHasKey('image_upload', $result);

        $asset = MallMediaAsset::query()->where('filename', 'promo.jpg')->first();
        $this->assertNotNull($asset);
        $this->assertSame($asset->url, $result['image_url']);
        Storage::disk('public')->assertExists($asset->path);
        Storage::disk('public')->assertMissing('mall/banners/tmp/promo.jpg');
    }
}
