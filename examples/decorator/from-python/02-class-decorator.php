<?php

declare(strict_types=1);

namespace Examples\Decorator\FromPython;

/**
 * 示例 2: 类装饰器（最经典形态）
 *
 * Python 等价:
 *   class Coffee:
 *       def cost(self): return 10
 *       def desc(self): return "Coffee"
 *
 *   class Mocha:
 *       def __init__(self, beverage): self.beverage = beverage
 *       def cost(self): return self.beverage.cost() + 5
 *       def desc(self): return self.beverage.desc() + ", Mocha"
 */

interface Beverage
{
    public function desc(): string;
    public function cost(): float;
}

class Coffee implements Beverage
{
    public function desc(): string { return 'Coffee'; }
    public function cost(): float { return 10.0; }
}

abstract class Condiment implements Beverage
{
    public function __construct(protected Beverage $beverage) {}
    abstract public function desc(): string;
}

class Mocha extends Condiment
{
    public function desc(): string { return $this->beverage->desc() . ', Mocha'; }
    public function cost(): float { return $this->beverage->cost() + 5.0; }
}

class Whip extends Condiment
{
    public function desc(): string { return $this->beverage->desc() . ', Whip'; }
    public function cost(): float { return $this->beverage->cost() + 3.0; }
}

// ---------- 使用 ----------
$order = new Whip(new Mocha(new Coffee()));
echo $order->desc() . ' $' . $order->cost() . PHP_EOL;
// Coffee, Mocha, Whip $18
