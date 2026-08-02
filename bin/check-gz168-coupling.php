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
    '/^use\s+App\\\\/' => 'uses host App\\ namespace',
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

$packages = [];
$namespacePackages = [];

foreach (glob($modulesRoot.'/*/composer.json') as $composerPath) {
    $composer = json_decode(file_get_contents($composerPath), true, 512, JSON_THROW_ON_ERROR);
    $packageName = $composer['name'] ?? null;

    if (! is_string($packageName) || ! str_starts_with($packageName, 'gz168/')) {
        $violations[] = sprintf('  - %s [missing a valid gz168 package name]', str_replace($rootPath.'/', '', $composerPath));

        continue;
    }

    $modulePath = dirname($composerPath);
    $manifestPath = $modulePath.'/module.json';
    $manifest = is_file($manifestPath)
        ? json_decode(file_get_contents($manifestPath), true, 512, JSON_THROW_ON_ERROR)
        : [];
    $composerDependencies = array_values(array_filter(
        array_keys($composer['require'] ?? []),
        fn (string $dependency): bool => str_starts_with($dependency, 'gz168/'),
    ));
    $manifestDependencies = $manifest['requires'] ?? [];
    sort($composerDependencies);
    sort($manifestDependencies);

    if ($composerDependencies !== $manifestDependencies) {
        $violations[] = sprintf(
            '  - %s [composer require and module.json requires differ]',
            str_replace($rootPath.'/', '', $modulePath),
        );
    }

    $packages[$packageName] = [
        'path' => $modulePath,
        'dependencies' => $composerDependencies,
    ];

    foreach (array_keys($composer['autoload']['psr-4'] ?? []) as $namespace) {
        if (preg_match('/^Gz168\\\\[A-Za-z][A-Za-z0-9]*\\\\$/', $namespace) === 1) {
            $namespacePackages[$namespace] = $packageName;
        }
    }
}

foreach ($packages as $packageName => $package) {
    foreach ($package['dependencies'] as $dependency) {
        if (! isset($packages[$dependency])) {
            $violations[] = sprintf('  - %s [depends on unknown package %s]', $packageName, $dependency);
        }
    }

    $sourcePath = $package['path'].'/src';
    if (! is_dir($sourcePath)) {
        continue;
    }

    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($sourcePath, FilesystemIterator::SKIP_DOTS),
    );

    foreach ($iterator as $file) {
        if ($file->getExtension() !== 'php') {
            continue;
        }

        $content = file_get_contents($file->getPathname());
        foreach ($namespacePackages as $namespace => $referencedPackage) {
            if ($referencedPackage !== $packageName
                && str_contains($content, $namespace)
                && ! in_array($referencedPackage, $package['dependencies'], true)) {
                $violations[] = sprintf(
                    '  - %s [references %s without declaring it]',
                    str_replace($rootPath.'/', '', $file->getPathname()),
                    $referencedPackage,
                );
            }
        }
    }
}

$visited = [];
$visiting = [];
$visit = function (string $packageName, array $path = []) use (&$visit, &$visited, &$visiting, &$violations, $packages): void {
    if (isset($visited[$packageName])) {
        return;
    }

    if (isset($visiting[$packageName])) {
        $cycleStart = array_search($packageName, $path, true);
        $cycle = array_slice($path, $cycleStart === false ? 0 : $cycleStart);
        $cycle[] = $packageName;
        $violations[] = sprintf('  - %s [cyclic module dependency]', implode(' -> ', $cycle));

        return;
    }

    $visiting[$packageName] = true;
    $path[] = $packageName;

    foreach ($packages[$packageName]['dependencies'] ?? [] as $dependency) {
        if (isset($packages[$dependency])) {
            $visit($dependency, $path);
        }
    }

    unset($visiting[$packageName]);
    $visited[$packageName] = true;
};

foreach (array_keys($packages) as $packageName) {
    $visit($packageName);
}

if ($violations === []) {
    echo "✅ gz168 dependency boundaries are valid (checked {$checked} files and ".count($packages)." modules)\n";
    exit(0);
}

echo '❌ Found '.count($violations)." coupling violation(s):\n";
foreach ($violations as $v) {
    echo $v."\n";
}
echo "\nFix these before merging.\n";
exit(1);
