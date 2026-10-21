<?php

declare(strict_types=1);

namespace Examples\Decorator\FromPython;

/**
 * 示例 12: @abc.abstractmethod → PHP 抽象方法
 *
 * Python 等价:
 *   import abc
 *
 *   class Shape(abc.ABC):
 *       @abc.abstractmethod
 *       def area(self): ...
 *
 * PHP 用 abstract 关键字原生支持，无需装饰。
 */

interface Shape
{
    public function area(): float;
}

class Square implements Shape
{
    public function __construct(public float $side) {}
    public function area(): float { return $this->side ** 2; }
}

class Circle implements Shape
{
    public function __construct(public float $r) {}
    public function area(): float { return M_PI * $this->r ** 2; }
}

$shapes = [new Square(3), new Circle(5)];
foreach ($shapes as $s) {
    echo get_class($s) . ' area = ' . $s->area() . PHP_EOL;
}
// Square area = 9
// Circle area = 78.5398...
