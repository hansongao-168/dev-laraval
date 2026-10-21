<?php

declare(strict_types=1);

namespace Examples\Decorator\FromPython;

use Attribute;

/**
 * 示例 7: PHP 8 Attribute —— "装饰器" 的另一种实现
 *
 * Python 没有内建的"装饰器声明标记"，需要靠语法糖 @xxx。
 * PHP 8 引入 Attribute，可以用 #[Logger] 直接"标注"函数/方法。
 * 运行时通过反射读取并实例化装饰器（这就是 PHP 的"装饰器运行时"）。
 */

#[Attribute(Attribute::TARGET_FUNCTION | Attribute::TARGET_METHOD)]
class Logger
{
    public function __construct(public string $prefix = '[LOG]') {}
}

#[Attribute(Attribute::TARGET_FUNCTION | Attribute::TARGET_METHOD)]
class Timer
{
    public function __construct(public bool $enabled = true) {}
}

/**
 * 模拟"被装饰"的业务方法
 */
#[Logger(prefix: '[USER]')]
#[Timer]
class UserService
{
    public function create(string $name): array
    {
        return ['name' => $name, 'created_at' => date('c')];
    }
}

/**
 * 装饰器调度器：用反射自动应用所有标注的装饰器
 */
final class DecoratorRunner
{
    public static function run(object $obj, string $method, array $args): mixed
    {
        $ref = new \ReflectionMethod($obj, $method);
        $callable = $obj->{$method}(...);   // 原函数

        // 从内向外应用装饰器
        foreach (array_reverse($ref->getAttributes()) as $attr) {
            $decorator = $attr->newInstance();
            $callable = match (true) {
                $decorator instanceof Logger => static function (...$a) use ($callable, $decorator) {
                    echo "{$decorator->prefix} enter" . PHP_EOL;
                    $r = $callable(...$a);
                    echo "{$decorator->prefix} exit" . PHP_EOL;
                    return $r;
                },
                $decorator instanceof Timer => static function (...$a) use ($callable, $decorator) {
                    if (!$decorator->enabled) {
                        return $callable(...$a);
                    }
                    $start = microtime(true);
                    $r = $callable(...$a);
                    echo "[TIMER] " . round((microtime(true) - $start) * 1000, 3) . "ms" . PHP_EOL;
                    return $r;
                },
            };
        }

        return $callable(...$args);
    }
}

// ---------- 使用 ----------
$svc = new UserService();
$result = DecoratorRunner::run($svc, 'create', ['Alice']);
// [USER] enter
// [TIMER] 0.xxx ms
// [USER] exit
print_r($result);
