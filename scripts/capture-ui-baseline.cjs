const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BASE_URL = process.env.GRADIUM_BASE_URL || 'http://127.0.0.1:5174';
const OUT_DIR = path.join(ROOT, 'output', 'ui-baseline', '2026-06-04-phase-0');

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function urlReady(url) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer(url, timeoutMs = 60000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await urlReady(url)) return;
    await delay(500);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function startServerIfNeeded() {
  if (await urlReady(BASE_URL)) {
    return null;
  }

  const child = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '5174'], {
    cwd: ROOT,
    shell: true,
    stdio: 'pipe',
    env: { ...process.env, BROWSER: 'none' }
  });

  child.stdout.on('data', data => process.stdout.write(data));
  child.stderr.on('data', data => process.stderr.write(data));
  await waitForServer(BASE_URL);
  return child;
}

async function stopServerProcess(child) {
  if (!child || child.killed) return;

  if (process.platform === 'win32') {
    await new Promise(resolve => {
      const killer = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
        stdio: 'ignore'
      });
      killer.on('close', resolve);
      killer.on('error', resolve);
    });
    return;
  }

  child.kill('SIGTERM');
}

async function waitForMenu(page) {
  await page.goto(BASE_URL);
  await page.waitForSelector('canvas');
  await page.waitForFunction(() => {
    const scene = window.__GRADIUM_GAME__?.scene.getScene('MainMenuScene');
    return scene?.children?.list?.some(child =>
      child.text === '> 시스템 초기화 <' || child.text === '> Initialize System <'
    );
  });
}

async function startGame(page) {
  const viewport = page.viewportSize();
  const isCompact = viewport.width < 600 || viewport.height < 520;
  await page.mouse.click(viewport.width / 2, viewport.height / 2 + (isCompact ? 112 : 120));
  await page.waitForSelector('#top-hud', { state: 'visible' });
  await page.waitForSelector('#bottom-ui-container', { state: 'visible' });
  await page.waitForSelector('#ui-overlay .build-btn', { state: 'visible' });
  await page.waitForFunction(() => document.getElementById('btn-settings')?.dataset.pointerGuarded === 'true');
}

async function capture(name, viewport, options = {}) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: options.deviceScaleFactor || 1,
    isMobile: Boolean(options.isMobile),
    hasTouch: Boolean(options.hasTouch)
  });
  const page = await context.newPage();
  await waitForMenu(page);

  if (options.menu) {
    await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`), fullPage: true });
    await context.close();
    return;
  }

  await startGame(page);
  if (options.openSettings) {
    await page.locator('#btn-settings').click();
    await page.waitForSelector('#settings-modal', { state: 'visible' });
  }
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`), fullPage: true });
  await context.close();
}

let serverProcess = null;
let browser = null;

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  serverProcess = await startServerIfNeeded();
  browser = await chromium.launch();

  await capture('desktop-menu-1280x720', { width: 1280, height: 720 }, { menu: true });
  await capture('desktop-game-1280x720', { width: 1280, height: 720 });
  await capture('desktop-settings-1280x720', { width: 1280, height: 720 }, { openSettings: true });
  await capture('mobile-portrait-game-390x844', { width: 390, height: 844 }, {
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2
  });
  await capture('mobile-landscape-game-844x390', { width: 844, height: 390 }, {
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2
  });

  console.log(`UI baseline screenshots written to ${OUT_DIR}`);
})().finally(async () => {
  if (browser) await browser.close();
  await stopServerProcess(serverProcess);
});
