<?php

declare(strict_types=1);

namespace Examples\Decorator\Middleware;

/**
 * 抽象构件：HTTP 请求处理器.
 *
 * 每个中间件都会实现该接口，
 * 既可以处理请求，也可以调用下一个 handler。
 */
interface Handler
{
    public function handle(Request $request): Response;
}
