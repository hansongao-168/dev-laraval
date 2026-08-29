<?php

namespace Tests\Feature;

use App\Models\User;
use Gz168\Crm\Enums\CustomerStatus;
use Gz168\Crm\Enums\FollowUpType;
use Gz168\Crm\Enums\OpportunityStage;
use Gz168\Crm\Models\CrmContact;
use Gz168\Crm\Models\CrmCustomer;
use Gz168\Crm\Models\CrmFollowUp;
use Gz168\Crm\Models\CrmOpportunity;
use Gz168\Crm\Services\CrmContactService;
use Gz168\Crm\Services\CrmCustomerService;
use Gz168\Crm\Services\CrmFollowUpService;
use Gz168\Crm\Services\CrmOpportunityService;
use Gz168\Crm\Services\CrmStatsService;
use Illuminate\Console\Command;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
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

        $open = $stats->openOpportunities();
        $this->assertSame(2, $open['count'], '已成交/已输单商机不计入进行中。');
        $this->assertEquals(2000.0, $open['amount']);

        $this->assertSame(1, $stats->followUpsLast30Days(), '仅统计近 30 天跟进。');
    }
}
