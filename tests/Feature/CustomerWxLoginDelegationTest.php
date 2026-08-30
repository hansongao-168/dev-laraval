<?php

namespace Tests\Feature;

use Gz168\Customer\Shared\Models\Customer;
use Gz168\Customer\Shared\Support\CustomerModels;
use Gz168\WechatContracts\Contracts\MiniProgramAuthInterface;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Tests\Support\HostTestCustomer;
use Tests\TestCase;

/**
 * 验证 Customer 的微信登录已委托给 gz168/WechatMiniProgram 契约实现。
 *
 * 宿主测试库中 Customer 模块的迁移是 publish 制（hasMigrations），且
 * UserManagement 自带一份不兼容的 customers 表（phone 版），因此这里
 * 在测试内重建 Customer 模块声明的表结构。
 */
class CustomerWxLoginDelegationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->rebuildCustomerTables();

        config([
            'customer.wx.app_id' => 'wx-host-test',
            'customer.wx.app_secret' => 'host-test-secret',
            'customer.model' => HostTestCustomer::class,
        ]);
    }

    protected function rebuildCustomerTables(): void
    {
        Schema::dropIfExists('customer_login_logs');
        Schema::dropIfExists('addresses');
        Schema::dropIfExists('customers');
        Schema::dropIfExists('activity_log');

        $migrations = glob(realpath(__DIR__.'/../../gz168/Customer/database/migrations').'/*.php');

        sort($migrations);

        foreach ($migrations as $file) {
            $migration = require $file;
            $migration->up();
        }

        // spatie/laravel-activitylog 的迁移同样是 publish 制，宿主测试库没有该表
        Schema::create('activity_log', function ($table): void {
            $table->bigIncrements('id');
            $table->string('log_name')->nullable();
            $table->string('description');
            $table->string('event')->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->string('subject_type')->nullable();
            $table->unsignedBigInteger('causer_id')->nullable();
            $table->string('causer_type')->nullable();
            $table->json('properties');
            $table->uuid('batch_uuid')->nullable();
            $table->timestamps();
            $table->index('log_name');
            $table->index(['subject_id', 'subject_type']);
            $table->index(['causer_id', 'causer_type']);
        });
    }

    protected function fakeContract(): object
    {
        $fake = new class implements MiniProgramAuthInterface
        {
            /** @var list<array{string, string}> */
            public array $codeToSessionCalls = [];

            public ?array $nextSession = null;

            public function codeToSession(string $appId, string $code): ?array
            {
                $this->codeToSessionCalls[] = [$appId, $code];

                return $this->nextSession;
            }

            public function phoneNumber(string $appId, string $code): ?string
            {
                return null;
            }
        };

        $this->app->instance(MiniProgramAuthInterface::class, $fake);

        return $fake;
    }

    public function test_wx_login_delegates_to_contract_and_registers_customer(): void
    {
        $fake = $this->fakeContract();
        $fake->nextSession = ['openid' => 'openid-e2e-1', 'unionid' => 'unionid-e2e-1', 'session_key' => 'sk'];

        $response = $this->postJson('/api/v1/auth/wx-login', ['code' => 'good-code']);

        $response->assertOk()
            ->assertJsonStructure(['customer' => ['id'], 'token']);

        $this->assertSame([['wx-host-test', 'good-code']], $fake->codeToSessionCalls);

        $customer = CustomerModels::customerClass()::query()->where('wx_openid', 'openid-e2e-1')->first();

        $this->assertNotNull($customer);
        $this->assertSame('unionid-e2e-1', $customer->wx_unionid);
        $this->assertNotNull($customer->last_login_at);

        $this->assertDatabaseHas('customer_login_logs', [
            'customer_id' => $customer->id,
            'channel' => 'wx',
            'success' => true,
        ]);
    }

    public function test_wx_login_returns_422_when_contract_reports_invalid_code(): void
    {
        $fake = $this->fakeContract();
        $fake->nextSession = null;

        $this->postJson('/api/v1/auth/wx-login', ['code' => 'bad-code'])
            ->assertUnprocessable();

        $this->assertSame(0, CustomerModels::customerClass()::query()->count());

        $log = DB::table('customer_login_logs')->where('channel', 'wx')->first();

        $this->assertNotNull($log);
        $this->assertFalse((bool) $log->success);
        $this->assertSame('wx_code_exchange_failed', $log->failure_reason);
    }

    public function test_wx_login_skips_contract_when_credentials_not_configured(): void
    {
        config([
            'customer.wx.app_id' => null,
            'customer.wx.app_secret' => null,
        ]);

        $fake = $this->fakeContract();

        $this->postJson('/api/v1/auth/wx-login', ['code' => 'any-code'])
            ->assertUnprocessable();

        $this->assertSame([], $fake->codeToSessionCalls);
    }

    public function test_existing_customer_logs_in_without_new_record(): void
    {
        /** @var Customer $existing */
        $existing = CustomerModels::customerClass()::query()->create([
            'name' => '既有微信用户',
            'email' => 'openid-e2e-2@wx.local',
            'password' => Hash::make(Str::random(32)),
            'wx_openid' => 'openid-e2e-2',
        ]);

        $fake = $this->fakeContract();
        $fake->nextSession = ['openid' => 'openid-e2e-2', 'session_key' => 'sk'];

        $this->postJson('/api/v1/auth/wx-login', ['code' => 'good-code'])
            ->assertOk();

        $this->assertSame(1, CustomerModels::customerClass()::query()->where('wx_openid', 'openid-e2e-2')->count());
        $this->assertNotNull($existing->fresh()->last_login_at);
    }
}
