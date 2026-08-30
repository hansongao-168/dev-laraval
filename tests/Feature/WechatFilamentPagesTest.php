<?php

namespace Tests\Feature;

use App\Models\User;
use Gz168\WechatApp\Database\Factories\WechatAppFactory;
use Gz168\WechatNotify\Database\Factories\WechatNotifyLogFactory;
use Gz168\WechatNotify\Database\Factories\WechatSubscribeGrantFactory;
use Gz168\WechatOfficialAccount\Filament\Pages\WechatOaMenuPage;
use Gz168\WechatOfficialAccount\Models\WechatInboundMessage;
use Gz168\WechatPay\Database\Factories\WechatMchAccountFactory;
use Gz168\WechatPay\Models\WechatPayTransaction;
use Gz168\WechatPay\Models\WechatRefund;
use Gz168\WechatPay\Models\WechatTransferRecord;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * 微信后台 Filament 页面渲染冒烟：超管 + 种子数据逐一渲染，
 * 捕获列格式化闭包（类型化枚举）等仅在真实渲染时暴露的运行时错误。
 */
class WechatFilamentPagesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $admin = User::factory()->make();
        $admin->forceFill([
            'is_protected' => true,
            'is_super_admin' => true,
        ])->saveQuietly();

        auth()->login($admin);
    }

    protected function seedRowsForRendering(): void
    {
        $mch = WechatMchAccountFactory::new()->create();

        WechatAppFactory::new()->create([
            'app_id' => 'wx-smoke-app',
            'mch_account_id' => $mch->id,
        ]);

        WechatPayTransaction::factory()->paid()->create([
            'mch_account_id' => $mch->id,
        ]);

        WechatRefund::factory()->create([
            'wechat_pay_transaction_id' => WechatPayTransaction::query()->firstOrFail()->id,
        ]);

        WechatTransferRecord::factory()->create([
            'mch_account_id' => $mch->id,
            'user_name_encrypted' => '张三',
        ]);

        WechatNotifyLogFactory::new()->sent()->create();
        WechatSubscribeGrantFactory::new()->create();

        WechatInboundMessage::query()->create([
            'app_id' => 'wx-smoke-app',
            'msg_type' => 'text',
            'from_openid' => 'openid-smoke-1',
            'msg_id' => '600000001',
            'content' => '冒烟消息',
            'received_at' => now(),
            'dedupe_key' => 'msg:600000001',
            'created_at' => now(),
        ]);
    }

    public function test_wechat_admin_pages_render_for_super_admin(): void
    {
        $this->seedRowsForRendering();

        $pages = [
            '/admin/wechat-apps',
            '/admin/wechat-pay-mch-accounts',
            '/admin/wechat-pay-transactions',
            '/admin/wechat-pay-refunds',
            '/admin/wechat-pay-transfers',
            '/admin/wechat-notify-logs',
            '/admin/wechat-subscribe-grants',
            '/admin/wechat-oa-inbound-messages',
            '/admin/wechat-oa-menu',
        ];

        foreach ($pages as $page) {
            $this->get($page)->assertOk();
        }

        // 菜单页权限判定单独断言，区分 404 的来源
        $this->assertTrue(WechatOaMenuPage::canAccess());
    }

    public function test_wechat_admin_pages_render_with_empty_tables(): void
    {
        foreach ([
            '/admin/wechat-apps',
            '/admin/wechat-pay-transactions',
            '/admin/wechat-notify-logs',
        ] as $page) {
            $this->get($page)->assertOk();
        }
    }
}
