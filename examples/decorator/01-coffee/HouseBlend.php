<?php

declare(strict_types=1);

namespace Examples\Decorator\Coffee;

/**
 * 具体构件：综合咖啡.
 */
class HouseBlend implements Beverage
{
    public function getDescription(): string
    {
        return 'House Blend Coffee';
    }

    public function cost(): float
    {
        return 12.0;
    }
}
