<?php

namespace Tests\Feature;

use Tests\TestCase;

class SanctumStatefulFrontendTest extends TestCase
{
    public function test_sanctum_treats_the_web_app_origin_as_stateful(): void
    {
        $stateful = config('sanctum.stateful');

        $this->assertIsArray($stateful);
        $this->assertContains('localhost:3000', $stateful);
        $this->assertContains('127.0.0.1:3000', $stateful);
    }

    public function test_csrf_cookie_is_issued_for_the_web_frontend_origin(): void
    {
        $response = $this->withHeaders([
            'Origin' => 'http://localhost:3000',
            'Referer' => 'http://localhost:3000/',
        ])->get('/sanctum/csrf-cookie');

        $response->assertNoContent();
        $response->assertCookie('XSRF-TOKEN');
    }
}
