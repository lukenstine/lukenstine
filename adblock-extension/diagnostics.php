<?php
/**
 * Diagnostics for the Stream Ad Shield extension.
 *
 * Verifies that every required folder and file exists, that the JSON files
 * parse, that the manifest references only files that exist, and that the
 * rule file is well formed. Works from the command line and from a web
 * server; exit code is 0 when everything passes, 1 otherwise.
 *
 * Usage:
 *   php diagnostics.php            (plain text report)
 *   php diagnostics.php --json     (machine-readable report)
 */
declare(strict_types=1);

$root = __DIR__;
$results = [];

/** Records one check. Message is escaped at output time, never here. */
function check(array &$results, string $name, bool $ok, string $detail = ''): void
{
    $results[] = ['name' => $name, 'ok' => $ok, 'detail' => $detail];
}

/** Reads and decodes a JSON file; returns [data|null, errorMessage]. */
function readJson(string $path): array
{
    if (!is_file($path) || !is_readable($path)) {
        return [null, 'file missing or unreadable'];
    }
    $raw = file_get_contents($path);
    if ($raw === false) {
        return [null, 'could not read file'];
    }
    $data = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        return [null, 'invalid JSON: ' . json_last_error_msg()];
    }
    return [$data, ''];
}

// --- 1. Folders ---------------------------------------------------------------
foreach (['rules', 'src', 'src/lib', 'src/content', 'src/background', 'popup', 'icons', 'scripts', 'tests'] as $dir) {
    check($results, "folder $dir", is_dir("$root/$dir"));
}

// --- 2. Required files --------------------------------------------------------
$requiredFiles = [
    'manifest.json', 'package.json', 'README.md', 'changelog.md',
    'rules/ad-networks.json',
    'src/lib/url-utils.js', 'src/lib/overlay-heuristics.js',
    'src/content/popup-guard.js', 'src/content/overlay-cleaner.js', 'src/content/page-hooks.js',
    'src/background/background.js',
    'popup/popup.html', 'popup/popup.css', 'popup/popup.js',
    'icons/icon-16.png', 'icons/icon-48.png', 'icons/icon-128.png',
    'scripts/generate-rules.js', 'scripts/make-icons.js', 'scripts/build.sh',
    'tests/url-utils.test.js', 'tests/overlay-heuristics.test.js',
    'tests/rules.test.js', 'tests/manifest.test.js', 'tests/icons.test.js', 'tests/scripts-wiring.test.js',
];
foreach ($requiredFiles as $file) {
    $path = "$root/$file";
    $ok = is_file($path) && filesize($path) > 0;
    check($results, "file $file", $ok, $ok ? '' : 'missing or empty');
}

// --- 3. Manifest --------------------------------------------------------------
[$manifest, $err] = readJson("$root/manifest.json");
check($results, 'manifest.json parses', $manifest !== null, $err);
if (is_array($manifest)) {
    check($results, 'manifest_version is 3', ($manifest['manifest_version'] ?? 0) === 3);
    check($results, 'manifest has name and version',
        !empty($manifest['name']) && preg_match('/^\d+\.\d+\.\d+$/', (string)($manifest['version'] ?? '')) === 1);

    $refs = [];
    $refs[] = $manifest['background']['service_worker'] ?? null;
    foreach ($manifest['background']['scripts'] ?? [] as $s) { $refs[] = $s; }
    $refs[] = $manifest['action']['default_popup'] ?? null;
    foreach ($manifest['icons'] ?? [] as $i) { $refs[] = $i; }
    foreach ($manifest['declarative_net_request']['rule_resources'] ?? [] as $r) { $refs[] = $r['path'] ?? null; }
    foreach ($manifest['content_scripts'] ?? [] as $cs) { foreach ($cs['js'] ?? [] as $j) { $refs[] = $j; } }
    $missing = [];
    foreach (array_filter(array_unique($refs)) as $ref) {
        if (!is_file("$root/$ref")) { $missing[] = $ref; }
    }
    check($results, 'all files referenced by manifest exist', $missing === [], implode(', ', $missing));

    $perms = $manifest['permissions'] ?? [];
    check($results, 'manifest requests declarativeNetRequest and storage',
        in_array('declarativeNetRequest', $perms, true) && in_array('storage', $perms, true));

    [$pkg, $pkgErr] = readJson("$root/package.json");
    check($results, 'package.json parses', $pkg !== null, $pkgErr);
    if (is_array($pkg)) {
        check($results, 'package.json version matches manifest', ($pkg['version'] ?? '') === ($manifest['version'] ?? null));
    }
}

// --- 4. Rules -----------------------------------------------------------------
[$rules, $err] = readJson("$root/rules/ad-networks.json");
check($results, 'rules/ad-networks.json parses', is_array($rules), $err);
if (is_array($rules)) {
    $ids = [];
    $shapeOk = true;
    $domainCount = 0;
    foreach ($rules as $rule) {
        $ids[] = $rule['id'] ?? null;
        $cond = $rule['condition'] ?? [];
        if (($rule['action']['type'] ?? '') !== 'block' || empty($cond['resourceTypes'])) { $shapeOk = false; }
        if (isset($cond['requestDomains'])) { $domainCount = max($domainCount, count($cond['requestDomains'])); }
        if (isset($cond['regexFilter']) && @preg_match('/' . str_replace('/', '\/', $cond['regexFilter']) . '/i', '') === false) {
            $shapeOk = false;
        }
    }
    check($results, 'rule ids are unique', count($ids) === count(array_unique($ids)));
    check($results, 'rules have valid shape and compilable regexes', $shapeOk);
    check($results, 'rules cover a meaningful number of ad domains', $domainCount >= 50, "$domainCount domains");
}

// --- 5. Icons are real PNGs -----------------------------------------------------
foreach ([16, 48, 128] as $size) {
    $path = "$root/icons/icon-$size.png";
    $ok = false;
    if (is_file($path)) {
        $head = file_get_contents($path, false, null, 0, 24);
        $ok = $head !== false && substr($head, 0, 8) === "\x89PNG\r\n\x1a\n"
            && unpack('N', substr($head, 16, 4))[1] === $size;
    }
    check($results, "icon-$size.png is a $size px PNG", $ok);
}

// --- 6. Environment -------------------------------------------------------------
check($results, 'PHP version >= 8.0', PHP_VERSION_ID >= 80000, PHP_VERSION);
$nodeVersion = @shell_exec('node --version 2>/dev/null');
check($results, 'Node.js available for tests and build', is_string($nodeVersion) && $nodeVersion !== '',
    is_string($nodeVersion) ? trim($nodeVersion) : 'node not found (needed only to run tests/build, not to use the extension)');

// --- Output -----------------------------------------------------------------------
$failed = array_values(array_filter($results, static fn($r) => !$r['ok']));
$isCli = PHP_SAPI === 'cli';
$wantJson = $isCli ? in_array('--json', $argv ?? [], true) : (($_GET['format'] ?? '') === 'json');

if ($wantJson) {
    header_remove();
    if (!$isCli) { header('Content-Type: application/json'); }
    echo json_encode(['ok' => $failed === [], 'checks' => $results], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), "\n";
} elseif ($isCli) {
    foreach ($results as $r) {
        printf("[%s] %s%s\n", $r['ok'] ? 'PASS' : 'FAIL', $r['name'], $r['detail'] !== '' ? " ({$r['detail']})" : '');
    }
    printf("\n%d checks, %d failed\n", count($results), count($failed));
} else {
    header('Content-Type: text/html; charset=utf-8');
    echo "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"utf-8\"><title>Diagnostics</title>",
         "<style>body{font:14px system-ui;margin:2rem}.ok{color:#2e7d32}.fail{color:#c62828}</style></head><body>",
         "<h1>Stream Ad Shield diagnostics</h1><ul>";
    foreach ($results as $r) {
        $cls = $r['ok'] ? 'ok' : 'fail';
        $label = $r['ok'] ? 'PASS' : 'FAIL';
        $detail = $r['detail'] !== '' ? ' (' . htmlspecialchars($r['detail'], ENT_QUOTES, 'UTF-8') . ')' : '';
        echo "<li class=\"$cls\">[$label] ", htmlspecialchars($r['name'], ENT_QUOTES, 'UTF-8'), $detail, "</li>";
    }
    printf("</ul><p><strong>%d checks, %d failed</strong></p></body></html>", count($results), count($failed));
}

exit($failed === [] ? 0 : 1);
