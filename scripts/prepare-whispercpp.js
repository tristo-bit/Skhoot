const { spawnSync } = require('child_process');

const target = process.env.TAURI_ENV_PLATFORM;
if (target && target !== 'linux') {
  console.log(`Skipping whisper.cpp build for platform: ${target}`);
  process.exit(0);
}

if (process.platform !== 'linux') {
  console.log('Skipping whisper.cpp build on non-Linux host');
  process.exit(0);
}

const result = spawnSync('bash', ['scripts/prepare-whispercpp.sh'], { stdio: 'inherit' });
process.exit(result.status === null ? 1 : result.status);
