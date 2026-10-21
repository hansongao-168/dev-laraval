<?php

declare(strict_types=1);

namespace Examples\Decorator\FromPython;

/**
 * 示例 8: @property 装饰器 → PHP readonly 属性
 *
 * Python 等价:
 *   class Circle:
 *       def __init__(self, r): self._r = r
 *       @property
 *       def area(self): return 3.14 * self._r ** 2
 *
 * PHP 8.1+ readonly / PHP 8.2+ readonly class 都是"装饰数据"的官方手段。
 */

final class Circle
{
    public function __construct(public readonly float $r) {}

    public function area(): float
    {
        return 3.14 * $this->r ** 2;
    }
}

$c = new Circle(5.0);
echo "r = {$c->r}, area = {$c->area()}" . PHP_EOL;
// r = 5, area = 78.5
