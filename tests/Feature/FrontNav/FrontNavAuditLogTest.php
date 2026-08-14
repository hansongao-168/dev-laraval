<?php

declare(strict_types=1);

namespace Tests\Feature\FrontNav;

use Gz168\Common\Services\LoggerService;
use Gz168\FrontNav\Contracts\NavItem;
use Gz168\FrontNav\Contracts\NavLocation;
use Gz168\FrontNav\Contracts\NavRegistry;
use Gz168\FrontNav\Shared\Events\NavStructureChanged;
use Psr\Log\LoggerInterface;
use Tests\TestCase;

/**
 * Verify the M2 audit-log contract:
 *
 *   1. Registering a NavItem, then dispatching NavStructureChanged, makes
 *      the gz168/common LoggerService log an "info" entry with the
 *      current registry snapshot.
 *
 *   2. When LoggerService is NOT bound (host without gz168/common),
 *      the listener still works — falling back to the host PSR logger.
 */
final class FrontNavAuditLogTest extends TestCase
{
    public function test_logger_service_receives_info_on_structure_change(): void
    {
        /** @var NavRegistry $registry */
        $registry = $this->app->make(NavRegistry::class);

        // Replace the LoggerService with a spy so we can assert without
        // touching the real log driver.
        $spy = $this->createMock(LoggerService::class);
        $spy->expects($this->once())
            ->method('info')
            ->with(
                'gz168/front-nav: NavStructureChanged',
                $this->callback(fn (array $ctx): bool => isset($ctx['groups'], $ctx['signature'])),
            );
        $this->app->instance(LoggerService::class, $spy);

        // Wire a test-only item.
        $registry->group('audit-test', function ($r): void {
            $r->add(new NavItem('audit.x', 'X', NavLocation::Sidebar, '/x'));
        });
        $registry->flush();

        NavStructureChanged::dispatch();
    }

    public function test_listener_works_without_logger_service_bound(): void
    {
        // Drop the binding entirely to simulate a host that hasn't pulled in gz168/common.
        $this->app->offsetUnset(LoggerService::class);

        $psr = $this->createMock(LoggerInterface::class);
        $psr->expects($this->once())
            ->method('info')
            ->with('gz168/front-nav: NavStructureChanged', $this->isArray());
        $this->app->instance(LoggerInterface::class, $psr);

        // Dispatching must not throw.
        NavStructureChanged::dispatch();
    }
}
