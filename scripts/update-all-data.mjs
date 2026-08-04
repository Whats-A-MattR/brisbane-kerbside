import { spawn } from 'node:child_process';
import { appDir, councilSiteIds } from './lib/site-registry.mjs';

function update(siteId) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/update-data.mjs'], {
      cwd: appDir,
      env: { ...process.env, KERBSIDE_SITE: siteId },
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`Data update failed for ${siteId}`)));
  });
}

for (const siteId of await councilSiteIds()) await update(siteId);
