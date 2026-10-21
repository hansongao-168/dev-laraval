<?php

declare(strict_types=1);

namespace Examples\Decorator\Middleware;

/**
 * 具体构件：最内层的业务处理者（控制器）.
 *
 * 整个装饰链的"终点"。
 */
class HelloController implements Handler
{
    public function handle(Request $request): Response
    {
        $user = $request->attributes['user'] ?? 'Guest';

        return new Response(200, "Hello, {$user}! path={$request->path}");
    }
}
