import { spawn } from 'node:child_process';
import { appDir, assertRegisteredSite, selectedSiteId } from './lib/site-registry.mjs';

const siteId = selectedSiteId();
const site = await assertRegisteredSite(siteId);
const commands = site.kind === 'directory'
  ? [['scripts/build-master.mjs'], ['scripts/verify-master.mjs']]
  : [['scripts/build.mjs'], ['scripts/verify-seo.mjs']];

for (const args of commands) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: appDir,
      env: { ...process.env, KERBSIDE_SITE: siteId },
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${args[0]} exited with code ${code}`)));
  });
}
