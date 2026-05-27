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
    await page.waitForFunction(() => {
        const scene = window.__GRADIUM_GAME__?.scene.getScene('MainMenuScene') as any;
        return scene?.children?.list?.some((child: any) =>
            child.text === '> 시스템 초기화 <' || child.text === '> Initialize System <'
        );
    });

    const isCompact = viewport.width < 600 || viewport.height < 520;
    await page.mouse.click(viewport.width / 2, viewport.height / 2 + (isCompact ? 112 : 120));

    await expect(page.locator('#top-hud')).toBeVisible();
    await expect(page.locator('#bottom-ui-container')).toBeVisible();
    await expect(page.locator('#mission-panel')).toBeVisible();
    await expect(page.locator('#threat-panel')).toBeVisible();
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
        const scene = window.__GRADIUM_GAME__?.scene.getScene('MainScene') as any;
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
            savedGameExists: Boolean(localStorage.getItem('gradium_save'))
        };
    });
}

async function getCameraCoreOffset(page: Page): Promise<{ dx: number; dy: number }> {
    return page.evaluate(() => {
        const scene = window.__GRADIUM_GAME__?.scene.getScene('MainScene') as any;
        const cameraCenter = scene.cameras.main.midPoint;
        const core = scene.buildingManager.get('0,0');

        return {
            dx: cameraCenter.x - core.container.x,
            dy: cameraCenter.y - core.container.y
        };
    });
}

async function unlockFirstDefenseProgress(page: Page): Promise<void> {
    await page.evaluate(() => {
        const scene = window.__GRADIUM_GAME__?.scene.getScene('MainScene') as any;
        scene.waveManager.currentWave = 1;
        scene.waveManager.waveActive = false;
        scene.uiManager.renderTacticalPanels();
        scene.uiManager.createBuildingButtons();
    });
}

async function expectBuildingCount(page: Page, type: string, count: number): Promise<void> {
    await expect.poll(async () => {
        const state = await getMainSceneState(page);
        return state.buildings.filter(building => building.type === type).length;
    }).toBe(count);
}

async function getScreenPointForTile(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
    return page.evaluate(({ x, y }) => {
        const scene = window.__GRADIUM_GAME__?.scene.getScene('MainScene') as any;
        const camera = scene.cameras.main;
        const canvas = document.querySelector('canvas')!;
        const rect = canvas.getBoundingClientRect();
        return {
            x: rect.left + (x + 16 - camera.worldView.x) * camera.zoom,
            y: rect.top + (y + 16 - camera.worldView.y) * camera.zoom
        };
    }, { x, y });
}

async function getMobileBuildPoints(page: Page): Promise<{ sourcePoint: { x: number; y: number }; targetPoint: { x: number; y: number } }> {
    const viewport = page.viewportSize()!;
    if (viewport.height >= 500) {
        return {
            sourcePoint: await getScreenPointForTile(page, -96, -96),
            targetPoint: await getScreenPointForTile(page, -32, -96)
        };
    }

    return {
        sourcePoint: await getScreenPointForTile(page, -160, -96),
        targetPoint: await getScreenPointForTile(page, -96, -96)
    };
}

test('starts with the camera centered on the core', async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);

    await startGame(page);

    await expect.poll(async () => {
        const offset = await getCameraCoreOffset(page);
        return Math.hypot(offset.dx, offset.dy);
    }).toBeLessThan(1);

    expect(runtimeErrors).toEqual([]);
});

test('desktop starts the game and opens settings', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'desktop-only smoke');
    const runtimeErrors = collectRuntimeErrors(page);

    await startGame(page);
    await expect(page.locator('#hud-top-bar')).toBeVisible();
    await expect(page.locator('#hud-right-rail')).toBeVisible();
    await expect(page.locator('#build-console')).toBeVisible();
    await expect(page.locator('#selected-tool-panel')).toBeVisible();
    await expect(page.locator('#ui-overlay')).toBeVisible();
    await expect(page.locator('#btn-settings')).toBeVisible();
    await expect(page.locator('#btn-research')).toBeHidden();
    await expect(page.locator('#selected-tool-name')).toContainText('패킷 수집기');
    await expect(page.locator('#mission-panel')).toContainText('데이터 수집 시작');
    await expect(page.locator('#threat-panel')).toContainText('Wave 1');
    await expect(page.locator('#systems-panel')).toContainText('방어 준비 전');
    await expect(page.locator('#tutorial-panel')).toBeVisible();
    await expect(page.locator('#tutorial-panel')).toHaveAttribute('data-active-step', 'EXTRACTION', { timeout: 5000 });
    await expect(page.locator('#tutorial-panel')).toContainText('첫 건물 배치');

    await page.getByRole('button', { name: '물류' }).click();
    await expect(page.locator('#btn-access_point')).toHaveCount(0);
    await expect(page.locator('#btn-fast_link')).toHaveCount(0);
    await page.getByRole('button', { name: '추출' }).click();
    await expect(page.locator('#btn-unloader')).toHaveCount(0);

    await page.locator('#btn-settings').click();
    await expect(page.locator('#settings-modal')).toBeVisible();
    await page.locator('#btn-close-settings').click();
    await expect(page.locator('#settings-modal')).toBeHidden();

    expect(runtimeErrors).toEqual([]);
});

test('desktop can show wave result summary', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'desktop-only wave summary smoke');
    const runtimeErrors = collectRuntimeErrors(page);

    await startGame(page);
    await page.evaluate(() => {
        const scene = window.__GRADIUM_GAME__?.scene.getScene('MainScene') as any;
        scene.uiManager.showWaveResultSummary({
            wave: 1,
            outcome: 'survived',
            enemiesDestroyed: 5,
            coreDamage: 0,
            coreHpPercent: 100,
            confidenceGained: 12,
            buildingsDamaged: 0,
            buildingsDestroyed: 0,
            lines: []
        });
    });

    await expect(page.locator('.wave-result-card')).toBeVisible();
    await expect(page.locator('.wave-result-card')).toContainText('웨이브 결과');
    await expect(page.locator('.wave-result-card')).toContainText('공장 성장');

    expect(runtimeErrors).toEqual([]);
});

test('desktop restores keyboard focus to the canvas after closing modals', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'desktop-only focus smoke');
    const runtimeErrors = collectRuntimeErrors(page);

    await startGame(page);
    await page.locator('#btn-settings').click();
    await expect(page.locator('#settings-modal')).toBeVisible();
    await page.locator('#btn-close-settings').click();
    await expect(page.locator('#settings-modal')).toBeHidden();

    await expect.poll(async () => page.evaluate(() => document.activeElement?.tagName)).toBe('CANVAS');

    expect(runtimeErrors).toEqual([]);
});

test('desktop defaults to Korean and switches to English', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'desktop-only language smoke');
    const runtimeErrors = collectRuntimeErrors(page);

    await startGame(page);
    await expect(page.locator('#tutorial-panel')).toContainText('첫 건물 배치', { timeout: 5000 });
    await expect(page.locator('.hud-label').filter({ hasText: '전력 출력' })).toBeVisible();

    await page.locator('#btn-settings').click();
    await expect(page.locator('#settings-modal')).toContainText('시스템 설정');
    await page.locator('#btn-language-en').click();

    await expect(page.locator('#settings-modal')).toContainText('System Settings');
    await expect(page.locator('.hud-label').filter({ hasText: 'Power Output' })).toBeVisible();
    await expect(page.locator('#tutorial-panel')).toContainText('Place your first building');

    await page.locator('#btn-close-settings').click();
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

    await page.addInitScript(() => {
        localStorage.setItem('gradium_tutorial_completed', 'true');
        localStorage.setItem('gradium_tutorial_step', '8');
    });
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

    await page.addInitScript(() => {
        localStorage.setItem('gradium_tutorial_completed', 'true');
        localStorage.setItem('gradium_tutorial_step', '8');
    });
    await startGame(page);
    await page.waitForFunction(() => document.body.classList.contains('mobile-layout'));

    const { sourcePoint, targetPoint } = await getMobileBuildPoints(page);

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
    await expect.poll(async () => (await getMainSceneState(page)).mobileActionStatus).toBe('케이블: 끝 지점 선택');

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

    await page.addInitScript(() => {
        localStorage.setItem('gradium_tutorial_completed', 'true');
        localStorage.setItem('gradium_tutorial_step', '8');
    });
    await startGame(page);

    const sourcePoint = await getScreenPointForTile(page, -160, -96);
    const targetPoint = await getScreenPointForTile(page, -96, -96);

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

    await page.addInitScript(() => {
        localStorage.setItem('gradium_tutorial_completed', 'true');
        localStorage.setItem('gradium_tutorial_step', '8');
    });
    await startGame(page);

    await page.keyboard.press('R');
    await expect.poll(async () => (await getMainSceneState(page)).currentRotation).toBe(1);

    await page.keyboard.press('F1');
    await expect.poll(async () => (await getMainSceneState(page)).showDefenseRange).toBe(true);
    await page.keyboard.press('F2');
    await expect.poll(async () => (await getMainSceneState(page)).showPowerGrid).toBe(true);

    await page.getByRole('button', { name: '물류' }).click();
    await page.locator('#btn-conveyor').click();
    const conveyorPoint = await getScreenPointForTile(page, -224, -32);
    await page.mouse.click(conveyorPoint.x, conveyorPoint.y);
    await expectBuildingCount(page, 'CONVEYOR', 1);

    await page.locator('#btn-storage').click();
    const storagePoint = await getScreenPointForTile(page, -160, -32);
    await page.mouse.click(storagePoint.x, storagePoint.y);
    await expectBuildingCount(page, 'STORAGE', 2);

    await page.getByRole('button', { name: '생산' }).click();
    await page.locator('#btn-weight_trainer').click();
    const trainerPoint = await getScreenPointForTile(page, -96, -32);
    await page.mouse.click(trainerPoint.x, trainerPoint.y);
    await expectBuildingCount(page, 'WEIGHT_TRAINER', 1);

    await page.getByRole('button', { name: '방어' }).click();
    await page.locator('#btn-classifier').click();
    const classifierPoint = await getScreenPointForTile(page, -32, -32);
    await page.mouse.click(classifierPoint.x, classifierPoint.y);
    await expectBuildingCount(page, 'CLASSIFIER', 1);

    await page.mouse.click(classifierPoint.x, classifierPoint.y, { button: 'right' });
    await expectBuildingCount(page, 'CLASSIFIER', 0);

    await page.locator('#btn-settings').click();
    await expect(page.locator('#settings-modal')).toBeVisible();
    await page.locator('#btn-speed-2').click();
    await expect.poll(async () => (await getMainSceneState(page)).gameSpeed).toBe(2);
    await page.locator('#btn-save').click();
    await expect.poll(async () => (await getMainSceneState(page)).savedGameExists).toBe(true);
    await page.locator('#btn-close-settings').click();
    await expect(page.locator('#settings-modal')).toBeHidden();

    await unlockFirstDefenseProgress(page);
    await expect(page.locator('#btn-research')).toBeVisible();
    await page.locator('#btn-research').click();
    await expect(page.locator('#research-modal')).toBeVisible();
    await expect(page.locator('#research-tree-container')).toContainText('연구');
    await page.locator('#btn-close-research').click();
    await expect(page.locator('#research-modal')).toBeHidden();

    expect(runtimeErrors).toEqual([]);
});
