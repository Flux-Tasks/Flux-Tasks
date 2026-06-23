const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const root = path.resolve(__dirname, '..');
const installer = path.join(root, 'release', 'Flux Tasks Web Setup.exe');
const payload = Buffer.concat([
  Buffer.from('MZ'),
  crypto.randomBytes(512 * 1024),
  Buffer.from('Flux Tasks downloader integration test')
]);
const sha256 = crypto.createHash('sha256').update(payload).digest('hex');
let dropRequests = 0;

function sendPayload(req, res, shouldDrop) {
  const range = req.headers.range;
  let start = 0;
  if (range) {
    const match = /^bytes=(\d+)-$/.exec(range);
    if (match) start = Number(match[1]);
  }
  const body = payload.subarray(start);
  const partial = start > 0;
  res.writeHead(partial ? 206 : 200, {
    'Content-Type': 'application/octet-stream',
    'Accept-Ranges': 'bytes',
    'Content-Length': body.length,
    ...(partial ? { 'Content-Range': `bytes ${start}-${payload.length - 1}/${payload.length}` } : {})
  });
  if (shouldDrop && dropRequests++ === 0) {
    const cut = Math.floor(body.length / 3);
    res.write(body.subarray(0, cut));
    setTimeout(() => res.destroy(), 20);
    return;
  }
  res.end(body);
}

function writeConfig(dir, port, primaryPath, mirrorPath, hash = sha256) {
  const configPath = path.join(dir, 'installer-config.json');
  fs.writeFileSync(configPath, JSON.stringify({
    version: 'test',
    primaryUrl: `http://127.0.0.1:${port}${primaryPath}`,
    mirrorUrl: mirrorPath ? `http://127.0.0.1:${port}${mirrorPath}` : '',
    expectedSha256: hash,
    fileName: 'FluxTasks-Test.exe'
  }, null, 2));
  return configPath;
}

async function runCase(name, port, primaryPath, mirrorPath, setup, expectedSuccess, hash) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `flux-installer-${name}-`));
  const configPath = writeConfig(dir, port, primaryPath, mirrorPath, hash);
  if (setup) setup(dir);
  const status = await new Promise((resolve, reject) => {
    const child = spawn(installer, ['--download-only', configPath, dir], { windowsHide: true });
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`${name}: downloader timed out`));
    }, 30000);
    child.once('error', reject);
    child.once('exit', code => {
      clearTimeout(timer);
      resolve(code);
    });
  });
  assert.strictEqual(status === 0, expectedSuccess, `${name}: unexpected exit code ${status}`);
  const finalPath = path.join(dir, 'FluxTasks-Test.exe');
  const partPath = `${finalPath}.part`;
  if (expectedSuccess) {
    assert.ok(fs.existsSync(finalPath), `${name}: final file missing`);
    assert.deepStrictEqual(fs.readFileSync(finalPath), payload, `${name}: payload mismatch`);
    assert.ok(!fs.existsSync(partPath), `${name}: .part was not renamed`);
  } else {
    assert.ok(!fs.existsSync(finalPath), `${name}: invalid final file exists`);
    assert.ok(!fs.existsSync(partPath), `${name}: invalid .part file was not deleted`);
  }
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(`PASS ${name}`);
}

const server = http.createServer((req, res) => {
  if (req.url === '/ok') return sendPayload(req, res, false);
  if (req.url === '/drop') return sendPayload(req, res, true);
  if (req.url === '/mirror') return sendPayload(req, res, false);
  res.writeHead(503, { 'Content-Type': 'text/plain', 'Content-Length': 11 });
  res.end('unavailable');
});

server.listen(0, '127.0.0.1', async () => {
  const port = server.address().port;
  try {
    await runCase('normal', port, '/ok', '', null, true);
    await runCase('resume-after-drop', port, '/drop', '', null, true);
    await runCase('existing-part', port, '/ok', '', dir => {
      fs.writeFileSync(path.join(dir, 'FluxTasks-Test.exe.part'), payload.subarray(0, 128 * 1024));
    }, true);
    await runCase('fallback-mirror', port, '/unavailable', '/mirror', null, true);
    await runCase('wrong-hash', port, '/ok', '', null, false, '0'.repeat(64));
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});
