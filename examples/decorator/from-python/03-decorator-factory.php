<?php

declare(strict_types=1);

namespace Examples\Decorator\FromPython;

/**
 * 示例 3: 带参数的装饰器（工厂模式）
 *
 * Python 等价:
 *   def repeat(times):
 *       def decorator(func):
 *           def wrapper(*args, **kwargs):
 *               for _ in range(times):
 *                   func(*args, **kwargs)
 *           return wrapper
 *       return decorator
 *
 *   @repeat(3)
 *   def greet(): print("Hi")
 */

function repeat(int $times): callable
{
    return static function (callable $func): callable {
        return static function (...$args) use ($func, $times) {
            $result = null;
            for ($i = 0; $i < $times; $i++) {
                $result = $func(...$args);
            }
            return $result;
        };
    };
}

function greet(): string
{
    echo "Hi" . PHP_EOL;
    return 'done';
}

$decorated = repeat(3)('Examples\\Decorator\\FromPython\\greet');
$decorated();
// Hi
// Hi
// Hi
