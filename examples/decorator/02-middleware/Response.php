<?php

declare(strict_types=1);

namespace Examples\Decorator\Middleware;

final class Response
{
    /**
     * @param array<string, string> $headers
     */
    public function __construct(
        public int $status = 200,
        public string $body = '',
        public array $headers = [],
    ) {
    }
}
