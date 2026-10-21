<?php

declare(strict_types=1);

namespace Examples\Decorator\Middleware;

/**
 * 具体装饰器：身份认证中间件.
 * 检查请求头中的 token，将用户信息注入到 $request->attributes。
 */
class AuthMiddleware extends Middleware
{
    public function handle(Request $request): Response
    {
        $token = $request->headers['X-Token'] ?? null;

        if ($token === null) {
            return new Response(401, 'Unauthorized: token missing');
        }

        // 实际场景中这里会查 DB / 验签，这里用映射表模拟
        $users = [
            'token-alice' => 'Alice',
            'token-bob'   => 'Bob',
        ];

        if (!isset($users[$token])) {
            return new Response(401, 'Unauthorized: invalid token');
        }

        $request->attributes['user'] = $users[$token];

        return $this->next($request);
    }
}
