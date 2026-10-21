<?php

declare(strict_types=1);

namespace Examples\Decorator\Coffee;

/**
 * 具体装饰器：摩卡.
 */
class Mocha extends CondimentDecorator
{
    public function getDescription(): string
    {
        return $this->beverage->getDescription() . ', Mocha';
    }

    public function cost(): float
    {
        return $this->beverage->cost() + 5.0;
    }
}
