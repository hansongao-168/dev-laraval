<?php

declare(strict_types=1);

/**
 * 装饰模式实战精讲（PHP 版）
 *
 * 示例 2（p.195）：价格计算器
 * 演示如何把一段臃肿的 if-else 计算逻辑，重构为装饰器链。
 *
 * 原 Python 代码：
 *
 *   from abc import ABC, abstractmethod
 *
 *   # Component
 *   class PriceCalculator(ABC):
 *       @abstractmethod
 *       def calculate(self, order) -> float: ...
 *
 *   # 基础实现
 *   class BasePriceCalculator(PriceCalculator):
 *       def calculate(self, order):
 *           return sum(i.unit_price * i.quantity for i in order.items)
 *
 *   # 装饰器基类
 *   class PriceDecorator(PriceCalculator):
 *       def __init__(self, wrapped: PriceCalculator): self._wrapped = wrapped
 *       def calculate(self, order): return self._wrapped.calculate(order)
 *
 *   # 4 个具体装饰器
 *   class VIPDiscountDecorator(PriceDecorator):
 *       def calculate(self, order):
 *           base = super().calculate(order)
 *           return base * 0.9 if order.user.is_vip else base
 *
 *   class CouponDecorator(PriceDecorator):
 *       def calculate(self, order):
 *           base = super().calculate(order)
 *           if not order.coupon: return base
 *           if order.coupon.type == 'fixed': return base - order.coupon.value
 *           if order.coupon.type == 'percent': return base * (1 - order.coupon.value/100)
 *           return base
 *
 *   class FullReductionDecorator(PriceDecorator):
 *       def calculate(self, order):
 *           base = super().calculate(order)
 *           return base - 30 if base >= 300 else base
 *
 *   class ShippingDecorator(PriceDecorator):
 *       def calculate(self, order):
 *           base = super().calculate(order)
 *           ship = 12 if base < 99 else 0
 *           if order.user.is_remote: ship += 25
 *           return base + ship
 *
 *   # 工厂函数
 *   def build_calculator(order, ctx) -> PriceCalculator:
 *       calc = BasePriceCalculator()
 *       if ctx.get('enable_member'):
 *           if order.user.is_vip: calc = VIPDiscountDecorator(calc)
 *       if order.coupon: calc = CouponDecorator(calc)
 *       if ctx.get('enable_full_reduction'): calc = FullReductionDecorator(calc)
 *       if ctx.get('include_shipping'): calc = ShippingDecorator(calc)
 *       return calc
 */

namespace Examples\Decorator\FromPdf;

/* ============================================================
 * 模拟领域模型（Python 原代码里 order / user / coupon 是隐式类）
 * 这里用 PHP 类显式定义，类型对应更清晰
 * ============================================================ */
final class OrderItem
{
    public function __construct(
        public readonly string $name,
        public readonly float $unitPrice,
        public readonly int $quantity,
    ) {}
}

final class User
{
    public function __construct(
        public readonly string $name,
        public readonly bool $isVip = false,
        public readonly bool $isRemote = false,
    ) {}
}

final class Coupon
{
    public const TYPE_FIXED = 'fixed';
    public const TYPE_PERCENT = 'percent';

    public function __construct(
        public readonly string $type,
        public readonly float $value,
    ) {}
}

final class Order
{
    /**
     * @param OrderItem[] $items
     */
    public function __construct(
        public readonly array $items,
        public readonly User $user,
        public readonly ?Coupon $coupon = null,
    ) {}
}

/* ============================================================
 * 抽象构件：PriceCalculator（对应 Python class PriceCalculator(ABC)）
 * ============================================================ */
interface PriceCalculator
{
    public function calculate(Order $order): float;
}

/* ============================================================
 * 具体构件：BasePriceCalculator（对应 Python class BasePriceCalculator）
 * ============================================================ */
final class BasePriceCalculator implements PriceCalculator
{
    public function calculate(Order $order): float
    {
        // 对应 Python: sum(i.unit_price * i.quantity for i in order.items)
        $total = 0.0;
        foreach ($order->items as $item) {
            $total += $item->unitPrice * $item->quantity;
        }
        return $total;
    }
}

/* ============================================================
 * 装饰器基类：PriceDecorator（对应 Python class PriceDecorator(PriceCalculator)）
 * ============================================================ */
abstract class PriceDecorator implements PriceCalculator
{
    public function __construct(protected PriceCalculator $wrapped) {}

    // 默认透传给被装饰对象
    public function calculate(Order $order): float
    {
        return $this->wrapped->calculate($order);
    }
}

/* ============================================================
 * 具体装饰器 1：VIPDiscountDecorator（VIP 9 折）
 * 对应 Python 同名类
 * ============================================================ */
final class VIPDiscountDecorator extends PriceDecorator
{
    public function calculate(Order $order): float
    {
        // 对应 Python: base = super().calculate(order); return base * 0.9 if is_vip else base
        $base = parent::calculate($order);
        return $order->user->isVip ? $base * 0.9 : $base;
    }
}

/* ============================================================
 * 具体装饰器 2：CouponDecorator（优惠券）
 * 对应 Python 同名类
 * ============================================================ */
final class CouponDecorator extends PriceDecorator
{
    public function calculate(Order $order): float
    {
        // 对应 Python:
        //   base = super().calculate(order)
        //   if not order.coupon: return base
        //   if order.coupon.type == 'fixed': return base - order.coupon.value
        //   if order.coupon.type == 'percent': return base * (1 - order.coupon.value/100)
        //   return base
        $base = parent::calculate($order);
        if ($order->coupon === null) {
            return $base;
        }
        return match ($order->coupon->type) {
            Coupon::TYPE_FIXED   => $base - $order->coupon->value,
            Coupon::TYPE_PERCENT => $base * (1 - $order->coupon->value / 100),
            default              => $base,
        };
    }
}

/* ============================================================
 * 具体装饰器 3：FullReductionDecorator（满 300 减 30）
 * 对应 Python 同名类
 * ============================================================ */
final class FullReductionDecorator extends PriceDecorator
{
    public function calculate(Order $order): float
    {
        // 对应 Python: base = super().calculate(order); return base - 30 if base >= 300 else base
        $base = parent::calculate($order);
        return $base >= 300 ? $base - 30 : $base;
    }
}

/* ============================================================
 * 具体装饰器 4：ShippingDecorator（运费）
 * 对应 Python 同名类
 * ============================================================ */
final class ShippingDecorator extends PriceDecorator
{
    public function calculate(Order $order): float
    {
        // 对应 Python:
        //   base = super().calculate(order)
        //   ship = 12 if base < 99 else 0
        //   if order.user.is_remote: ship += 25
        //   return base + ship
        $base  = parent::calculate($order);
        $ship  = $base < 99 ? 12 : 0;
        if ($order->user->isRemote) {
            $ship += 25;
        }
        return $base + $ship;
    }
}

/* ============================================================
 * 工厂函数：build_calculator（对应 Python 同名函数）
 *
 * 注意 Python 的 ctx.get('key') 是 dict，PHP 这里用关联数组模拟
 * ============================================================ */

/**
 * @param array<string, bool> $ctx
 */
function buildCalculator(Order $order, array $ctx): PriceCalculator
{
    // 对应 Python: calc = BasePriceCalculator()
    $calc = new BasePriceCalculator();

    // 对应 Python:
    //   if ctx.get('enable_member'):
    //       if order.user.is_vip: calc = VIPDiscountDecorator(calc)
    if (($ctx['enable_member'] ?? false) && $order->user->isVip) {
        $calc = new VIPDiscountDecorator($calc);
    }

    // 对应 Python: if order.coupon: calc = CouponDecorator(calc)
    if ($order->coupon !== null) {
        $calc = new CouponDecorator($calc);
    }

    // 对应 Python: if ctx.get('enable_full_reduction'): calc = FullReductionDecorator(calc)
    if ($ctx['enable_full_reduction'] ?? false) {
        $calc = new FullReductionDecorator($calc);
    }

    // 对应 Python: if ctx.get('include_shipping'): calc = ShippingDecorator(calc)
    if ($ctx['include_shipping'] ?? false) {
        $calc = new ShippingDecorator($calc);
    }

    return $calc;
}

/* ============================================================
 * 演示：构造一个 VIP + 满减 + 运费的订单，看装饰链效果
 * ============================================================ */
function main(): void
{
    $order = new Order(
        items: [
            new OrderItem('商品A', unitPrice: 100.0, quantity: 2),  // 200
            new OrderItem('商品B', unitPrice:  80.0, quantity: 2),  // 160 → 合计 360
        ],
        user: new User(name: 'Alice', isVip: true, isRemote: false),
        coupon: new Coupon(type: Coupon::TYPE_FIXED, value: 20),
    );

    // 开启：VIP 折扣 + 优惠券 + 满减 + 运费
    $ctx = [
        'enable_member'        => true,
        'enable_full_reduction' => true,
        'include_shipping'      => true,
    ];

    $calc = buildCalculator($order, $ctx);
    $total = $calc->calculate($order);

    echo "订单总价: ¥{$total}" . PHP_EOL;
    // 预期: 360 * 0.9 = 324 → -20 券 = 304 → -30 满减 = 274 → 274<99?12:0 = 286
}

main();
