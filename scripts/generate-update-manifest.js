const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const releaseDir = path.join(root, 'release');
const manifestsDir = path.join(releaseDir, 'manifests');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const channelArg = process.argv.find(arg => arg.startsWith('--channel='));
const channel = channelArg ? channelArg.split('=')[1] : (process.env.RELEASE_CHANNEL || 'stable');
const owner = process.env.GITHUB_OWNER || 'Flux-Tasks';
const repo = process.env.GITHUB_REPO || 'Flux-Tasks';
const version = packageJson.version;

function digest(filePath, algorithm, encoding) {
  return crypto.createHash(algorithm).update(fs.readFileSync(filePath)).digest(encoding);
}

function findSetup() {
  const candidates = [
    path.join(releaseDir, 'Flux Tasks Setup.exe'),
    path.join(releaseDir, 'Flux.Tasks.Setup.exe')
  ];
  return candidates.find(fs.existsSync);
}

const asarPath = path.join(releaseDir, 'app.asar');
const setupPath = findSetup();
if (!fs.existsSync(asarPath)) throw new Error(`Missing release asset: ${asarPath}`);
if (!setupPath) throw new Error('Missing release asset: Flux Tasks Setup.exe');
if (!['stable', 'beta', 'alpha', 'rc'].includes(channel)) throw new Error(`Unsupported release channel: ${channel}`);

fs.mkdirSync(manifestsDir, { recursive: true });
const repositoryUrl = `https://github.com/${owner}/${repo}`;
const setupAssetName = 'Flux.Tasks.Setup.exe';
const manifest = {
  version,
  channel,
  updateType: 'asar',
  asarUrl: `${repositoryUrl}/releases/download/v${version}/app.asar`,
  packageUrl: `${repositoryUrl}/releases/download/v${version}/${setupAssetName}`,
  packageMirrorUrl: `${repositoryUrl}/releases/latest/download/${setupAssetName}`,
  packageSha256: digest(setupPath, 'sha256', 'hex'),
  packageSize: fs.statSync(setupPath).size,
  sha256: digest(asarPath, 'sha256', 'hex'),
  size: fs.statSync(asarPath).size,
  releaseNotes: [],
  publishedAt: new Date().toISOString()
};

const json = `${JSON.stringify(manifest, null, 2)}\n`;
const jsonName = channel === 'stable' ? 'latest.json' : `latest-${channel}.json`;
fs.writeFileSync(path.join(manifestsDir, jsonName), json);
if (channel === 'stable') fs.writeFileSync(path.join(manifestsDir, 'latest-stable.json'), json);

const setupSize = fs.statSync(setupPath).size;
const setupSha512 = digest(setupPath, 'sha512', 'base64');
const latestYml = [
  `version: ${version}`,
  'files:',
  `  - url: ${setupAssetName}`,
  `    sha512: ${setupSha512}`,
  `    size: ${setupSize}`,
  `path: ${setupAssetName}`,
  `sha512: ${setupSha512}`,
  `releaseDate: '${new Date().toISOString()}'`,
  ''
].join('\n');
if (channel === 'stable') fs.writeFileSync(path.join(manifestsDir, 'latest.yml'), latestYml);

const canonicalSetupPath = path.join(releaseDir, setupAssetName);
if (setupPath !== canonicalSetupPath) fs.copyFileSync(setupPath, canonicalSetupPath);
console.log(`Generated ${jsonName}${channel === 'stable' ? ', latest-stable.json and latest.yml' : ''} for ${owner}/${repo}.`);
