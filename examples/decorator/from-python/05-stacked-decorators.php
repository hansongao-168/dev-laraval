<?php

declare(strict_types=1);

namespace Examples\Decorator\FromPython;

/**
 * 示例 5: 多个装饰器叠加（洋葱模型）
 *
 * Python 等价:
 *   @logger
 *   @timer
 *   @repeat(2)
 *   def work():
 *       print("working")
 *
 * PHP: 通过嵌套调用实现，外层先进入，后退出。
 */

function logger(callable $func): callable
{
    return static function (...$args) use ($func) {
        echo "[logger] enter" . PHP_EOL;
        $r = $func(...$args);
        echo "[logger] exit" . PHP_EOL;
        return $r;
    };
}

function timer(callable $func): callable
{
    return static function (...$args) use ($func) {
        $start = microtime(true);
        $r = $func(...$args);
        echo "[timer] " . round((microtime(true) - $start) * 1000, 3) . "ms" . PHP_EOL;
        return $r;
    };
}

function repeat(int $times): callable
{
    return static function (callable $func): callable {
        return static function (...$args) use ($func, $times) {
            $r = null;
            for ($i = 0; $i < $times; $i++) {
                $r = $func(...$args);
            }
            return $r;
        };
    };
}

function work(): string
{
    echo "  working..." . PHP_EOL;
    return "result";
}

// 等价于 Python 的 @logger @timer @repeat(2)
$decorated = logger(timer(repeat(2)('Examples\\Decorator\\FromPython\\work')));
$decorated();
// [logger] enter
// [timer] 0.xxx ms
//   working...
//   working...
// [logger] exit
