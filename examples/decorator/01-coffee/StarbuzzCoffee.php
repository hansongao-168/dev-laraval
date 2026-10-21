<?php

declare(strict_types=1);

namespace Examples\Decorator\Coffee;

require_once __DIR__ . '/Beverage.php';
require_once __DIR__ . '/CondimentDecorator.php';
require_once __DIR__ . '/Espresso.php';
require_once __DIR__ . '/HouseBlend.php';
require_once __DIR__ . '/Mocha.php';
require_once __DIR__ . '/Whip.php';
require_once __DIR__ . '/Soy.php';

/**
 * 客户端：点单系统.
 *
 * 输出：
 *   Espresso, Mocha, Whip  $26
 *   House Blend Coffee, Soy, Mocha, Whip  $24
 */
class StarbuzzCoffee
{
    public static function main(): void
    {
        // 下单 1: 浓缩咖啡 + 摩卡 + 奶泡
        $order1 = new Whip(new Mocha(new Espresso()));
        echo $order1->getDescription() . ' $' . $order1->cost() . PHP_EOL;

        // 下单 2: 综合咖啡 + 豆浆 + 摩卡 + 奶泡
        $order2 = new Whip(new Mocha(new Soy(new HouseBlend())));
        echo $order2->getDescription() . ' $' . $order2->cost() . PHP_EOL;
    }
}

StarbuzzCoffee::main();
