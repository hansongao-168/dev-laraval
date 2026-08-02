<?php

namespace Tests\Feature;

use Gz168\SystemSettings\Models\Setting;
use Gz168\SystemSettings\Services\SettingsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class SystemSettingsServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_null_encrypted_defaults_are_stored_and_read_as_null(): void
    {
        config(['mail.mailers.smtp.password' => null]);

        $service = app(SettingsService::class);
        $service->seedDefaults();

        $setting = Setting::query()->where('key', 'mail_password')->firstOrFail();

        $this->assertNull($setting->value);
        $this->assertNull($service->get('mail_password'));
    }

    public function test_legacy_json_null_encrypted_values_are_read_as_null(): void
    {
        Setting::query()->create([
            'group' => 'mail',
            'key' => 'mail_password',
            'value' => 'null',
            'type' => 'encrypted',
            'is_infrastructure' => true,
        ]);
        Cache::forget('system_settings');

        $this->assertNull(app(SettingsService::class)->get('mail_password'));
    }
}
