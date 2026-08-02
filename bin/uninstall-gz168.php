<?php

/**
 * Uninstall gz168 modules.
 *
 * Removes gz168 require entries and path repositories from composer.json,
 * flips GZ168_ENABLED=false in .env, and runs `composer update`.
 *
 * Usage:
 *   php bin/uninstall-gz168.php --all
 *   php bin/uninstall-gz168.php module-core common
 *   php bin/uninstall-gz168.php --no-update
 */
$rootPath = dirname(__DIR__);
$composerJsonPath = $rootPath.'/composer.json';
$envPath = $rootPath.'/.env';

$args = array_slice($argv, 1);
$all = in_array('--all', $args, true);
$noUpdate = in_array('--no-update', $args, true);
$modules = array_values(array_filter($args, fn ($a) => ! in_array($a, ['--all', '--no-update'], true)));

if (! $all && $modules === []) {
    fwrite(STDERR, "Usage:\n");
    fwrite(STDERR, "  php bin/uninstall-gz168.php --all\n");
    fwrite(STDERR, "  php bin/uninstall-gz168.php <module-alias> ...\n");
    exit(1);
}

$composer = json_decode(file_get_contents($composerJsonPath), true);
$removed = 0;

if ($all) {
    foreach (array_keys($composer['require'] ?? []) as $pkg) {
        if (str_starts_with($pkg, 'gz168/')) {
            unset($composer['require'][$pkg]);
            $removed++;
        }
    }
    $composer['repositories'] = array_values(array_filter(
        $composer['repositories'] ?? [],
        fn ($r) => ! str_starts_with($r['url'] ?? '', 'gz168/')
    ));
} else {
    foreach ($modules as $alias) {
        $folder = $alias;
        $composerFile = $rootPath.'/gz168/'.$folder.'/composer.json';
        if (is_file($composerFile)) {
            $data = json_decode(file_get_contents($composerFile), true);
            $packageName = $data['name'] ?? ('gz168/'.$folder);
        } else {
            $packageName = 'gz168/'.$folder;
        }

        if (isset($composer['require'][$packageName])) {
            unset($composer['require'][$packageName]);
            $removed++;
        }

        $composer['repositories'] = array_values(array_filter(
            $composer['repositories'] ?? [],
            fn ($r) => ($r['url'] ?? '') !== 'gz168/'.$folder
        ));
    }
}

ksort($composer['require']);
usort($composer['repositories'], fn ($a, $b) => strcmp($a['url'] ?? '', $b['url'] ?? ''));

file_put_contents(
    $composerJsonPath,
    json_encode($composer, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)."\n"
);

echo "✓ composer.json updated (removed {$removed} require entries)\n";

// Flip env flag
if (is_file($envPath)) {
    $env = file_get_contents($envPath);
    if (str_contains($env, 'GZ168_ENABLED=')) {
        $env = preg_replace('/^GZ168_ENABLED=.*/m', 'GZ168_ENABLED=false', $env);
        file_put_contents($envPath, $env);
        echo "✓ .env: GZ168_ENABLED=false\n";
    }
}

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

echo "\n✅ gz168 modules removed\n";
