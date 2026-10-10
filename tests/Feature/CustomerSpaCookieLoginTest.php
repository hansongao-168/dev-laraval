<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\Support\HostTestCustomer;
use Tests\TestCase;

class CustomerSpaCookieLoginTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->rebuildCustomerTables();

        config([
            'customer.model' => HostTestCustomer::class,
            'customer.auth.guard' => 'customer',
            'auth.providers.customers.model' => HostTestCustomer::class,
            'sanctum.guard' => ['customer', 'web'],
        ]);
    }

    public function test_stateful_login_issues_session_and_me_returns_the_customer(): void
    {
        HostTestCustomer::query()->create([
            'name' => 'SPA User',
            'email' => 'spa@example.com',
            'password' => 'password12',
            'email_verified_at' => now(),
            'locale' => 'zh-CN',
            'timezone' => 'Asia/Shanghai',
        ]);

        $origin = [
            'Origin' => 'http://localhost:3000',
            'Referer' => 'http://localhost:3000/',
        ];

        $this->withHeaders($origin)->get('/sanctum/csrf-cookie')->assertNoContent();

        $this->withHeaders($origin)
            ->postJson('/api/v1/auth/login', [
                'email' => 'spa@example.com',
                'password' => 'password12',
            ])
            ->assertOk()
            ->assertJsonPath('data.email', 'spa@example.com');

        $this->withHeaders($origin)
            ->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.email', 'spa@example.com');
    }

    public function test_login_rejects_invalid_credentials_without_enumerating_accounts(): void
    {
        $this->withHeaders([
            'Origin' => 'http://localhost:3000',
            'Referer' => 'http://localhost:3000/',
        ])->get('/sanctum/csrf-cookie');

        $this->withHeaders([
            'Origin' => 'http://localhost:3000',
            'Referer' => 'http://localhost:3000/',
        ])->postJson('/api/v1/auth/login', [
            'email' => 'missing@example.com',
            'password' => 'password12',
        ])->assertStatus(422)
            ->assertJsonPath('message', '邮箱或密码不正确');
    }

    protected function rebuildCustomerTables(): void
    {
        Schema::dropIfExists('customer_login_logs');
        Schema::dropIfExists('customer_addresses');
        Schema::dropIfExists('addresses');
        Schema::dropIfExists('customers');
        Schema::dropIfExists('activity_log');

        $migrations = glob(realpath(__DIR__.'/../../gz168/Customer/database/migrations').'/*.php');
        sort($migrations);

        foreach ($migrations as $file) {
            $migration = require $file;
            $migration->up();
        }

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
        });
    }
}
