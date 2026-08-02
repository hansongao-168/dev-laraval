<?php

/**
 * Install gz168 modules into the current Laravel project.
 *
 * This script is a no-op when gz168 is already fully installed. It rewrites
 * composer.json to add the requested module path repositories and require
 * entries, sets GZ168_ENABLED=true in .env, and runs `composer update` so
 * Laravel auto-discovers the new Service Providers.
 *
 * Usage:
 *   php bin/install-gz168.php                              # default core set
 *   php bin/install-gz168.php module-core common            # specific modules
 *   php bin/install-gz168.php --interactive                 # pick from list
 *   php bin/install-gz168.php --all                        # everything on disk
 *   php bin/install-gz168.php --no-update                  # edit only, skip composer
 */
$rootPath = dirname(__DIR__);
$composerJsonPath = $rootPath.'/composer.json';
$envPath = $rootPath.'/.env';
$envExamplePath = $rootPath.'/.env.example';
$modulesRoot = $rootPath.'/gz168';

if (! is_dir($modulesRoot)) {
    fwrite(STDERR, "gz168 directory not found at {$modulesRoot}\n");
    exit(1);
}

// Discover available modules from the filesystem (folders that contain a composer.json)
$available = [];
foreach (new DirectoryIterator($modulesRoot) as $info) {
    if ($info->isDir() && ! $info->isDot()) {
        $name = $info->getFilename();
        $composerFile = $info->getPathname().'/composer.json';
        if (is_file($composerFile)) {
            $data = json_decode(file_get_contents($composerFile), true) ?: [];
            $composerName = $data['name'] ?? ('gz168/'.$name);
            $available[$composerName] = $name;
        }
    }
}
ksort($available);

// Default install set: prefer modules that opt-in via a `core` keyword in
// their composer.json. Falls back to a curated explicit list of folder
// names (PascalCase, matching the actual directories on disk).
$coreFolders = [];
foreach ($available as $composerName => $folder) {
    $data = json_decode(file_get_contents($modulesRoot.'/'.$folder.'/composer.json'), true) ?: [];
    if (in_array('core', $data['keywords'] ?? [], true)) {
        $coreFolders[] = $folder;
    }
}
sort($coreFolders);

$defaultInstall = $coreFolders !== []
    ? $coreFolders
    : ['module-core', 'common', 'ApiAuth', 'RolePermission', 'UserManagement',
        'ModuleSettings', 'Filament', 'ExtensionData', 'ExportManagement',
        'filament-admin'];

// Args parsing
$args = array_slice($argv, 1);
$interactive = in_array('--interactive', $args, true);
$all = in_array('--all', $args, true);
$noUpdate = in_array('--no-update', $args, true);
$args = array_values(array_filter($args, fn ($a) => ! in_array($a, ['--interactive', '--all', '--no-update'], true)));

if ($all) {
    $selected = array_values($available);
} elseif ($interactive) {
    $selected = askModules(array_values($available));
} elseif ($args !== []) {
    $selected = $args;
} else {
    $selected = $defaultInstall;
}

// Resolve each alias to its composer package name and path repository entry
$selectedPackages = [];
$queue = $selected;
$seen = [];

while ($queue !== []) {
    $alias = array_shift($queue);
    if (isset($seen[$alias])) {
        continue;
    }
    $seen[$alias] = true;

    $folder = $alias;
    if (! is_dir($modulesRoot.'/'.$folder)) {
        $found = array_search($alias, array_keys($available), true);
        if ($found !== false) {
            $folder = $available[$alias];
        } else {
            fwrite(STDERR, "Module [{$alias}] not found under gz168/\n");
            exit(1);
        }
    }

    $composerFile = $modulesRoot.'/'.$folder.'/composer.json';
    $data = json_decode(file_get_contents($composerFile), true);
    $packageName = $data['name'] ?? ('gz168/'.$folder);
    $selectedPackages[$packageName] = $folder;

    // Walk module.json's `requires` array — gz168 declares its intra-system
    // dependencies here rather than in composer.json, so we must read it
    // ourselves to pull in the full transitive set.
    $moduleJson = $modulesRoot.'/'.$folder.'/module.json';
    if (is_file($moduleJson)) {
        $moduleData = json_decode(file_get_contents($moduleJson), true) ?: [];
        foreach ($moduleData['requires'] ?? [] as $dep) {
            if (! isset($seen[$dep])) {
                $queue[] = $dep;
            }
        }
    }
}

// module-core is the runtime foundation of every gz168 module — any
// Filament Panel that touches ModuleScanner directly, plus every module
// service provider that registers via the loader, depends on it. Ensure
// it's always present in the resolved set.
$moduleCoreComposer = $modulesRoot.'/module-core/composer.json';
if (is_file($moduleCoreComposer)) {
    $mcData = json_decode(file_get_contents($moduleCoreComposer), true) ?: [];
    $mcName = $mcData['name'] ?? 'gz168/module-core';
    $selectedPackages[$mcName] = 'module-core';
}

// 1. Update composer.json
$composer = json_decode(file_get_contents($composerJsonPath), true);
$composer['require'] ??= [];
$composer['repositories'] ??= [];

$added = 0;
foreach ($selectedPackages as $packageName => $folder) {
    if (! array_key_exists($packageName, $composer['require'])) {
        $composer['require'][$packageName] = '@dev';
        $added++;
    }
    $repoKey = "gz168/{$folder}";
    $exists = false;
    foreach ($composer['repositories'] as $r) {
        if (($r['url'] ?? '') === $repoKey) {
            $exists = true;
            break;
        }
    }
    if (! $exists) {
        $composer['repositories'][] = ['type' => 'path', 'url' => $repoKey];
    }
}

// Sort require and repositories alphabetically for stability
ksort($composer['require']);
usort($composer['repositories'], fn ($a, $b) => strcmp($a['url'] ?? '', $b['url'] ?? ''));

file_put_contents(
    $composerJsonPath,
    json_encode($composer, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)."\n"
);

echo "✓ composer.json updated (added {$added} new require, ensured all path repositories)\n";

// 2. Update .env
$envContent = '';
if (is_file($envPath)) {
    $envContent = file_get_contents($envPath);
}

if (! str_contains($envContent, 'GZ168_ENABLED=')) {
    $envContent = rtrim($envContent)."\n\n# gz168 modules\nGZ168_ENABLED=true\nGZ168_MODULES_PATH=gz168\n";
    file_put_contents($envPath, $envContent);
    echo "✓ .env: GZ168_ENABLED=true added\n";
} elseif (! preg_match('/^GZ168_ENABLED=true/m', $envContent)) {
    $envContent = preg_replace('/^GZ168_ENABLED=.*/m', 'GZ168_ENABLED=true', $envContent);
    file_put_contents($envPath, $envContent);
    echo "✓ .env: GZ168_ENABLED=true set\n";
}

// Mirror to .env.example
if (is_file($envExamplePath)) {
    $envExample = file_get_contents($envExamplePath);
    if (! str_contains($envExample, 'GZ168_ENABLED=')) {
        $envExample = rtrim($envExample)."\n\n# gz168 modules (disabled by default)\nGZ168_ENABLED=false\nGZ168_MODULES_PATH=gz168\n";
        file_put_contents($envExamplePath, $envExample);
        echo "✓ .env.example: GZ168_ENABLED flag documented\n";
    }
}

// 3. Composer update
if ($noUpdate) {
    echo "\nSkipped composer update (--no-update). Run: composer update\n";
} else {
    echo "\nRunning: composer update ...\n";
    passthru('composer update --no-interaction --ansi 2>&1', $exitCode);
    if ($exitCode !== 0) {
        fwrite(STDERR, "\ncomposer update exited with code {$exitCode}\n");
        exit($exitCode);
    }
}

echo "\n✅ Installed modules: ".implode(', ', $selected)."\n";
echo "Next: php artisan gz168:module:list\n";

function askModules(array $available): array
{
    echo "Available gz168 modules:\n";
    foreach ($available as $i => $name) {
        echo sprintf("  [%2d] %s\n", $i, $name);
    }
    echo 'Enter indices (comma-separated), empty for all: ';
    $input = trim((string) fgets(STDIN));
    if ($input === '') {
        return $available;
    }
    $indices = array_map('trim', explode(',', $input));
    $picked = [];
    foreach ($indices as $idx) {
        if (is_numeric($idx) && isset($available[(int) $idx])) {
            $picked[] = $available[(int) $idx];
        }
    }

    return $picked ?: $available;
}
