<?php

declare(strict_types=1);

namespace Examples\Decorator\FromPython;

/**
 * 示例 11: @lru_cache → PHP 记忆化装饰器
 *
 * Python 等价:
 *   import functools
 *
 *   @functools.lru_cache(maxsize=128)
 *   def fib(n): return n if n < 2 else fib(n-1) + fib(n-2)
 *
 * PHP: 用 SplObjectStorage / 数组做 LRU 缓存装饰。
 */

function memoize(callable $func, int $maxSize = 128): callable
{
    $cache = [];
    $keys  = [];   // 简易 FIFO（生产环境可用 LRU K-V 库）

    return static function (...$args) use (&$cache, &$keys, $func, $maxSize) {
        $key = md5(serialize($args));
        if (isset($cache[$key])) {
            echo "[memo] hit" . PHP_EOL;
            return $cache[$key];
        }
        echo "[memo] miss" . PHP_EOL;
        $r = $func(...$args);
        $cache[$key] = $r;
        $keys[] = $key;
        if (count($keys) > $maxSize) {
            unset($cache[array_shift($keys)]);
        }
        return $r;
    };
}

function fib(int $n): int
{
    return $n < 2 ? $n : fib($n - 1) + fib($n - 2);
}

$fast = memoize('Examples\\Decorator\FromPython\\fib');
echo $fast(10) . PHP_EOL;   // 55
echo $fast(10) . PHP_EOL;   // 55 (cache hit)
echo $fast(11) . PHP_EOL;
