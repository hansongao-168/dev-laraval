<?php

declare(strict_types=1);

namespace Examples\Decorator\Middleware;

/**
 * 具体装饰器：日志中间件.
 * 记录每个请求耗时。
 */
class LogMiddleware extends Middleware
{
    public function handle(Request $request): Response
    {
        $start = microtime(true);
        $response = $this->next($request);
        $cost = (microtime(true) - $start) * 1000;

        echo "[Log] {$request->method} {$request->path} -> {$response->status} ({$cost}ms)" . PHP_EOL;

        return $response;
    }
}
