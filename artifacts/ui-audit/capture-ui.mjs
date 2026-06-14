import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const baseURL = 'http://127.0.0.1:5174/';
const outDir = 'C:/Users/user/Desktop/react/factor/artifacts/ui-audit';

async function waitForApp(page) {
  await page.goto(baseURL);
  await page.waitForSelector('canvas', { state: 'visible', timeout: 15000 });
  await page.waitForFunction(() => window.__GRADIUM_GAME__);
}

async function startGame(page, { tutorial = true } = {}) {
  await page.addInitScript((skipTutorial) => {
    localStorage.clear();
    if (!skipTutorial) return;
    localStorage.setItem('gradium_tutorial_completed', 'true');
    localStorage.setItem('gradium_tutorial_step', '12');
  }, !tutorial);
  await waitForApp(page);
  await page.waitForSelector('[data-testid="preact-main-menu"]', { state: 'visible' });
  await page.click('[data-testid="preact-main-menu-start"]');
  await page.waitForFunction(() => window.__GRADIUM_GAME__?.scene.isActive('MainScene'), null, { timeout: 15000 });
  await page.waitForSelector('#game-hud-shell', { state: 'attached', timeout: 15000 });
  await page.waitForSelector('[data-testid="preact-hud-root"]', { state: 'attached', timeout: 15000 });
}

async function screenshot(page, name) {
  await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: false });
}

async function openSettingsTab(page, tabId) {
  const settings = page.locator('[data-testid="preact-settings-modal"]');
  await settings.waitFor({ state: 'visible' });
  await page.click(`#preact-settings-tab-${tabId}`);
  await page.waitForTimeout(100);
}

async function collectRects(page, label) {
  return page.evaluate((name) => {
    const selectors = {
      topBar: '[data-testid="preact-top-bar"]',
      rightRail: '[data-testid="preact-right-rail"]',
      buildConsole: '[data-testid="preact-build-console"]',
      tutorialPanel: '[data-testid="preact-tutorial-panel"]',
      activityLog: '[data-testid="preact-activity-log"]',
      mobileSummary: '[data-testid="preact-mobile-build-summary"]',
      mobileActionBar: '[data-testid="preact-mobile-action-bar"]',
      settingsModal: '[data-testid="preact-settings-modal"]',
      researchPanel: '[data-testid="preact-research-panel"]',
      trainingLab: '[data-testid="preact-training-lab-modal"]',
      canvas: 'canvas'
    };
    const rects = {};
    for (const [key, selector] of Object.entries(selectors)) {
      const element = document.querySelector(selector);
      if (!element) {
        rects[key] = null;
        continue;
      }
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      rects[key] = {
        display: style.display,
        visibility: style.visibility,
        pointerEvents: style.pointerEvents,
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      };
    }
    return {
      label: name,
      bodyClass: document.body.className,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
      rects
    };
  }, label);
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch();
  const layouts = [];

  const context1920 = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const menuPage = await context1920.newPage();
  await waitForApp(menuPage);
  await screenshot(menuPage, '1920-menu');

  const page = await context1920.newPage();
  await startGame(page, { tutorial: false });
  await page.evaluate(() => {
    const bus = window.__GRADIUM_EVENT_BUS__;
    bus?.emit('ACTIVITY_LOG_ENTRY_REQUESTED', { message: 'UI audit: activity log sample', isAlert: false });
    bus?.emit('ACTIVITY_LOG_ENTRY_REQUESTED', { message: 'UI audit: alert sample', isAlert: true });
  });
  await screenshot(page, '1920-gameplay-default');
  layouts.push(await collectRects(page, '1920-gameplay-default'));

  await page.evaluate(() => window.__GRADIUM_EVENT_BUS__?.emit('SETTINGS_OPEN_REQUESTED'));
  await page.waitForSelector('[data-testid="preact-settings-modal"]', { state: 'visible', timeout: 15000 });
  await screenshot(page, '1920-settings-game');
  layouts.push(await collectRects(page, '1920-settings-game'));
  await openSettingsTab(page, 'audio');
  await screenshot(page, '1920-settings-audio');
  await openSettingsTab(page, 'graphics');
  await screenshot(page, '1920-settings-graphics');
  await openSettingsTab(page, 'system');
  await screenshot(page, '1920-settings-system');
  await page.click('[data-testid="preact-settings-close"]');

  await page.evaluate(() => window.__GRADIUM_EVENT_BUS__?.emit('RESEARCH_OPEN_REQUESTED'));
  await page.waitForSelector('[data-testid="preact-research-panel"]', { state: 'visible' });
  await screenshot(page, '1920-research-panel');
  layouts.push(await collectRects(page, '1920-research-panel'));
  await page.click('[data-testid="preact-research-close"]');

  await page.evaluate(() => {
    const scene = window.__GRADIUM_GAME__?.scene.getScene('MainScene');
    scene?.buildingManager?.place(-192, -160, 'MODEL_TRAINING_LAB', 0, { skipCost: true });
  });
  await page.evaluate(() => window.__GRADIUM_EVENT_BUS__?.emit('TRAINING_LAB_OPEN_REQUESTED', { tab: 'DEFENSE' }));
  await page.waitForSelector('[data-testid="preact-training-lab-modal"]', { state: 'visible' });
  await screenshot(page, '1920-training-lab');
  layouts.push(await collectRects(page, '1920-training-lab'));

  const tutorialPage = await context1920.newPage();
  await startGame(tutorialPage, { tutorial: true });
  await tutorialPage.waitForTimeout(500);
  await screenshot(tutorialPage, '1920-tutorial-mode');
  layouts.push(await collectRects(tutorialPage, '1920-tutorial-mode'));

  const viewports = [
    ['1280x720', 1280, 720],
    ['1366x768', 1366, 768],
    ['1600x900', 1600, 900],
    ['2560x1440', 2560, 1440],
    ['390x844', 390, 844],
    ['844x390', 844, 390]
  ];

  for (const [name, width, height] of viewports) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
    const testPage = await context.newPage();
    await startGame(testPage, { tutorial: false });
    await screenshot(testPage, `${name}-gameplay`);
    layouts.push(await collectRects(testPage, `${name}-gameplay`));
    await context.close();
  }

  await writeFile(path.join(outDir, 'layout-report.json'), JSON.stringify(layouts, null, 2), 'utf8');
  await context1920.close();
  await browser.close();
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
