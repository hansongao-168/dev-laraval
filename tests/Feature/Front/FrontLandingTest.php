<?php

declare(strict_types=1);

namespace Tests\Feature\Front;

use Tests\TestCase;

final class FrontLandingTest extends TestCase
{
    public function test_home_landing_shows_brand_cta_and_selling_points(): void
    {
        $response = $this->get(route('home'));

        $response->assertOk();
        $response->assertSee('ERP Global', false);
        $response->assertSee('精选好物，一站购齐', false);
        $response->assertSee('进入商城', false);
        $response->assertSee('精选商品', false);
        $response->assertSee('放心购物', false);
        $response->assertSee('售后帮助', false);
        $response->assertDontSee("Let's get started", false);
    }

    public function test_storefront_placeholder_shows_coming_soon_and_home_link(): void
    {
        $response = $this->get(route('storefront'));

        $response->assertOk();
        $response->assertSee('商城', false);
        $response->assertSee('商城接入中', false);
        $response->assertSee(route('home'), false);
    }
}
