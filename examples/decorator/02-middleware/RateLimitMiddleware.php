<?php

declare(strict_types=1);

namespace Examples\Decorator\Middleware;

/**
 * 具体装饰器：限流中间件.
 * 简单地按 IP+时间戳做滑动窗口计数。
 */
class RateLimitMiddleware extends Middleware
{
    /**
     * @var array<string, int> 每个 key 的累计次数
     */
    private static array $counters = [];

    public function __construct(
        ?Handler $next = null,
        private int $limit = 5,
    ) {
        parent::__construct($next);
    }

    public function handle(Request $request): Response
    {
        $key = ($request->headers['X-Real-IP'] ?? 'unknown') . ':' . (int) (microtime(true) / 60);

        self::$counters[$key] = (self::$counters[$key] ?? 0) + 1;

        if (self::$counters[$key] > $this->limit) {
            return new Response(429, 'Too Many Requests');
        }

        return $this->next($request);
    }
}
