<?php

declare(strict_types=1);

namespace Examples\Decorator\Middleware;

/**
 * 具体装饰器：CORS 中间件.
 * 给响应统一加上跨域头。
 */
class CorsMiddleware extends Middleware
{
    public function handle(Request $request): Response
    {
        $response = $this->next($request);
        $response->headers['Access-Control-Allow-Origin'] = '*';
        $response->headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE';

        return $response;
    }
}
