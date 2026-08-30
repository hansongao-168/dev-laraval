<?php

namespace Tests\Feature;

use App\Models\User;
use DateTimeImmutable;
use Gz168\MailAccount\Models\MailAccount;
use Gz168\MailAccount\Models\MailAccountCredential;
use Gz168\MailContracts\Contracts\InboundTransportInterface;
use Gz168\MailContracts\Data\InboundCursorData;
use Gz168\MailContracts\Data\InboundMessageData;
use Gz168\MailContracts\Data\InboundSyncOptions;
use Gz168\MailContracts\Data\InboundSyncResult;
use Gz168\MailContracts\Data\MailCredentialData;
use Gz168\MailContracts\Enums\MailProvider;
use Gz168\MailContracts\TransportRegistry;
use Gz168\MailInbound\Actions\DispatchMailSyncAction;
use Gz168\MailInbound\Actions\SyncMailAccountAction;
use Gz168\MailInbound\Events\InboundMailStored;
use Gz168\MailInbound\Jobs\SyncMailAccountJob;
use Gz168\MailInbound\Models\InboundMessage;
use Gz168\MailInbound\Models\MailSyncRun;
use Gz168\MailInbound\Models\MailSyncState;
use Gz168\MailNotification\Listeners\EvaluateInboundMailRules;
use Gz168\MailNotification\Models\NotificationRule;
use Gz168\MailNotification\Notifications\InboundMailAdminNotification;
use Gz168\MailOutbound\Actions\QueueMailAction;
use Gz168\MailOutbound\Jobs\SendMailJob;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Schema;
use RuntimeException;
use Tests\TestCase;

class MailArchitectureTest extends TestCase
{
    use RefreshDatabase;

    public function test_module_dependencies_are_one_way(): void
    {
        $expected = [
            'MailContracts' => ['gz168/common'], 'MailAccount' => ['gz168/mail-contracts'],
            'MailGmail' => ['gz168/mail-contracts'], 'MailQq' => ['gz168/mail-contracts'],
            'MailInbound' => ['gz168/mail-contracts', 'gz168/mail-account'],
            'MailOutbound' => ['gz168/mail-contracts', 'gz168/mail-account'],
            'MailNotification' => ['gz168/mail-inbound'],
            'MailAdmin' => ['gz168/mail-account', 'gz168/mail', 'gz168/mail-inbound', 'gz168/mail-outbound', 'gz168/mail-notification', 'gz168/filament'],
        ];
        foreach ($expected as $module => $requires) {
            $manifest = json_decode(file_get_contents(base_path("gz168/{$module}/module.json")), true, flags: JSON_THROW_ON_ERROR);
            $this->assertSame($requires, $manifest['requires']);
        }
    }

    public function test_inbound_sync_is_idempotent(): void
    {
        Event::fake();
        config()->set('mail-inbound.notify_initial_sync', true);
        $account = $this->createAccount();
        app(TransportRegistry::class)->registerInbound(MailProvider::Gmail, new class implements InboundTransportInterface
        {
            public function sync(MailCredentialData $credential, InboundCursorData $cursor, int $limit, ?InboundSyncOptions $options = null): InboundSyncResult
            {
                return new InboundSyncResult([new InboundMessageData('provider-1', 'thread-1', 'alerts@example.com', 'Alerts', ['admin@example.com'], [], 'Important alert', 'body', null, 'body', new DateTimeImmutable)], new InboundCursorData(historyId: '20'));
            }
        });
        app(SyncMailAccountAction::class)->handle($account->id);
        app(SyncMailAccountAction::class)->handle($account->id);
        $this->assertSame(1, InboundMessage::query()->count());
        Event::assertDispatchedTimes(InboundMailStored::class, 1);
    }

    public function test_manual_inbound_sync_dispatches_all_active_accounts_even_when_not_due(): void
    {
        Queue::fake();
        $dueAccount = $this->createAccount('due@example.com');
        $notDueAccount = $this->createAccount('not-due@example.com');
        $disabledAccount = $this->createAccount('disabled@example.com');
        $disabledAccount->update(['status' => 'disabled']);

        MailSyncState::query()->create([
            'mail_account_id' => $notDueAccount->id,
            'next_sync_at' => now()->addHour(),
        ]);

        $dispatchedCount = app(DispatchMailSyncAction::class)->handle(onlyDue: false);

        $this->assertSame(2, $dispatchedCount);
        $this->assertDatabaseCount('mail_inbound_sync_runs', 2);
        $this->assertDatabaseHas('mail_inbound_sync_runs', ['mail_account_id' => $dueAccount->id, 'status' => 'queued']);
        $this->assertDatabaseHas('mail_inbound_sync_runs', ['mail_account_id' => $notDueAccount->id, 'status' => 'queued']);
        Queue::assertPushed(SyncMailAccountJob::class, 2);
        Queue::assertPushed(fn (SyncMailAccountJob $job): bool => $job->accountId === $dueAccount->id);
        Queue::assertPushed(fn (SyncMailAccountJob $job): bool => $job->accountId === $notDueAccount->id);
        Queue::assertNotPushed(fn (SyncMailAccountJob $job): bool => $job->accountId === $disabledAccount->id);
    }

    public function test_inbound_job_records_final_failure(): void
    {
        Queue::fake();
        $account = $this->createAccount('failed@example.com');
        app(DispatchMailSyncAction::class)->handle($account->id, onlyDue: false);
        $job = null;

        Queue::assertPushed(SyncMailAccountJob::class, function (SyncMailAccountJob $pushedJob) use (&$job): bool {
            $job = $pushedJob;

            return true;
        });

        $this->assertNotNull($job);
        $job->failed(new RuntimeException('IMAP authentication failed'));

        $this->assertDatabaseHas('mail_inbound_sync_runs', [
            'id' => $job->syncRunId,
            'status' => 'failed',
            'error' => 'IMAP authentication failed',
        ]);
    }

    public function test_date_range_sync_is_recorded_and_passed_to_job(): void
    {
        Queue::fake();
        $account = $this->createAccount('history@example.com');

        app(DispatchMailSyncAction::class)->handle(
            $account->id,
            onlyDue: false,
            dateFrom: '2025-08-15',
            dateTo: '2026-08-15',
        );

        $this->assertDatabaseHas('mail_inbound_sync_runs', [
            'mail_account_id' => $account->id,
            'sync_mode' => 'date_range',
            'status' => 'queued',
        ]);
        $run = MailSyncRun::query()->latest('id')->firstOrFail();
        $this->assertSame('2025-08-15', $run->date_from->toDateString());
        $this->assertSame('2026-08-15', $run->date_to->toDateString());
        Queue::assertPushed(fn (SyncMailAccountJob $job): bool => $job->dateFrom === '2025-08-15' && $job->dateTo === '2026-08-15');
    }

    public function test_date_range_job_continues_one_day_at_a_time(): void
    {
        Queue::fake();
        $account = $this->createAccount('chunked-history@example.com');
        app(DispatchMailSyncAction::class)->handle(
            $account->id,
            onlyDue: false,
            dateFrom: '2026-08-13',
            dateTo: '2026-08-15',
        );
        $firstJob = null;
        Queue::assertPushed(SyncMailAccountJob::class, function (SyncMailAccountJob $job) use (&$firstJob): bool {
            $firstJob = $job;

            return $job->currentDate === '2026-08-13';
        });
        $action = $this->createMock(SyncMailAccountAction::class);
        $action->expects($this->once())->method('handle')->willReturn(0);

        $firstJob->handle($action);

        Queue::assertPushed(SyncMailAccountJob::class, fn (SyncMailAccountJob $job): bool => $job->currentDate === '2026-08-14');
    }

    public function test_notification_migration_recovers_after_partial_mysql_style_failure(): void
    {
        Schema::dropIfExists('mail_notification_matches');
        Schema::dropIfExists('mail_notification_rule_targets');
        Schema::dropIfExists('mail_notification_rules');

        Schema::create('mail_notification_rules', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('priority')->default(100);
            $table->json('conditions');
            $table->string('severity')->default('warning');
            $table->string('title_template');
            $table->boolean('mark_needs_attention')->default(true);
            $table->boolean('stop_processing')->default(false);
            $table->timestamps();
        });
        Schema::create('mail_notification_rule_targets', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('rule_id')->constrained('mail_notification_rules')->cascadeOnDelete();
            $table->string('target_type');
            $table->unsignedBigInteger('target_id');
            $table->timestamps();
        });

        $migration = require base_path('gz168/MailNotification/database/migrations/2026_08_15_000003_create_mail_notification_tables.php');
        $migration->up();

        $this->assertTrue(Schema::hasTable('mail_notification_matches'));
        $this->assertContains('mail_rule_target_unique', Schema::getIndexListing('mail_notification_rule_targets'));
    }

    public function test_notification_rule_targets_selected_user(): void
    {
        Notification::fake();
        $user = User::factory()->create();
        $message = InboundMessage::query()->create(['mail_account_id' => $this->createAccount()->id, 'provider_message_id' => 'provider-2', 'from_address' => 'risk@example.com', 'to_addresses' => [], 'cc_addresses' => [], 'subject' => 'Payment failed', 'snippet' => 'Please review', 'received_at' => now(), 'synced_at' => now()]);
        $rule = NotificationRule::query()->create(['name' => 'Risk', 'conditions' => ['from_domain' => 'example.com', 'subject_contains' => 'failed'], 'severity' => 'danger', 'title_template' => 'Risk: {subject}']);
        $rule->targets()->create(['target_type' => 'user', 'target_id' => $user->id]);
        app(EvaluateInboundMailRules::class)->handle(new InboundMailStored($message->id));
        Notification::assertSentTo($user, InboundMailAdminNotification::class);
        $this->assertTrue($message->fresh()->needs_attention);
    }

    public function test_outbound_queue_is_idempotent(): void
    {
        Queue::fake();
        $account = $this->createAccount();
        $action = app(QueueMailAction::class);
        $first = $action->handle($account->id, ['recipient@example.com'], 'Subject', 'Body', null, 'same-uuid');
        $second = $action->handle($account->id, ['recipient@example.com'], 'Subject', 'Body', null, 'same-uuid');
        $this->assertTrue($first->is($second));
        Queue::assertPushed(SendMailJob::class, 1);
    }

    private function createAccount(string $emailAddress = 'sender@example.com'): MailAccount
    {
        $account = MailAccount::query()->create(['name' => 'Gmail', 'provider' => 'gmail', 'email_address' => $emailAddress, 'status' => 'active']);
        MailAccountCredential::query()->create(['mail_account_id' => $account->id, 'oauth_refresh_token' => 'refresh-token']);

        return $account;
    }
}
