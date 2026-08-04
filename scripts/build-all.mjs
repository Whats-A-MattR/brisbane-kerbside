import { spawn } from 'node:child_process';
import { appDir, siteIds } from './lib/site-registry.mjs';

function build(siteId) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/build.mjs'], {
      cwd: appDir,
      env: { ...process.env, KERBSIDE_SITE: siteId },
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`Build failed for ${siteId}`)));
  });
}

for (const siteId of await siteIds()) {
  await build(siteId);
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/verify-seo.mjs'], {
      cwd: appDir,
      env: { ...process.env, KERBSIDE_SITE: siteId },
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`SEO verification failed for ${siteId}`)));
  });
}
