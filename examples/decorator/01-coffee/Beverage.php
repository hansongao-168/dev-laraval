<?php

declare(strict_types=1);

namespace Examples\Decorator\Coffee;

/**
 * 抽象构件：饮料接口
 * 所有饮料和装饰器都要实现这个接口。
 */
interface Beverage
{
    /**
     * 饮料描述.
     */
    public function getDescription(): string;

    /**
     * 计算价格.
     */
    public function cost(): float;
}
