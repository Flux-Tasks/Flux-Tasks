import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const expectedRepository = 'https://github.com/Flux-Tasks/Flux-Tasks';
const auditedFiles = [
  'package.json',
  'README.md',
  'installer-config.json',
  '.env.example',
  'electron/updater.ts',
  'scripts/release.js',
  'scripts/upload-release.js',
  'scripts/generate-update-manifest.js',
  '.github/workflows/release.yml'
];

test('release infrastructure contains no legacy repository owner', () => {
  for (const file of auditedFiles) {
    const content = fs.readFileSync(path.join(root, file), 'utf8');
    assert.equal(content.toLowerCase().includes('straniksss'), false, `${file} still contains the legacy owner`);
  }
});

test('electron-builder publishes to the organization repository', () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.deepEqual(packageJson.build.publish, {
    provider: 'github',
    owner: 'Flux-Tasks',
    repo: 'Flux-Tasks'
  });
  assert.equal(packageJson.repository.url, `${expectedRepository}.git`);
  assert.equal(packageJson.bugs.url, `${expectedRepository}/issues`);
});

test('environment template exposes canonical update configuration', () => {
  const env = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
  assert.match(env, /^GITHUB_OWNER=Flux-Tasks$/m);
  assert.match(env, /^GITHUB_REPO=Flux-Tasks$/m);
  assert.match(env, /^UPDATE_MANIFEST_URL=https:\/\/github\.com\/Flux-Tasks\/Flux-Tasks\/releases\/latest\/download\/latest\.json$/m);
});
