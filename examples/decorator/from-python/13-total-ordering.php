<?php

declare(strict_types=1);

namespace Examples\Decorator\FromPython;

/**
 * 示例 13: @total_ordering → PHP Comparable 接口
 *
 * Python 等价:
 *   import functools
 *   @functools.total_ordering
 *   class Version:
 *       def __init__(self, s): self.v = tuple(map(int, s.split('.')))
 *       def __eq__(self, o): return self.v == o.v
 *       def __lt__(self, o): return self.v < o.v
 *
 * PHP: 在 compareTo 里实现一次比较，由 spaceship 运算符 <=> 补全其他运算符。
 */

final class Version implements \Stringable
{
    /** @param int[] $parts */
    public function __construct(public readonly array $parts)
    {
    }

    public static function of(string $s): self
    {
        return new self(array_map('intval', explode('.', $s)));
    }

    /** spaceship 运算符：-1 / 0 / 1 */
    public function compareTo(self $other): int
    {
        return $this->parts <=> $other->parts;
    }

    // 由 compareTo 自动派生其他比较方法
    public function equals(self $o): bool     { return $this->compareTo($o) === 0; }
    public function lessThan(self $o): bool   { return $this->compareTo($o) < 0; }
    public function greaterThan(self $o): bool{ return $this->compareTo($o) > 0; }

    public function __toString(): string
    {
        return implode('.', $this->parts);
    }
}

$a = Version::of('1.2.10');
$b = Version::of('1.10.2');
echo "{$a} < {$b} ? " . ($a->lessThan($b) ? 'yes' : 'no') . PHP_EOL;   // yes
echo "{$a} > {$b} ? " . ($a->greaterThan($b) ? 'yes' : 'no') . PHP_EOL; // no
