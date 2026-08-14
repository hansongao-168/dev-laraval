<?php
declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

echo "=== gz168/Customer boundary verification ===\n\n";

$root = __DIR__ . '/../gz168/Customer/src';

// 1. SubtreeDependencyDirection
echo "--- SubtreeDependencyDirection ---\n";
$violations = [];

foreach (glob("$root/Admin/**/*.php") as $f) {
    $c = file_get_contents($f);
    if (str_contains($c, 'use Gz168\\Customer\\Front\\')) {
        $violations[] = "$f imports Front";
    }
}

foreach (glob("$root/Shared/**/*.php") as $f) {
    $c = file_get_contents($f);
    if (str_contains($c, 'use Gz168\\Customer\\Front\\')
        || str_contains($c, 'use Gz168\\Customer\\Admin\\')) {
        $violations[] = "$f imports Front/Admin";
    }
}

echo "Admin imports Front: " . (empty(array_filter($violations, fn ($v) => str_contains($v, '/Admin/'))) ? "PASS" : "FAIL") . "\n";
echo "Shared imports Front/Admin: " . (empty(array_filter($violations, fn ($v) => str_contains($v, '/Shared/'))) ? "PASS" : "FAIL") . "\n";
echo "  (any violations: " . count($violations) . ")\n\n";

// 2. ResourceFieldWhitelist
echo "--- ResourceFieldWhitelist ---\n";

function declaredFields(string $path): array {
    $src = file_get_contents($path);
    preg_match_all("/'([a-z_]+)'\s*=>\s*\\\$this->/s", $src, $m);
    return $m[1] ?? [];
}

$forbidden = ['password', 'remember_token', 'wx_openid', 'wx_unionid'];
$adminOnly = ['banned_at', 'banned_reason', 'last_login_at', 'last_login_ip'];

$frontFields = declaredFields("$root/Front/Http/Resources/CustomerResource.php");
$adminFields = declaredFields("$root/Admin/Http/Resources/AdminCustomerResource.php");

$frontForbidden = array_intersect($forbidden, $frontFields);
$frontAdminOnly = array_intersect($adminOnly, $frontFields);
$adminForbidden = array_intersect($forbidden, $adminFields);

echo "Front CustomerResource fields: " . implode(',', $frontFields) . "\n";
echo "Front forbidden leak: " . (empty($frontForbidden) ? 'PASS' : 'FAIL ' . implode(',', $frontForbidden)) . "\n";
echo "Front admin-only leak: " . (empty($frontAdminOnly) ? 'PASS' : 'FAIL ' . implode(',', $frontAdminOnly)) . "\n";

echo "Admin AdminCustomerResource fields: " . implode(',', $adminFields) . "\n";
echo "Admin forbidden leak: " . (empty($adminForbidden) ? 'PASS' : 'FAIL ' . implode(',', $adminForbidden)) . "\n\n";

// 3. AdminEnabledFlag
echo "--- AdminEnabledFlag (static route inspection) ---\n";
$routesAdmin = shell_exec('php artisan route:list --name=admin/customers 2>&1');
$hasAdmin = (bool) preg_match('/admin\/customers/', $routesAdmin);
echo "customer.admin.enabled = false: " . ($hasAdmin ? "FAIL (admin routes present)" : "PASS (no admin routes)") . "\n";

// 4. BoundaryTest (host project污染检查)
echo "\n--- BoundaryTest (host project pollution) ---\n";
$hostAppFiles = glob(__DIR__ . '/../app/Models/Customer.php')
    + glob(__DIR__ . '/../app/Http/Controllers/Api/*Customer*')
    + glob(__DIR__ . '/../app/Filament/Resources/*Customer*')
    + glob(__DIR__ . '/../database/migrations/*create_customers*');
$violations = array_merge([], ...array_filter($hostAppFiles, fn ($x) => ! empty($x)));
echo "Host app/Models/Customer.php: " . (file_exists(__DIR__ . '/../app/Models/Customer.php') ? 'FAIL exists' : 'PASS none') . "\n";
echo "Host app/Http/Controllers/Api/*Customer*: " . (empty(glob(__DIR__ . '/../app/Http/Controllers/Api/*Customer*')) ? 'PASS none' : 'FAIL exists') . "\n";
echo "Host app/Filament/Resources/*Customer*: " . (empty(glob(__DIR__ . '/../app/Filament/Resources/*Customer*')) ? 'PASS none' : 'FAIL exists') . "\n";
echo "Host database/migrations/*create_customers*: " . (empty(glob(__DIR__ . '/../database/migrations/*create_customers*')) ? 'PASS none' : 'FAIL exists') . "\n";

echo "\n=== ALL CHECKS COMPLETE ===\n";