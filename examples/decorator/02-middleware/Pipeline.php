<?php

declare(strict_types=1);

namespace Examples\Decorator\Middleware;

require_once __DIR__ . '/Handler.php';
require_once __DIR__ . '/Request.php';
require_once __DIR__ . '/Response.php';
require_once __DIR__ . '/Middleware.php';
require_once __DIR__ . '/HelloController.php';
require_once __DIR__ . '/LogMiddleware.php';
require_once __DIR__ . '/AuthMiddleware.php';
require_once __DIR__ . '/CorsMiddleware.php';
require_once __DIR__ . '/RateLimitMiddleware.php';

/**
 * 装饰链的"装配"：从内向外一层层包裹.
 *
 * 最终调用顺序（洋葱模型）：
 *   Log -> RateLimit -> Cors -> Auth -> HelloController
 */
final class Pipeline
{
    public static function build(): Handler
    {
        $core = new HelloController();

        return new LogMiddleware(
            new RateLimitMiddleware(
                new CorsMiddleware(
                    new AuthMiddleware($core),
                ),
                limit: 3,
            ),
        );
    }

    /**
     * 简单的渲染器.
     */
    public static function dump(Response $response): void
    {
        echo "HTTP {$response->status}" . PHP_EOL;
        foreach ($response->headers as $k => $v) {
            echo "  {$k}: {$v}" . PHP_EOL;
        }
        echo $response->body . PHP_EOL;
    }
}

// --------------------- demo ---------------------
$handler = Pipeline::build();

echo '=== 请求 1：合法 token ===' . PHP_EOL;
$req1 = new Request('/api/hello', 'GET', ['X-Token' => 'token-alice', 'X-Real-IP' => '10.0.0.1']);
Pipeline::dump($handler->handle($req1));

echo PHP_EOL . '=== 请求 2：缺失 token ===' . PHP_EOL;
$req2 = new Request('/api/hello', 'GET', ['X-Real-IP' => '10.0.0.2']);
Pipeline::dump($handler->handle($req2));

echo PHP_EOL . '=== 请求 3：限流 ===' . PHP_EOL;
$req3 = new Request('/api/hello', 'GET', ['X-Token' => 'token-bob', 'X-Real-IP' => '10.0.0.3']);
for ($i = 1; $i <= 4; $i++) {
    echo "--- 第 {$i} 次 ---" . PHP_EOL;
    Pipeline::dump($handler->handle($req3));
}
