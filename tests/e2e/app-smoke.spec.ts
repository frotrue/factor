import { expect, Page, test } from '@playwright/test';

function collectRuntimeErrors(page: Page): string[] {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
        if (message.type() === 'error') {
            errors.push(message.text());
        }
    });
    return errors;
}

async function startGame(page: Page): Promise<void> {
    const viewport = page.viewportSize()!;
    await page.goto('/');
    await expect(page.locator('canvas')).toBeVisible();

    const isCompact = viewport.width < 600 || viewport.height < 520;
    await page.mouse.click(viewport.width / 2, viewport.height / 2 + (isCompact ? 112 : 120));

    await expect(page.locator('#top-hud')).toBeVisible();
    await expect(page.locator('#bottom-ui-container')).toBeVisible();
    await expect(page.locator('#info-layer')).toBeAttached();
    await expect(page.locator('#ui-overlay .build-btn').first()).toBeVisible();
    await page.waitForFunction(() => document.getElementById('btn-settings')?.dataset.pointerGuarded === 'true');
}

async function getMainSceneState(page: Page): Promise<{
    buildings: Array<{ key: string; type: string }>;
    cableCount: number;
    selectedBuildingType: string;
    currentRotation: number;
    cableState: string;
    showDefenseRange: boolean;
    showPowerGrid: boolean;
    gameSpeed: number;
    mobileActionStatus: string | null;
    mobileCableMenuOpen: boolean;
    savedGameExists: boolean;
}> {
    return page.evaluate(() => {
        const scene = window.__NEURAL_FACTORY_GAME__?.scene.getScene('MainScene') as any;
        const unique = new Set<object>();
        const buildings: Array<{ key: string; type: string }> = [];
        scene.buildingManager.buildings.forEach((building: any, key: string) => {
            if (unique.has(building)) return;
            unique.add(building);
            buildings.push({ key, type: building.type });
        });

        return {
            buildings,
            cableCount: scene.cableManager.cables.size,
            selectedBuildingType: scene.uiManager.getSelectedBuildingType(),
            currentRotation: scene.currentRotation,
            cableState: scene.cableState,
            showDefenseRange: scene.showDefenseRange,
            showPowerGrid: scene.showPowerGrid,
            gameSpeed: scene.gameSpeed,
            mobileActionStatus: scene.uiManager.mobileActionStatus,
            mobileCableMenuOpen: Boolean(document.getElementById('mobile-cable-menu')?.classList.contains('open')),
            savedGameExists: Boolean(localStorage.getItem('neural_factory_save'))
        };
    });
}

async function expectBuildingCount(page: Page, type: string, count: number): Promise<void> {
    await expect.poll(async () => {
        const state = await getMainSceneState(page);
        return state.buildings.filter(building => building.type === type).length;
    }).toBe(count);
}

function getMobileBuildPoints(page: Page): { sourcePoint: { x: number; y: number }; targetPoint: { x: number; y: number } } {
    const viewport = page.viewportSize()!;
    const y = viewport.height < 500
        ? Math.max(132, viewport.height / 2 - 36)
        : Math.max(180, viewport.height / 2 - 160);
    const sourceX = Math.max(72, viewport.width / 2 - 96);
    return {
        sourcePoint: { x: sourceX, y },
        targetPoint: { x: sourceX + 96, y }
    };
}

test('desktop starts the game and opens settings', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'desktop-only smoke');
    const runtimeErrors = collectRuntimeErrors(page);

    await startGame(page);
    await expect(page.locator('#ui-overlay')).toBeVisible();
    await expect(page.locator('#btn-settings')).toBeVisible();

    await page.locator('#btn-settings').click();
    await expect(page.locator('#settings-modal')).toBeVisible();
    await page.locator('#btn-close-settings').click();
    await expect(page.locator('#settings-modal')).toBeHidden();

    expect(runtimeErrors).toEqual([]);
});

test('mobile layout exposes action controls without blocking startup', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('mobile-'), 'mobile-only smoke');
    const runtimeErrors = collectRuntimeErrors(page);

    await startGame(page);
    await page.waitForFunction(() => document.body.classList.contains('mobile-layout'));

    await expect(page.locator('#mobile-action-bar')).toBeVisible();
    await expect(page.locator('#mobile-build-summary')).toBeVisible();
    await expect(page.locator('#mobile-action-rotate')).toBeVisible();
    await expect(page.locator('#mobile-action-remove')).toBeVisible();
    await expect(page.locator('#mobile-action-cable')).toBeVisible();
    await expect(page.locator('#mobile-action-cancel')).toBeVisible();
    await expect(page.locator('#mobile-action-defense')).toBeVisible();
    await expect(page.locator('#mobile-action-power')).toBeVisible();

    expect(runtimeErrors).toEqual([]);
});

test('mobile action buttons update gameplay state', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('mobile-'), 'mobile-only action smoke');
    const runtimeErrors = collectRuntimeErrors(page);

    await startGame(page);
    await page.waitForFunction(() => document.body.classList.contains('mobile-layout'));

    await page.locator('#mobile-action-rotate').click();
    await expect.poll(async () => (await getMainSceneState(page)).currentRotation).toBe(1);

    await page.locator('#mobile-action-remove').click();
    await expect.poll(async () => (await getMainSceneState(page)).selectedBuildingType).toBe('REMOVE');
    await expect(page.locator('#mobile-action-remove')).toHaveClass(/active/);

    await page.locator('#mobile-action-cancel').click();
    await expect.poll(async () => (await getMainSceneState(page)).selectedBuildingType).toBe('DATA_DOWNLOADER');

    await page.locator('#mobile-action-cable').click();
    await expect.poll(async () => (await getMainSceneState(page)).selectedBuildingType).toBe('BASIC');
    await expect(page.locator('#mobile-action-cable')).toHaveClass(/active/);

    await page.locator('#mobile-action-cancel').click();
    await expect.poll(async () => (await getMainSceneState(page)).selectedBuildingType).toBe('DATA_DOWNLOADER');
    await expect.poll(async () => (await getMainSceneState(page)).cableState).toBe('IDLE');
    await expect.poll(async () => (await getMainSceneState(page)).mobileActionStatus).toBe(null);

    await page.locator('#mobile-action-defense').click();
    await expect.poll(async () => (await getMainSceneState(page)).showDefenseRange).toBe(true);
    await expect(page.locator('#mobile-action-defense')).toHaveClass(/active/);

    await page.locator('#mobile-action-power').click();
    await expect.poll(async () => (await getMainSceneState(page)).showPowerGrid).toBe(true);
    await expect(page.locator('#mobile-action-power')).toHaveClass(/active/);

    expect(runtimeErrors).toEqual([]);
});

test('mobile taps place buildings and connect a cable', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('mobile-'), 'mobile-only cable flow');
    const runtimeErrors = collectRuntimeErrors(page);

    await startGame(page);
    await page.waitForFunction(() => document.body.classList.contains('mobile-layout'));

    const { sourcePoint, targetPoint } = getMobileBuildPoints(page);

    await page.touchscreen.tap(sourcePoint.x, sourcePoint.y);
    await expectBuildingCount(page, 'DATA_DOWNLOADER', 1);

    await page.getByRole('button', { name: '생산' }).click();
    await page.locator('#btn-processor').click();
    await page.touchscreen.tap(targetPoint.x, targetPoint.y);
    await expectBuildingCount(page, 'PROCESSOR', 1);

    await page.locator('#mobile-action-cable').click();
    await expect.poll(async () => (await getMainSceneState(page)).selectedBuildingType).toBe('BASIC');

    await page.touchscreen.tap(sourcePoint.x, sourcePoint.y);
    await expect.poll(async () => (await getMainSceneState(page)).cableState).toBe('CABLE_START');
    await expect.poll(async () => (await getMainSceneState(page)).mobileActionStatus).toBe('Cable: select endpoint');

    await page.touchscreen.tap(targetPoint.x, targetPoint.y);
    await expect.poll(async () => (await getMainSceneState(page)).cableCount).toBe(1);
    await expect.poll(async () => (await getMainSceneState(page)).cableState).toBe('IDLE');

    await page.locator('#mobile-action-cancel').click();
    await expect.poll(async () => (await getMainSceneState(page)).selectedBuildingType).toBe('PROCESSOR');

    expect(runtimeErrors).toEqual([]);
});

test('desktop places buildings, connects cable, and removes cable', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'desktop-only canvas interaction smoke');
    const runtimeErrors = collectRuntimeErrors(page);

    await startGame(page);

    const sourcePoint = { x: 384, y: 256 };
    const targetPoint = { x: 480, y: 256 };

    await page.mouse.click(sourcePoint.x, sourcePoint.y);
    await expectBuildingCount(page, 'DATA_DOWNLOADER', 1);

    await page.getByRole('button', { name: '생산' }).click();
    await page.locator('#btn-processor').click();
    await page.mouse.click(targetPoint.x, targetPoint.y);
    await expectBuildingCount(page, 'PROCESSOR', 1);

    await page.getByRole('button', { name: '물류' }).click();
    await page.locator('#btn-basic').click();
    await expect.poll(async () => (await getMainSceneState(page)).selectedBuildingType).toBe('BASIC');

    await page.mouse.click(sourcePoint.x, sourcePoint.y);
    await page.mouse.click(targetPoint.x, targetPoint.y);
    await expect.poll(async () => (await getMainSceneState(page)).cableCount).toBe(1);

    await page.locator('#btn-remove').click();
    await page.mouse.click(sourcePoint.x, sourcePoint.y);
    await expect.poll(async () => (await getMainSceneState(page)).cableCount).toBe(0);

    expect(runtimeErrors).toEqual([]);
});

test('desktop covers build categories, hotkeys, right-click remove, overlays, save, and research modal', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'desktop-only broad interaction smoke');
    const runtimeErrors = collectRuntimeErrors(page);

    await startGame(page);

    await page.keyboard.press('R');
    await expect.poll(async () => (await getMainSceneState(page)).currentRotation).toBe(1);

    await page.keyboard.press('F1');
    await expect.poll(async () => (await getMainSceneState(page)).showDefenseRange).toBe(true);
    await page.keyboard.press('F2');
    await expect.poll(async () => (await getMainSceneState(page)).showPowerGrid).toBe(true);

    await page.getByRole('button', { name: '물류' }).click();
    await page.locator('#btn-conveyor').click();
    await page.mouse.click(352, 320);
    await expectBuildingCount(page, 'CONVEYOR', 1);

    await page.locator('#btn-storage').click();
    await page.mouse.click(448, 320);
    await expectBuildingCount(page, 'STORAGE', 2);

    await page.getByRole('button', { name: '생산' }).click();
    await page.locator('#btn-weight_trainer').click();
    await page.mouse.click(544, 320);
    await expectBuildingCount(page, 'WEIGHT_TRAINER', 1);

    await page.getByRole('button', { name: '방어' }).click();
    await page.locator('#btn-classifier').click();
    await page.mouse.click(640, 320);
    await expectBuildingCount(page, 'CLASSIFIER', 1);

    await page.mouse.click(640, 320, { button: 'right' });
    await expectBuildingCount(page, 'CLASSIFIER', 0);

    await page.locator('#btn-settings').click();
    await expect(page.locator('#settings-modal')).toBeVisible();
    await page.locator('#btn-speed-2').click();
    await expect.poll(async () => (await getMainSceneState(page)).gameSpeed).toBe(2);
    await page.locator('#btn-save').click();
    await expect.poll(async () => (await getMainSceneState(page)).savedGameExists).toBe(true);
    await page.locator('#btn-close-settings').click();
    await expect(page.locator('#settings-modal')).toBeHidden();

    await page.locator('#btn-research').click();
    await expect(page.locator('#research-modal')).toBeVisible();
    await expect(page.locator('#research-tree-container')).toContainText('Research');
    await page.locator('#btn-close-research').click();
    await expect(page.locator('#research-modal')).toBeHidden();

    expect(runtimeErrors).toEqual([]);
});
