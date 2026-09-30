import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { validate } from '../src/validate.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(root, '../..');

function loadSchema(name) {
  return JSON.parse(readFileSync(join(root, 'schemas', name), 'utf8'));
}

function yamlToJson(path) {
  const php = `
    require '${repoRoot}/vendor/autoload.php';
    echo json_encode(Symfony\\Component\\Yaml\\Yaml::parseFile(${JSON.stringify(path)}), JSON_THROW_ON_ERROR);
  `;
  const result = spawnSync('php', ['-r', php], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`YAML parse failed for ${path}: ${result.stderr || result.stdout}`);
  }
  return JSON.parse(result.stdout);
}

const pageSchema = loadSchema('page-document.json');
const skinSchema = loadSchema('skin-manifest.json');
const themeSchema = loadSchema('theme.json');

const pagePath = join(repoRoot, 'gz168/FrontPage/resources/pages/home.all.yaml');
const pageErrors = validate(yamlToJson(pagePath), pageSchema);
if (pageErrors.length) {
  console.error('home.all.yaml invalid:\n' + pageErrors.join('\n'));
  process.exit(1);
}

const skinsRoot = join(repoRoot, 'gz168/FrontTemplate/resources/skins');
for (const code of readdirSync(skinsRoot)) {
  const manifest = join(skinsRoot, code, 'manifest.yaml');
  try {
    readFileSync(manifest);
  } catch {
    continue;
  }
  const errors = validate(yamlToJson(manifest), skinSchema);
  if (errors.length) {
    console.error(`${code}/manifest.yaml invalid:\n` + errors.join('\n'));
    process.exit(1);
  }
}

const themesRoot = join(repoRoot, 'gz168/FrontTemplate/resources/themes');
for (const file of readdirSync(themesRoot)) {
  if (!file.endsWith('.yaml') || file === 'schedule.yaml') {
    continue;
  }
  const errors = validate(yamlToJson(join(themesRoot, file)), themeSchema);
  if (errors.length) {
    console.error(`${file} invalid:\n` + errors.join('\n'));
    process.exit(1);
  }
}

console.log('All FrontExperience fixtures validate against @erp/front-schema');
