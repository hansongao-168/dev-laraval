<?php

declare(strict_types=1);

namespace Examples\Decorator\FromPython;

/**
 * 示例 1: 函数级装饰器
 *
 * Python 等价:
 *   @logger
 *   def hello(name): return f"Hello, {name}"
 */

// ---------- "被装饰"函数 ----------
function hello(string $name): string
{
    return "Hello, {$name}";
}

// ---------- 装饰器工厂 ----------
function logger(callable $func): callable
{
    return function (...$args) use ($func) {
        $name = $func.__FUNCTION__ ?? 'closure';
        echo "[LOG] call {$name}" . PHP_EOL;
        return $func(...$args);
    };
}

// ---------- 使用 ----------
$decorated = logger('Examples\\Decorator\\FromPython\\hello');
echo $decorated('World') . PHP_EOL;   // [LOG] call hello \n Hello, World
