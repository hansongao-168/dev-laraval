<?php

namespace Tests\Feature;

use App\Models\User;
use Gz168\Crm\Enums\CustomerStatus;
use Gz168\Crm\Enums\FollowUpType;
use Gz168\Crm\Enums\OpportunityStage;
use Gz168\Crm\Mail\FollowUpReminderMail;
use Gz168\Crm\Models\CrmContact;
use Gz168\Crm\Models\CrmCustomer;
use Gz168\Crm\Models\CrmFollowUp;
use Gz168\Crm\Models\CrmOpportunity;
use Gz168\Crm\Services\CrmContactService;
use Gz168\Crm\Services\CrmCustomerCsvExportService;
use Gz168\Crm\Services\CrmCustomerService;
use Gz168\Crm\Services\CrmFollowUpService;
use Gz168\Crm\Services\CrmOpportunityService;
use Gz168\Crm\Services\CrmStatsService;
use Illuminate\Console\Command;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class CrmModuleTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_service_generates_unique_code_and_locks_it_afterwards(): void
    {
        $service = app(CrmCustomerService::class);

        $first = $service->create(['name' => '杭州星辰科技']);
        $second = $service->create(['name' => '上海云帆贸易', 'code' => 'ACME-001']);

        $this->assertMatchesRegularExpression('/^CRM-\d{6}$/', (string) $first->code);
        $this->assertSame('ACME-001', $second->code);
        $this->assertNotSame($first->code, $second->code);

        // 编号一经分配不可修改，其余字段正常更新。
        $service->update($first, ['code' => 'HACKED', 'name' => '杭州星辰科技有限公司']);

        $this->assertNotSame('HACKED', $first->refresh()->code);
        $this->assertSame('杭州星辰科技有限公司', $first->name);
    }

    public function test_primary_contact_is_exclusive_within_customer(): void
    {
        $customer = CrmCustomer::factory()->create();
        $first = CrmContact::factory()->for($customer, 'customer')->primary()->create();
        $second = CrmContact::factory()->for($customer, 'customer')->create();

        $this->assertTrue($first->fresh()->is_primary);
        $this->assertFalse($second->fresh()->is_primary);

        app(CrmContactService::class)->setPrimary($second);

        $this->assertTrue($second->fresh()->is_primary);
        $this->assertFalse($first->fresh()->is_primary);

        // 排他性仅限同一客户，跨客户主联系人互不影响。
        $otherCustomer = CrmCustomer::factory()->create();
        $otherContact = CrmContact::factory()->for($otherCustomer, 'customer')->primary()->create();

        $this->assertTrue($otherContact->fresh()->is_primary);
        $this->assertTrue($second->fresh()->is_primary);
    }

    public function test_follow_up_records_recorder_and_updates_customer_last_follow_up_at(): void
    {
        $customer = CrmCustomer::factory()->create();
        $recorder = User::factory()->create();
        $service = app(CrmFollowUpService::class);

        $latest = $service->record($customer, [
            'type' => FollowUpType::Visit->value,
            'content' => '现场拜访，沟通年度合作',
            'followed_at' => now()->subDay(),
        ], $recorder->id);

        $this->assertSame($recorder->id, $latest->user_id);
        $this->assertSame($customer->id, $latest->crm_customer_id);
        $this->assertTrue(
            $customer->refresh()->last_follow_up_at->equalTo($latest->followed_at),
            '客户最近跟进时间应同步为该次跟进时间。',
        );

        // 更早的跟进不得回拨客户最近跟进时间。
        $earlier = $service->record($customer, [
            'type' => FollowUpType::Call->value,
            'content' => '电话回访',
            'followed_at' => now()->subDays(2),
        ], $recorder->id);

        $this->assertTrue(
            $customer->refresh()->last_follow_up_at->equalTo($latest->followed_at),
            '更早的跟进记录不应回拨客户最近跟进时间。',
        );
        $this->assertTrue($earlier->followed_at->lessThan($customer->last_follow_up_at));
    }

    public function test_opportunity_closed_at_follows_stage_transitions(): void
    {
        $customer = CrmCustomer::factory()->create();
        $opportunity = CrmOpportunity::factory()->for($customer, 'customer')->create();

        $this->assertNull($opportunity->closed_at, '进行中的商机不应有关闭时间。');

        $service = app(CrmOpportunityService::class);

        $service->changeStage($opportunity, OpportunityStage::Won);
        $this->assertNotNull($opportunity->fresh()->closed_at);

        // 重新打开应清空关闭时间。
        $service->changeStage($opportunity, OpportunityStage::Negotiation);
        $this->assertNull($opportunity->fresh()->closed_at);

        $service->changeStage($opportunity, OpportunityStage::Lost);
        $this->assertNotNull($opportunity->fresh()->closed_at);

        // open 作用域排除已成交/已输单的商机。
        $openIds = CrmOpportunity::query()->open()->pluck('id');

        $this->assertFalse($openIds->contains($opportunity->id));
    }

    public function test_crm_permissions_short_circuit_for_super_admin_only(): void
    {
        $superAdmin = User::factory()->create(['is_super_admin' => true]);
        $plainUser = User::factory()->create();

        $this->assertTrue($superAdmin->hasPermission('crm.customers.view'));
        $this->assertTrue($superAdmin->hasPermission('crm.follow-ups.create'));
        $this->assertFalse($plainUser->hasPermission('crm.customers.view'));
        $this->assertFalse($plainUser->hasPermission('crm.opportunities.update'));
    }

    public function test_seed_permissions_command_is_idempotent(): void
    {
        $this->artisan('crm:seed-permissions')->assertExitCode(Command::SUCCESS);
        $this->artisan('crm:seed-permissions')
            ->expectsOutputToContain('本次新增 0')
            ->assertExitCode(Command::SUCCESS);

        foreach (['crm.customers.view', 'crm.opportunities.update', 'crm.follow-ups.create'] as $slug) {
            $this->assertDatabaseHas('permissions', ['slug' => $slug]);
        }

        $this->assertSame(10, DB::table('permissions')->where('slug', 'like', 'crm.%')->count());
    }

    public function test_stats_service_aggregates_customers_opportunities_and_follow_ups(): void
    {
        $customer = CrmCustomer::factory()->create(['status' => CustomerStatus::Potential->value]);
        CrmCustomer::factory()->create(['status' => CustomerStatus::Active->value]);
        CrmOpportunity::factory()->for($customer, 'customer')->create(['amount' => 1000.50]);
        CrmOpportunity::factory()->for($customer, 'customer')->create(['amount' => 999.50]);
        CrmOpportunity::factory()->for($customer, 'customer')->create([
            'amount' => 5000.00,
            'stage' => OpportunityStage::Won->value,
        ]);
        CrmFollowUp::factory()->for($customer, 'customer')->create(['followed_at' => now()]);
        CrmFollowUp::factory()->for($customer, 'customer')->create(['followed_at' => now()->subDays(45)]);

        $stats = app(CrmStatsService::class);

        $this->assertSame(2, $stats->customersTotal());
        $this->assertSame(1, $stats->potentialCustomers());

        $byStatus = $stats->customersByStatus();
        $this->assertSame(1, $byStatus[CustomerStatus::Potential->value] ?? 0);
        $this->assertSame(1, $byStatus[CustomerStatus::Active->value] ?? 0);
        $this->assertSame(0, $byStatus[CustomerStatus::Churned->value] ?? 0, '无数据的状态不出现或为 0。');

        $open = $stats->openOpportunities();
        $this->assertSame(2, $open['count'], '已成交/已输单商机不计入进行中。');
        $this->assertEquals(2000.0, $open['amount']);

        $this->assertSame(1, $stats->followUpsLast30Days(), '仅统计近 30 天跟进。');
    }

    public function test_next_follow_up_at_follows_latest_follow_up_only(): void
    {
        $customer = CrmCustomer::factory()->create();
        $service = app(CrmFollowUpService::class);

        $service->record($customer, [
            'type' => FollowUpType::Call->value,
            'content' => '首次跟进，约定下周复访',
            'followed_at' => now()->subDays(2),
            'next_follow_up_at' => now()->addDays(7),
        ], User::factory()->create()->id);

        $this->assertNotNull($customer->refresh()->next_follow_up_at);

        // 更新的跟进覆盖计划时间。
        $service->record($customer, [
            'type' => FollowUpType::Visit->value,
            'content' => '上门拜访',
            'followed_at' => now(),
            'next_follow_up_at' => now()->addDays(3),
        ], User::factory()->create()->id);

        $this->assertTrue(
            $customer->refresh()->next_follow_up_at->isSameDay(now()->addDays(3)),
            '最新跟进的计划时间应覆盖客户下次跟进时间。',
        );

        // 更早日期的补录跟进不得覆盖计划时间。
        $service->record($customer, [
            'type' => FollowUpType::Email->value,
            'content' => '补录邮件往来',
            'followed_at' => now()->subDays(5),
            'next_follow_up_at' => now()->addDays(30),
        ], User::factory()->create()->id);

        $this->assertTrue(
            $customer->refresh()->next_follow_up_at->isSameDay(now()->addDays(3)),
            '补录的更早跟进不应覆盖客户下次跟进时间。',
        );

        // 最新跟进未设置计划时间时清空。
        $service->record($customer, [
            'type' => FollowUpType::Call->value,
            'content' => '结案通话，无后续计划',
            'followed_at' => now()->addHour(),
            'next_follow_up_at' => null,
        ], User::factory()->create()->id);

        $this->assertNull($customer->refresh()->next_follow_up_at, '最新跟进未设计划时应清空。');
    }

    public function test_due_for_follow_up_scope_excludes_churned_and_future_customers(): void
    {
        $due = CrmCustomer::factory()->create(['status' => CustomerStatus::Active->value, 'next_follow_up_at' => now()->subDay()]);
        $today = CrmCustomer::factory()->create(['status' => CustomerStatus::Active->value, 'next_follow_up_at' => now()->addHours(2)]);
        $future = CrmCustomer::factory()->create(['status' => CustomerStatus::Active->value, 'next_follow_up_at' => now()->addDays(5)]);
        $churned = CrmCustomer::factory()->create([
            'status' => CustomerStatus::Churned->value,
            'next_follow_up_at' => now()->subDay(),
        ]);
        $noPlan = CrmCustomer::factory()->create(['status' => CustomerStatus::Active->value, 'next_follow_up_at' => null]);

        $dueIds = CrmCustomer::query()->dueForFollowUp()->pluck('id');

        $this->assertTrue($dueIds->contains($due->id));
        $this->assertTrue($dueIds->contains($today->id), '今天内的计划也算待跟进。');
        $this->assertFalse($dueIds->contains($future->id));
        $this->assertFalse($dueIds->contains($churned->id), '流失客户不出现在待跟进。');
        $this->assertFalse($dueIds->contains($noPlan->id));
    }

    public function test_transfer_changes_owner_including_unassign(): void
    {
        $service = app(CrmCustomerService::class);
        $customer = CrmCustomer::factory()->create();
        $oldOwner = User::factory()->create();
        $newOwner = User::factory()->create();
        $customer->owner_id = $oldOwner->id;
        $customer->save();

        $service->transfer($customer, $newOwner->id);
        $this->assertSame($newOwner->id, $customer->refresh()->owner_id);

        // 传 0 / null 均表示暂不指派。
        $service->transfer($customer, 0);
        $this->assertNull($customer->refresh()->owner_id);

        $service->transfer($customer, $oldOwner->id);
        $service->transfer($customer, null);
        $this->assertNull($customer->refresh()->owner_id);
    }

    public function test_follow_up_reminder_command_groups_by_owner_and_respects_dry_run(): void
    {
        Mail::fake();

        $ownerA = User::factory()->create();
        $ownerB = User::factory()->create();
        $ownerless = CrmCustomer::factory()->create([
            'status' => CustomerStatus::Active->value,
            'next_follow_up_at' => now()->subDay(),
        ]);
        CrmCustomer::factory()->create([
            'status' => CustomerStatus::Active->value,
            'owner_id' => $ownerA->id,
            'next_follow_up_at' => now()->subDay(),
        ]);
        CrmCustomer::factory()->create([
            'status' => CustomerStatus::Active->value,
            'owner_id' => $ownerA->id,
            'next_follow_up_at' => now()->addHours(2),
        ]);
        CrmCustomer::factory()->create([
            'status' => CustomerStatus::Active->value,
            'owner_id' => $ownerB->id,
            'next_follow_up_at' => now()->subHours(5),
        ]);

        // dry-run 不发信。
        $this->artisan('crm:send-follow-up-reminders', ['--dry-run' => true])
            ->expectsOutputToContain('dry-run 完成：2 位负责人待提醒')
            ->assertExitCode(Command::SUCCESS);
        Mail::assertNothingSent();

        $this->artisan('crm:send-follow-up-reminders')->assertExitCode(Command::SUCCESS);

        // 无主客户不产生提醒；按负责人分组各发一封。
        Mail::assertSent(FollowUpReminderMail::class, 2);
        Mail::assertSent(FollowUpReminderMail::class, fn (FollowUpReminderMail $mail): bool => $mail->ownerName === $ownerA->name && count($mail->customers) === 2);
        Mail::assertSent(FollowUpReminderMail::class, fn (FollowUpReminderMail $mail): bool => count($mail->customers) === 1);

        $this->assertNull($ownerless->owner_id);
    }

    public function test_csv_export_service_emits_header_and_mapped_rows(): void
    {
        $owner = User::factory()->create();
        $customer = CrmCustomer::factory()->create([
            'status' => CustomerStatus::Active->value,
            'owner_id' => $owner->id,
            'code' => 'ACME-100',
            'name' => '测试导出公司',
            'last_follow_up_at' => now(),
            'next_follow_up_at' => now()->addDays(2),
        ]);

        $export = app(CrmCustomerCsvExportService::class);
        $query = CrmCustomer::query()->whereKey($customer->id);

        $header = $export->header();
        $this->assertSame('客户编号', $header[0]);
        $this->assertSame('创建时间', $header[count($header) - 1]);

        $rows = $export->rows($query)->all();
        $this->assertCount(1, $rows);

        [$code, $name, , , , $status, $ownerName, , , , , $last, $next] = $rows[0];
        $this->assertSame('ACME-100', $code);
        $this->assertSame('测试导出公司', $name);
        $this->assertSame(CustomerStatus::Active->label(), $status, '枚举列应输出中文标签。');
        $this->assertSame($owner->name, $ownerName, '负责人应经 eager load 取名。');
        $this->assertNotSame('', $last);
        $this->assertNotSame('', $next);
    }
}
