<?php

declare(strict_types=1);

namespace Examples\Decorator\Coffee;

/**
 * 具体装饰器：奶泡.
 */
class Whip extends CondimentDecorator
{
    public function getDescription(): string
    {
        return $this->beverage->getDescription() . ', Whip';
    }

    public function cost(): float
    {
        return $this->beverage->cost() + 3.0;
    }
}
