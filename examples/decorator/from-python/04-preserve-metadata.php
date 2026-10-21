<?php

declare(strict_types=1);

namespace Examples\Decorator\FromPython;

use ReflectionFunction;
use ReflectionMethod;

/**
 * 示例 4: 保留原函数元数据（functools.wraps 等价物）
 *
 * Python 等价:
 *   import functools
 *   def logger(func):
 *       @functools.wraps(func)
 *       def wrapper(*args, **kwargs):
 *           return func(*args, **kwargs)
 *       return wrapper
 *
 * PHP 用反射读取原函数的 doc comment / 参数 / 返回类型。
 */

/** 打招呼 */
function greet(string $name): string
{
    return "Hello, {$name}";
}

/**
 * 装饰器：把原函数的 PHPDoc 透传出来（用匿名类的 doc comment 模拟）。
 */
function logger(callable $func): callable
{
    // 反射拿到被装饰函数的元信息
    $ref = $func instanceof \Closure
        ? new ReflectionFunction($func)
        : (is_array($func)
            ? new ReflectionMethod($func[0], $func[1])
            : new ReflectionFunction(\Closure::fromCallable($func)));

    $originalDoc = $ref->getDocComment() ?: '';

    $wrapper = static function (...$args) use ($func, $originalDoc): string {
        echo "[wraps] original doc: " . trim($originalDoc) . PHP_EOL;
        return $func(...$args);
    };

    // 反射注解：把 doc comment 复制到 closure 上
    $r = new \ReflectionFunction($wrapper);
    $r->getDocComment();   // 读不到时主动写
    // PHP 无法给 Closure 动态写 doc comment，但可以打包到对象中返回

    return new class($wrapper, $originalDoc) {
        public function __construct(
            private $callable,
            public readonly string $originalDoc,
        ) {}

        public function __invoke(...$args)
        {
            echo "[wraps] original doc: " . trim($this->originalDoc) . PHP_EOL;
            return ($this->callable)(...$args);
        }
    };
}

$wrapped = logger('Examples\\Decorator\\FromPython\\greet');
echo $wrapped('PHP') . PHP_EOL;
// [wraps] original doc: 打招呼
// Hello, PHP
