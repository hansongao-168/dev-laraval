<?php

declare(strict_types=1);

namespace Examples\Decorator\Coffee;

/**
 * 具体构件：浓缩咖啡.
 */
class Espresso implements Beverage
{
    public function getDescription(): string
    {
        return 'Espresso';
    }

    public function cost(): float
    {
        return 18.0;
    }
}
