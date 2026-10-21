<?php

declare(strict_types=1);

namespace Examples\Decorator\FromPython;

/**
 * 示例 10: @dataclass(frozen=True) → PHP readonly class
 *
 * Python 等价:
 *   from dataclasses import dataclass
 *
 *   @dataclass(frozen=True)
 *   class User:
 *       name: str
 *       age: int
 *
 * PHP 8.2+ readonly class 让所有属性都不可变。
 */

final readonly class User
{
    public function __construct(
        public string $name,
        public int $age,
    ) {}
}

$u = new User('Alice', 30);
echo "{$u->name} ({$u->age})" . PHP_EOL;
// Alice (30)

// $u->name = 'Bob';   // ❌ Error: Cannot modify readonly property
