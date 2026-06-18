import { expect, Page, test } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

type HudProfile = {
    preset: '1920x1080' | '2560x1440' | '3840x2160';
    width: number;
    height: number;
};

const OUTPUT_DIR = path.join(process.cwd(), 'output', 'playwright', 'hud-layout');
const PROFILES: HudProfile[] = [
    { preset: '1920x1080', width: 1920, height: 1080 },
    { preset: '2560x1440', width: 2560, height: 1440 },
    { preset: '3840x2160', width: 3840, height: 2160 }
];

function collectRuntimeErrors(page: Page): string[] {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
        if (message.type() === 'error') {
            if (message.text().includes('Failed to load resource: net::ERR_CONNECTION_TIMED_OUT')) return;
            errors.push(message.text());
        }
    });
    return errors;
}

async function startGame(page: Page, profile: HudProfile, tutorialCompleted: boolean): Promise<void> {
    await page.setViewportSize({ width: profile.width, height: profile.height });
    await page.route('https://fonts.googleapis.com/**', route => route.fulfill({
        status: 200,
        contentType: 'text/css',
        body: ''
    }));
    await page.route('https://fonts.gstatic.com/**', route => route.abort());
    await page.addInitScript(({ preset, tutorialDone }) => {
        localStorage.setItem('gradium_render_resolution', preset);
        localStorage.setItem('gradium_tutorial_completed', tutorialDone ? 'true' : 'false');
        localStorage.setItem('gradium_tutorial_step', tutorialDone ? '12' : '0');
    }, { preset: profile.preset, tutorialDone: tutorialCompleted });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('canvas')).toBeVisible();
    await expect(page.getByTestId('preact-main-menu')).toBeVisible();
    await page.getByTestId('preact-main-menu-start').click();
    await expect(page.getByTestId('preact-top-bar')).toBeVisible();
    await expect(page.getByTestId('preact-build-console')).toBeVisible();
}

async function expectCanvasAndHudStageMatch(page: Page, profile: HudProfile): Promise<void> {
    await expect.poll(async () => page.locator('canvas').evaluate(canvas => ({
        height: (canvas as HTMLCanvasElement).height,
        width: (canvas as HTMLCanvasElement).width
    }))).toEqual({ height: profile.height, width: profile.width });

    const canvasBox = await page.locator('canvas').boundingBox();
    const stageBox = await page.getByTestId('preact-hud-stage').boundingBox();
    expect(canvasBox).not.toBeNull();
    expect(stageBox).not.toBeNull();
    expect(Math.abs((stageBox!.x + stageBox!.width) - (canvasBox!.x + canvasBox!.width))).toBeLessThanOrEqual(2);
    expect(Math.abs((stageBox!.y + stageBox!.height) - (canvasBox!.y + canvasBox!.height))).toBeLessThanOrEqual(2);
}

async function boxFor(page: Page, testId: string) {
    const locator = page.getByTestId(testId);
    if (!await locator.isVisible().catch(() => false)) return null;
    return locator.boundingBox();
}

function overlapArea(
    a: NonNullable<Awaited<ReturnType<typeof boxFor>>>,
    b: NonNullable<Awaited<ReturnType<typeof boxFor>>>
): number {
    const x = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
    const y = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
    return x * y;
}

async function expectNoPanelOverlap(page: Page, testIds: string[]): Promise<void> {
    const boxes = new Map<string, NonNullable<Awaited<ReturnType<typeof boxFor>>>>();
    for (const testId of testIds) {
        const box = await boxFor(page, testId);
        if (box) boxes.set(testId, box);
    }

    const entries = Array.from(boxes.entries());
    for (let i = 0; i < entries.length; i += 1) {
        for (let j = i + 1; j < entries.length; j += 1) {
            const [leftId, leftBox] = entries[i];
            const [rightId, rightBox] = entries[j];
            expect(overlapArea(leftBox, rightBox), `${leftId} overlaps ${rightId}`).toBeLessThanOrEqual(2);
        }
    }
}

async function expectBuildDockAnchored(page: Page): Promise<void> {
    const canvasBox = await page.locator('canvas').boundingBox();
    const buildBox = await page.getByTestId('preact-build-console').boundingBox();
    expect(canvasBox).not.toBeNull();
    expect(buildBox).not.toBeNull();
    const bottomGap = (canvasBox!.y + canvasBox!.height) - (buildBox!.y + buildBox!.height);
    expect(bottomGap).toBeGreaterThanOrEqual(16);
    expect(bottomGap).toBeLessThanOrEqual(48);
}

async function capture(page: Page, profile: HudProfile, state: string): Promise<void> {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    await page.screenshot({
        path: path.join(OUTPUT_DIR, `${profile.preset}-${state}.png`),
        fullPage: false
    });
}

async function showWaveResult(page: Page): Promise<void> {
    await page.evaluate(() => {
        window.__GRADIUM_EVENT_BUS__?.emit('WAVE_RESULT_UPDATED', {
            open: true,
            token: 9001,
            wave: 1,
            kicker: 'Wave result',
            title: 'Wave 1 survived',
            closeLabel: 'Close',
            integrityLabel: 'Core Integrity',
            integrityTone: 'good',
            historyLabel: 'Recent Wave Records',
            historyWaveLabel: 'W1',
            historyCoreLabel: 'Core 100%',
            historyKillsLabel: 'Kills 3',
            stats: [
                { id: 'destroyed', label: 'Intrusions removed', value: '3', tone: 'good' },
                { id: 'data', label: 'Core data received', value: '+24', tone: 'default' },
                { id: 'integrity', label: 'Core integrity', value: '100%', tone: 'good' },
                { id: 'buildings', label: 'Building damage', value: '0', tone: 'default' }
            ],
            outcome: 'survived',
            enemiesDestroyed: 3,
            dataProcessed: 24,
            coreHpPercent: 100,
            coreDamage: 0,
            buildingsDamaged: 0,
            buildingsDestroyed: 0
        });
    });
    await expect(page.getByTestId('preact-wave-result-card')).toBeVisible();
}

for (const profile of PROFILES) {
    test(`HUD tutorial layout has no panel overlap at ${profile.preset}`, async ({ page }) => {
        test.setTimeout(60_000);
        const runtimeErrors = collectRuntimeErrors(page);

        await startGame(page, profile, false);
        await expectCanvasAndHudStageMatch(page, profile);
        await expect(page.getByTestId('preact-tutorial-panel')).toBeVisible();
        await expect(page.getByTestId('preact-right-rail')).toBeHidden();
        await expectBuildDockAnchored(page);
        await expectNoPanelOverlap(page, [
            'preact-top-bar',
            'preact-build-console',
            'preact-tutorial-panel',
            'preact-activity-log'
        ]);
        await capture(page, profile, 'tutorial');

        expect(runtimeErrors).toEqual([]);
    });

    test(`HUD campaign and wave result layout has no panel overlap at ${profile.preset}`, async ({ page }) => {
        test.setTimeout(60_000);
        const runtimeErrors = collectRuntimeErrors(page);

        await startGame(page, profile, true);
        await expectCanvasAndHudStageMatch(page, profile);
        await expect(page.getByTestId('preact-right-rail')).toBeVisible();
        await expect(page.getByTestId('preact-tutorial-panel')).toBeHidden();
        await expectBuildDockAnchored(page);
        await expectNoPanelOverlap(page, [
            'preact-top-bar',
            'preact-right-rail',
            'preact-build-console',
            'preact-activity-log'
        ]);
        await capture(page, profile, 'campaign');

        await showWaveResult(page);
        await expectNoPanelOverlap(page, [
            'preact-top-bar',
            'preact-right-rail',
            'preact-build-console',
            'preact-wave-result-card',
            'preact-activity-log'
        ]);
        await capture(page, profile, 'wave-result');

        expect(runtimeErrors).toEqual([]);
    });
}
