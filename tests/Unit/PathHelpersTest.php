<?php

declare(strict_types=1);

namespace Tests\Unit;

use Gz168\Common\Support\PathHelpers;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PathHelpersTest extends TestCase
{
    #[Test]
    public function modules_root_resolves_relative_config_against_base_path(): void
    {
        config(['module-core.modules_path' => 'gz168']);

        $this->assertSame(base_path('gz168'), PathHelpers::modulesRoot());
    }

    #[Test]
    public function modules_root_keeps_absolute_paths(): void
    {
        $absolute = base_path('gz168');
        config(['module-core.modules_path' => $absolute]);

        $this->assertSame($absolute, PathHelpers::modulesRoot());
    }
}
