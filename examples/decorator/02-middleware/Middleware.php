<?php

declare(strict_types=1);

namespace Examples\Decorator\Middleware;

/**
 * 抽象装饰器：所有具体中间件都继承自它.
 */
abstract class Middleware implements Handler
{
    public function __construct(protected ?Handler $next = null)
    {
    }

    /**
     * 调用下一个 handler（如果存在的话）.
     */
    protected function next(Request $request): Response
    {
        if ($this->next === null) {
            return new Response(404, 'Not Found');
        }

        return $this->next->handle($request);
    }
}
