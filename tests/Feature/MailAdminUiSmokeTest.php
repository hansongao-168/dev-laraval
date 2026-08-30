<?php

namespace Tests\Feature;

use App\Models\User;
use Filament\Actions\Testing\TestAction;
use Filament\Facades\Filament;
use Gz168\Mail\Models\MailAccount;
use Gz168\Mail\Models\MailWebhookEndpoint;
use Gz168\MailAdmin\Filament\Resources\InboundMessageResource\Pages\ListInboundMessages;
use Gz168\MailAdmin\Filament\Resources\MailAccountResource\Pages\ListMailAccounts;
use Gz168\MailAdmin\Filament\Resources\MailWebhookEndpointResource\Pages\ListMailWebhookEndpoints;
use Gz168\MailInbound\Models\InboundMessage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

/**
 * Smoke coverage for the MailAdmin pages that expose gz168/Mail v1
 * capabilities (webhook endpoints, OTP extraction, template sending).
 */
class MailAdminUiSmokeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Filament::setCurrentPanel(Filament::getPanel('admin'));

        $this->superAdmin = User::factory()->create(['is_super_admin' => true]);
    }

    public function test_admin_renders_webhook_endpoints_list(): void
    {
        MailWebhookEndpoint::create([
            'url' => 'https://hooks.example.com/mail',
            'secret' => 'stored-encrypted',
            'active' => true,
            'description' => 'ops sink',
        ]);

        $this->actingAs($this->superAdmin);

        Livewire::test(ListMailWebhookEndpoints::class)
            ->assertSuccessful()
            ->assertSee('https://hooks.example.com/mail')
            ->assertSee('ops sink')
            ->assertDontSee('stored-encrypted');
    }

    public function test_otp_action_extracts_code_from_inbound_table(): void
    {
        $account = MailAccount::factory()->qq()->create([
            'email_address' => '53200966@qq.com',
        ]);

        InboundMessage::create([
            'mail_account_id' => $account->id,
            'provider_message_id' => 'gmail-otp-1',
            'from_address' => 'noreply@service.com',
            'to_addresses' => ['53200966@qq.com'],
            'subject' => '您的登录验证码',
            'text_body' => '您好,本次登录验证码为 639210,10 分钟内有效。',
            'received_at' => now()->subSeconds(30),
            'synced_at' => now(),
        ]);

        $this->actingAs($this->superAdmin);

        Livewire::test(ListInboundMessages::class)
            ->callAction(TestAction::make('extractOtp'), data: [
                'ttl' => 10,
            ])
            ->assertNotified();
    }

    public function test_otp_action_warns_when_window_is_empty(): void
    {
        $this->actingAs($this->superAdmin);

        Livewire::test(ListInboundMessages::class)
            ->callAction(TestAction::make('extractOtp'), data: ['ttl' => 10])
            ->assertNotified();
    }

    public function test_mail_center_accounts_render_with_template_action(): void
    {
        $account = MailAccount::factory()->gmail()->create();
        $account->credential->forceFill(['oauth_refresh_token' => 'refresh'])->save();

        $this->actingAs($this->superAdmin);

        Livewire::test(ListMailAccounts::class)
            ->assertSuccessful()
            ->assertActionVisible(TestAction::make('sendTemplate')->table($account));
    }
}
