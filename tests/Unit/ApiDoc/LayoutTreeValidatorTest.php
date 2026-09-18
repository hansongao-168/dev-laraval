<?php

declare(strict_types=1);

namespace Tests\Unit\ApiDoc;

use Gz168\ApiDoc\Layout\LayoutTreeDefaults;
use Gz168\ApiDoc\Layout\LayoutTreeValidator;
use InvalidArgumentException;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class LayoutTreeValidatorTest extends TestCase
{
    #[Test]
    public function accepts_default_tree(): void
    {
        $v = app(LayoutTreeValidator::class)->validate(LayoutTreeDefaults::tree());
        $this->assertSame(1, $v['version']);
        $this->assertCount(7, $v['nodes']);
    }

    #[Test]
    public function rejects_missing_part(): void
    {
        $tree = LayoutTreeDefaults::tree();
        array_pop($tree['nodes']);
        $this->expectException(InvalidArgumentException::class);
        app(LayoutTreeValidator::class)->validate($tree);
    }

    #[Test]
    public function rejects_unknown_part(): void
    {
        $tree = LayoutTreeDefaults::tree();
        $tree['nodes'][0]['part'] = 'panel';
        $this->expectException(InvalidArgumentException::class);
        app(LayoutTreeValidator::class)->validate($tree);
    }
}
