<?php

declare(strict_types=1);

namespace Examples\Decorator\Coffee;

/**
 * 具体装饰器：豆浆.
 */
class Soy extends CondimentDecorator
{
    public function getDescription(): string
    {
        return $this->beverage->getDescription() . ', Soy';
    }

    public function cost(): float
    {
        return $this->beverage->cost() + 4.0;
    }
}
