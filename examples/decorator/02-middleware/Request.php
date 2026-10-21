<?php

declare(strict_types=1);

namespace Examples\Decorator\Middleware;

final class Request
{
    /**
     * @param array<string, string> $headers
     * @param array<string, mixed>  $attributes 由中间件在管道中注入的属性
     */
    public function __construct(
        public string $path,
        public string $method = 'GET',
        public array $headers = [],
        public array $attributes = [],
    ) {
    }
}
