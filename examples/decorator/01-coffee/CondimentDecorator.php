<?php

declare(strict_types=1);

namespace Examples\Decorator\Coffee;

/**
 * 抽象装饰器：调料装饰器
 * 所有具体调料（摩卡、奶泡等）都继承自它。
 */
abstract class CondimentDecorator implements Beverage
{
    /**
     * 持有被装饰的饮料对象.
     */
    public function __construct(protected Beverage $beverage)
    {
    }

    /**
     * 抽象方法：每个调料都有自己的描述.
     */
    abstract public function getDescription(): string;
}
