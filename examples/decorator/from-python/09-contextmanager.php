<?php

declare(strict_types=1);

namespace Examples\Decorator\FromPython;

/**
 * 示例 9: @contextmanager → PHP try/finally 自动资源管理
 *
 * Python 等价:
 *   from contextlib import contextmanager
 *
 *   @contextmanager
 *   def timer():
 *       start = time.time()
 *       yield
 *       print(f"cost: {time.time() - start}s")
 *
 *   with timer():
 *       do_work()
 *
 * PHP: 借助 __destruct 或 try/finally 实现"进入/退出"装饰。
 */

final class TimerContext
{
    private float $start;
    private string $label;

    public function __construct(string $label = 'block')
    {
        $this->label = $label;
        $this->start = microtime(true);
    }

    public function __destruct()
    {
        $cost = microtime(true) - $this->start;
        echo "[{$this->label}] cost: " . round($cost * 1000, 3) . "ms" . PHP_EOL;
    }
}

function measure(string $label, callable $work): mixed
{
    $ctx = new TimerContext($label);   // 进入
    try {
        return $work();                // 业务
    } finally {
        unset($ctx);                   // 触发 __destruct → 退出装饰
    }
}

$result = measure('work', static function (): int {
    usleep(50_000);
    return 42;
});
// [work] cost: 50.xxx ms
echo "result = {$result}" . PHP_EOL;
