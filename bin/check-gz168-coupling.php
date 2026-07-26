<?php

/**
 * Verify that no gz168 module source code references the host application's
 * App\ namespace, hardcodes App\Models\User, or uses app_path('Filament/...).
 *
 * Run from CI: php bin/check-gz168-coupling.php
 * Exits 0 on success, 1 when violations are found.
 */

$rootPath = dirname(__DIR__);
$modulesRoot = $rootPath.'/gz168';

if (! is_dir($modulesRoot)) {
    echo "ℹ gz168 directory not present — nothing to check.\n";
    exit(0);
}

$violations = [];

// Patterns considered reverse dependencies (already wrapped in delimiters)
$patterns = [
    '/^use\s+App\\\\/'           => 'uses host App\\ namespace',
    '/app_path\([\'"]Filament/' => "calls app_path('Filament/...')",
    '/\\\\App\\\\Models\\\\User::class/' => 'hard-codes \\App\\Models\\User::class',
    '/\'App\\\\\\\\Models\\\\\\\\User\'/' => "string literal 'App\\\\Models\\\\User'",
];

$checked = 0;

foreach (new DirectoryIterator($modulesRoot) as $moduleDir) {
    if ($moduleDir->isDot() || ! $moduleDir->isDir()) {
        continue;
    }

    $srcDir = $moduleDir->getPathname().'/src';
    if (! is_dir($srcDir)) {
        continue;
    }

    // Skip the AppDependencyChecker itself — that file references the
    // pattern string "App\\" as a regex to *detect* violations, not as
    // an actual class import.
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($srcDir, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::SELF_FIRST
    );

    foreach ($iterator as $file) {
        if ($file->getExtension() !== 'php') {
            continue;
        }

        // Skip the AppDependencyChecker tooling file in module-core
        if (str_ends_with($file->getPathname(), 'AppDependencyChecker.php')) {
            continue;
        }

        $checked++;
        $content = file_get_contents($file->getPathname());
        $relativePath = str_replace($rootPath.'/', '', $file->getPathname());

        foreach ($patterns as $pattern => $description) {
            if (preg_match($pattern, $content)) {
                $violations[] = sprintf('  - %s [%s]', $relativePath, $description);
            }
        }
    }
}

if ($violations === []) {
    echo "✅ gz168 has zero coupling with main app (checked {$checked} files)\n";
    exit(0);
}

echo "❌ Found ".count($violations)." coupling violation(s):\n";
foreach ($violations as $v) {
    echo $v."\n";
}
echo "\nFix these before merging.\n";
exit(1);