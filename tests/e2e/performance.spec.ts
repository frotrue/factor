import { expect, Page, test } from '@playwright/test';

async function startGame(page: Page): Promise<void> {
    const viewport = page.viewportSize()!;
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('canvas')).toBeVisible();
    await page.waitForFunction(() => window.__GRADIUM_GAME__?.scene.isActive('MainMenuScene'));
    await expect(page.getByTestId('preact-main-menu')).toBeVisible();
    await expect(page.locator('#preact-main-menu-start')).toBeVisible();

    const isCompact = viewport.width < 600 || viewport.height < 520;
    const preactStart = page.locator('#preact-main-menu-start');
    if (await preactStart.isVisible({ timeout: 2000 }).catch(() => false)) {
        await preactStart.click();
    } else {
        await page.mouse.click(viewport.width / 2, viewport.height / 2 + (isCompact ? 112 : 120));
    }
    await expect(page.locator('#top-hud')).toBeAttached();
    await expect(page.locator('#top-hud')).toBeHidden();
    await expect(page.locator('#top-hud')).toHaveAttribute('data-preact-shadow', 'true');
    await expect(page.getByTestId('preact-top-bar')).toBeVisible();
    await page.waitForFunction(() => Boolean((window as any).__GRADIUM_PERF__));
}

test.describe('performance fixtures', () => {
    test.setTimeout(90_000);

    test.beforeEach(async ({}, testInfo) => {
        test.skip(testInfo.project.name !== 'desktop-chromium', 'desktop-only perf fixture');
    });

    test('records a 100/500/1000 building perf summary', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('gradium_tutorial_completed', 'true');
            localStorage.setItem('gradium_tutorial_step', '12');
            localStorage.removeItem('gradium_save');
        });
        await startGame(page);

        const summaries = await page.evaluate(async () => {
            const scene = window.__GRADIUM_GAME__?.scene.getScene('MainScene') as any;
            const counts = [100, 500, 1000];
            const results: Record<string, any> = {};
            let placed = 0;

            for (const count of counts) {
                while (placed < count) {
                    const index = placed;
                    const x = (12 + (index % 50) * 2) * 32;
                    const y = (-40 + Math.floor(index / 50) * 2) * 32;
                    scene.buildingManager.place(x, y, 'STORAGE', 0, { skipCost: true });
                    placed++;
                }

                scene.performanceStats.reset();
                scene.powerManager.markDirty();
                await new Promise(resolve => setTimeout(resolve, 1200));
                results[String(count)] = scene.performanceStats.getSummary();
            }

            return results;
        });

        for (const count of ['100', '500', '1000']) {
            expect(summaries[count].entities.buildings).toBeGreaterThanOrEqual(Number(count));
            expect(summaries[count].frames).toBeGreaterThan(0);
            expect(Number.isFinite(summaries[count].p95FrameMs)).toBe(true);
            expect(summaries[count].p95FrameMs).toBeLessThan(200);
            expect(summaries[count].longFrames).toBeGreaterThanOrEqual(0);
            expect(summaries[count].longFrames).toBeLessThanOrEqual(summaries[count].frames);
        }

        const autosaveScheduled = await page.evaluate(() => {
            const scene = window.__GRADIUM_GAME__?.scene.getScene('MainScene') as any;
            scene.performanceStats.reset();
            scene.saveManager.markDirty();
            scene.saveManager.autoSaveTimer = scene.saveManager.autoSaveInterval;
            scene.saveManager.update(1);
            return {
                mode: scene.mode,
                pending: scene.saveManager.autoSavePending
            };
        });
        expect(autosaveScheduled).toEqual({
            mode: 'campaign',
            pending: true
        });

        await expect.poll(async () => {
            return page.evaluate(() => {
                const scene = window.__GRADIUM_GAME__?.scene.getScene('MainScene') as any;
                return scene.performanceStats.getSummary().counters.saveWrites;
            });
        }, { timeout: 20000 }).toBeGreaterThan(0);

        const autosave = await page.evaluate(() => {
            const scene = window.__GRADIUM_GAME__?.scene.getScene('MainScene') as any;
            const saved = JSON.parse(localStorage.getItem('gradium_save') || '{}');
            return {
                summary: scene.performanceStats.getSummary(),
                counters: scene.performanceStats.getSummary().counters,
                savedBuildings: saved.buildings?.length ?? 0
            };
        });

        expect(autosave.counters.autosaveChunks).toBeGreaterThan(0);
        expect(autosave.savedBuildings).toBeGreaterThanOrEqual(1000);
        expect(autosave.summary.p95FrameMs).toBeLessThan(200);

        const recoverySummary = await page.evaluate(async () => {
            const scene = window.__GRADIUM_GAME__?.scene.getScene('MainScene') as any;
            scene.performanceStats.reset();
            await new Promise(resolve => setTimeout(resolve, 1200));
            return scene.performanceStats.getSummary();
        });
        expect(recoverySummary.frames).toBeGreaterThan(0);
        expect(recoverySummary.p95FrameMs).toBeLessThan(200);
    });
});
