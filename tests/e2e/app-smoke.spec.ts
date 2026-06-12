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
    await waitForMainMenu(page);

    const isCompact = viewport.width < 600 || viewport.height < 520;
    const preactStart = page.locator('#preact-main-menu-start');
    if (await preactStart.isVisible({ timeout: 2000 }).catch(() => false)) {
        await preactStart.click();
    } else {
        await page.mouse.click(viewport.width / 2, viewport.height / 2 + (isCompact ? 112 : 120));
    }

    const desktopHudSurface = viewport.width > 980 && viewport.height > 520;
    if (desktopHudSurface) {
        await expectLegacyHudShellShadow(page);
        await expect(page.getByTestId('preact-top-bar')).toBeVisible();
        await expect(page.getByTestId('preact-right-rail')).toBeVisible();
        await expect(page.getByTestId('preact-build-console')).toBeVisible();
    } else {
        await page.waitForFunction(() => document.body.classList.contains('mobile-layout'));
        await expect(page.locator('#top-hud')).toBeVisible();
        const shortLandscape = viewport.width > viewport.height && viewport.height <= 480;
        if (shortLandscape) {
            await expect(page.locator('#bottom-ui-container')).toBeVisible();
            await expect(page.locator('#build-console')).toBeVisible();
        } else {
            await expect(page.locator('#bottom-ui-container')).toBeHidden();
            await expect(page.locator('#build-console')).toBeHidden();
            await expect(page.locator('#bottom-ui-container')).toHaveAttribute('data-preact-shadow', 'true');
            await expect(page.locator('#build-console')).toHaveAttribute('data-preact-shadow', 'true');
            await expect(page.getByTestId('preact-build-console')).toBeVisible();
        }
        await expect(page.locator('#mission-panel')).toBeVisible();
        await expect(page.locator('#threat-panel')).toBeVisible();
    }
    await expect(page.locator('#info-layer')).toBeAttached();
    await expect(page.locator('#ui-overlay .build-btn').first()).toBeAttached();
    await page.waitForFunction(() => document.getElementById('btn-settings')?.dataset.pointerGuarded === 'true');
}

async function waitForMainMenu(page: Page): Promise<void> {
    await page.waitForFunction(() => {
        const scene = window.__GRADIUM_GAME__?.scene.getScene('MainMenuScene') as any;
        return scene?.children?.list?.some((child: any) =>
            child.text === '> 시스템 초기화 <' || child.text === '> Initialize System <'
        );
    });
}

async function expectLegacyHudShellShadow(page: Page): Promise<void> {
    for (const selector of ['#top-hud', '#hud-right-rail', '#bottom-ui-container', '#build-console']) {
        const legacy = page.locator(selector);
        await expect(legacy).toBeAttached();
        await expect(legacy).toBeHidden();
        await expect(legacy).toHaveAttribute('data-preact-shadow', 'true');
        await expect(legacy).toHaveAttribute('aria-hidden', 'true');
    }
}

async function expectLegacySettingsShadow(page: Page): Promise<void> {
    const legacySettings = page.locator('#settings-modal');
    await expect(legacySettings).toBeAttached();
    await expect(legacySettings).toBeHidden();
    await expect(legacySettings).toHaveAttribute('data-preact-shadow', 'true');
    await expect(legacySettings).toHaveAttribute('aria-hidden', 'true');
}

async function expectLegacyTrainingLabShadow(page: Page): Promise<void> {
    const legacyLab = page.locator('#training-lab-modal');
    await expect(legacyLab).toBeAttached();
    await expect(legacyLab).toBeHidden();
    await expect(legacyLab).toHaveAttribute('data-preact-shadow', 'true');
    await expect(legacyLab).toHaveAttribute('aria-hidden', 'true');
}

async function expectLegacyGameOverShadow(page: Page): Promise<void> {
    const legacyGameOver = page.locator('#game-over-screen');
    await expect(legacyGameOver).toBeAttached();
    await expect(legacyGameOver).toBeHidden();
    await expect(legacyGameOver).toHaveAttribute('data-preact-shadow', 'true');
    await expect(legacyGameOver).toHaveAttribute('aria-hidden', 'true');
}

async function expectLegacyWaveResultShadow(page: Page): Promise<void> {
    const legacyWaveResults = page.locator('.wave-result-card');
    await expect(legacyWaveResults.first()).toBeAttached();
    const count = await legacyWaveResults.count();
    for (let index = 0; index < count; index += 1) {
        const legacyWaveResult = legacyWaveResults.nth(index);
        await expect(legacyWaveResult).toBeHidden();
        await expect(legacyWaveResult).toHaveAttribute('data-preact-shadow', 'true');
        await expect(legacyWaveResult).toHaveAttribute('aria-hidden', 'true');
    }
}

async function expectLegacyActivityLogShadow(page: Page, message: string): Promise<void> {
    const legacyEntry = page.locator('#activity-log .log-entry', { hasText: message });
    await expect(legacyEntry).toBeAttached();
    await expect(legacyEntry).toBeHidden();
    await expect(legacyEntry).toHaveAttribute('data-preact-shadow', 'true');
    await expect(legacyEntry).toHaveAttribute('aria-hidden', 'true');
}

async function expectLegacyTooltipShadow(page: Page): Promise<void> {
    const legacyTooltip = page.locator('#tooltip');
    await expect(legacyTooltip).toBeAttached();
    await expect(legacyTooltip).toBeHidden();
    await expect(legacyTooltip).toHaveAttribute('data-preact-shadow', 'true');
    await expect(legacyTooltip).toHaveAttribute('aria-hidden', 'true');
}

async function expectLegacyTutorialPanelShadow(page: Page): Promise<void> {
    const legacyTutorial = page.locator('#tutorial-panel');
    await expect(legacyTutorial).toBeAttached();
    await expect(legacyTutorial).toBeHidden();
    await expect(legacyTutorial).toHaveAttribute('data-preact-shadow', 'true');
    await expect(legacyTutorial).toHaveAttribute('aria-hidden', 'true');
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

function isShortLandscape(page: Page): boolean {
    const viewport = page.viewportSize()!;
    return viewport.width > viewport.height && viewport.height <= 480;
}

async function expectLegacyMobileControlsShadow(page: Page): Promise<void> {
    if (isShortLandscape(page)) {
        await expect(page.locator('#mobile-action-bar')).toBeVisible();
        await expect(page.locator('#mobile-build-summary')).toBeVisible();
        await expect(page.locator('#mobile-action-bar')).not.toHaveAttribute('data-preact-shadow', 'true');
        return;
    }

    await expect(page.locator('#mobile-action-bar')).toBeAttached();
    await expect(page.locator('#mobile-build-summary')).toBeAttached();
    await expect(page.locator('#mobile-action-bar')).toHaveAttribute('data-preact-shadow', 'true');
    await expect(page.locator('#mobile-build-summary')).toHaveAttribute('data-preact-shadow', 'true');
    await expect(page.locator('#mobile-action-bar')).toHaveAttribute('aria-hidden', 'true');
    await expect(page.locator('#mobile-build-summary')).toHaveAttribute('aria-hidden', 'true');
    await expect(page.locator('#mobile-action-bar')).toBeHidden();
    await expect(page.locator('#mobile-build-summary')).toBeHidden();
}

async function clickMobileAction(page: Page, id: string): Promise<void> {
    const preactAction = page.getByTestId(`preact-mobile-action-${id}`);
    if (!isShortLandscape(page) && await preactAction.isVisible().catch(() => false)) {
        await preactAction.click();
        return;
    }

    await page.locator(`#mobile-action-${id}`).click();
}

const legacyCategoryLabels: Record<string, string> = {
    DEFENSE: '방어',
    EXTRACTION: '추출',
    LOGISTICS: '물류',
    POWER: '전력',
    PRODUCTION: '생산'
};

async function selectBuildCategory(page: Page, category: string): Promise<void> {
    const preactCategory = page.getByTestId(`preact-build-category-${category}`);
    if (await preactCategory.isVisible().catch(() => false)) {
        await preactCategory.click();
    } else {
        await page.getByRole('button', { name: legacyCategoryLabels[category] }).click();
    }

    await expect.poll(async () => {
        return page.evaluate(() => {
            const scene = window.__GRADIUM_GAME__?.scene.getScene('MainScene') as any;
            return scene?.uiManager?.activeCategory;
        });
    }).toBe(category);
}

async function selectBuildTool(page: Page, type: string): Promise<void> {
    const preactTool = page.getByTestId(`preact-build-tool-${type}`);
    if (await preactTool.isVisible({ timeout: 1200 }).catch(() => false)) {
        await preactTool.click();
        const clicked = await expect.poll(async () => (await getMainSceneState(page)).selectedBuildingType, { timeout: 1000 })
            .toBe(type)
            .then(() => true)
            .catch(() => false);
        if (clicked) return;

        await preactTool.focus();
        await preactTool.press('Enter');
    } else {
        await page.locator(`#btn-${type.toLowerCase()}`).click();
    }

    await expect.poll(async () => (await getMainSceneState(page)).selectedBuildingType).toBe(type);
}

async function pressGameHotkey(page: Page, key: string, isApplied: () => Promise<boolean>): Promise<void> {
    await page.keyboard.press(key);
    const applied = await expect.poll(isApplied, { timeout: 1000 }).toBe(true).then(() => true).catch(() => false);
    if (applied) return;

    await page.evaluate(hotkey => {
        const scene = window.__GRADIUM_GAME__?.scene.getScene('MainScene') as any;
        scene?.input?.keyboard?.emit(`keydown-${hotkey}`);
    }, key);
    await expect.poll(isApplied).toBe(true);
}

test('desktop exposes Preact main menu difficulty and keyboard start contracts', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'desktop-only main menu smoke');
    const runtimeErrors = collectRuntimeErrors(page);

    await page.goto('/');
    await expect(page.locator('canvas')).toBeVisible();
    await waitForMainMenu(page);

    const menu = page.getByTestId('preact-main-menu');
    const difficultyGroup = page.getByTestId('preact-main-menu-difficulty-group');
    const easy = page.getByTestId('preact-main-menu-difficulty-easy');
    const normal = page.getByTestId('preact-main-menu-difficulty-normal');

    await expect(menu).toBeVisible();
    await expect(page.getByTestId('preact-main-menu-status')).toBeVisible();
    await expect(difficultyGroup).toHaveAttribute('aria-describedby', 'preact-main-menu-difficulty-description');
    await expect(normal).toHaveAttribute('aria-pressed', 'true');

    await easy.click();
    await expect(easy).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('ArrowRight');
    await expect(normal).toHaveAttribute('aria-pressed', 'true');

    await page.keyboard.press('Enter');
    await expect(page.getByTestId('preact-top-bar')).toBeVisible();
    await expectLegacyHudShellShadow(page);

    expect(runtimeErrors).toEqual([]);
});

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
    await expectLegacyHudShellShadow(page);
    await expect(page.locator('#hud-top-bar')).toBeAttached();
    await expect(page.locator('#hud-right-rail')).toBeHidden();
    await expect(page.locator('#build-console')).toBeHidden();
    await expect(page.getByTestId('preact-top-bar')).toBeVisible();
    await expect(page.getByTestId('preact-topbar-stats')).toHaveAttribute('role', 'list');
    await expect(page.getByTestId('preact-stat-card-power')).toHaveAttribute('role', 'listitem');
    await expect(page.getByTestId('preact-stat-card-power')).toHaveAttribute('aria-labelledby', 'preact-stat-label-power');
    await expect(page.getByTestId('preact-stat-card-power')).toHaveAttribute('aria-describedby', 'preact-stat-value-power');
    await expect(page.getByTestId('preact-stat-label-power')).toContainText('전력 출력');
    await expect(page.getByTestId('preact-right-rail')).toBeVisible();
    await expect(page.getByTestId('preact-build-console')).toBeVisible();
    await expect(page.locator('#selected-tool-panel')).toBeAttached();
    await expect(page.locator('#ui-overlay')).toBeAttached();
    await expect(page.locator('#btn-settings')).toBeAttached();
    await expect(page.getByTestId('preact-topbar-settings')).toBeVisible();
    await expect(page.locator('#btn-research')).toHaveCount(0);
    await expect(page.locator('#selected-tool-name')).toContainText('패킷 수집기');
    await expect(page.getByTestId('preact-build-tool-DATA_DOWNLOADER')).toBeVisible();
    await expect(page.getByTestId('preact-build-console-items')).toHaveAttribute('role', 'tabpanel');
    await expect(page.getByTestId('preact-build-console-items')).toHaveAttribute('aria-labelledby', 'preact-build-category-tab-EXTRACTION');
    await expect(page.getByTestId('preact-build-tool-DATA_DOWNLOADER')).toHaveAttribute('aria-describedby', 'preact-build-console-preview');
    await expect(page.getByTestId('preact-build-tool-DATA_DOWNLOADER')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('preact-build-console-preview')).toHaveAttribute('role', 'status');
    await expect(page.getByTestId('preact-build-console-preview')).toHaveAttribute('aria-live', 'polite');
    await expect(page.getByTestId('preact-build-console-preview')).toHaveAttribute('aria-atomic', 'true');
    await expect(page.getByTestId('preact-build-console-preview-name')).toContainText('패킷 수집기');
    await expect(page.locator('#mission-panel')).toContainText('데이터 수집 시작');
    await expect(page.locator('#threat-panel')).toContainText('Wave 1');
    await expect(page.locator('#systems-panel')).toContainText('방어 준비 전');
    await expect(page.getByTestId('preact-right-rail-panel-objective')).toHaveAttribute('role', 'region');
    await expect(page.getByTestId('preact-right-rail-panel-objective')).toHaveAttribute('aria-labelledby', 'preact-right-rail-objective-title');
    await expect(page.getByTestId('preact-right-rail-body-objective')).toBeVisible();
    await expect(page.getByTestId('preact-right-rail-toggle-objective')).toBeVisible();
    await expect(page.getByTestId('preact-right-rail-toggle-objective')).toHaveAttribute('aria-expanded', 'true');
    await page.getByTestId('preact-right-rail-toggle-objective').click();
    await expect(page.getByTestId('preact-right-rail-toggle-objective')).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByTestId('preact-right-rail-panel-objective')).toHaveAttribute('data-collapsed', 'true');
    await expect(page.getByTestId('preact-right-rail-body-objective')).toHaveCount(0);
    await page.getByTestId('preact-right-rail-toggle-objective').click();
    await expect(page.getByTestId('preact-right-rail-toggle-objective')).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByTestId('preact-right-rail-threat-meter')).toHaveAttribute('role', 'progressbar');
    await expect(page.getByTestId('preact-right-rail-threat-meter')).toHaveAttribute('aria-valuenow', '24');
    await expect(page.getByTestId('preact-right-rail-threat-routes')).toHaveAttribute('role', 'list');
    await expect(page.getByTestId('preact-right-rail-power-load')).toHaveAttribute('role', 'progressbar');
    await expect(page.getByTestId('preact-right-rail-power-load')).toHaveAttribute('aria-valuetext', /^\d+%$/);
    await expect(page.getByTestId('preact-tutorial-panel')).toBeVisible();
    await expect(page.getByTestId('preact-tutorial-skip')).toBeVisible();
    await expect(page.getByTestId('preact-tutorial-progress')).toHaveAttribute('aria-valuetext', /^\d+\/\d+$/);
    await expect(page.getByTestId('preact-tutorial-steps')).toHaveAttribute('role', 'list');
    await expect(page.locator('[data-testid^="preact-tutorial-step-"][aria-current="step"]')).toHaveCount(1);
    await expectLegacyTutorialPanelShadow(page);
    await expect(page.locator('#tutorial-panel')).toHaveAttribute('data-active-step', /CORE|RESOURCE|POWER/, { timeout: 5000 });
    await expect(page.locator('#tutorial-panel')).toContainText(/(Core 목표|자원 확인|전력망 확장)/);

    await selectBuildCategory(page, 'LOGISTICS');
    await expect(page.locator('#btn-access_point')).toHaveCount(0);
    await expect(page.locator('#btn-fast_link')).toHaveCount(0);
    await expect(page.getByTestId('preact-build-tool-ACCESS_POINT')).toHaveCount(0);
    await expect(page.getByTestId('preact-build-tool-FAST_LINK')).toHaveCount(0);
    await selectBuildCategory(page, 'EXTRACTION');
    await expect(page.locator('#btn-unloader')).toHaveCount(0);
    await expect(page.getByTestId('preact-build-tool-UNLOADER')).toHaveCount(0);

    await page.getByTestId('preact-topbar-settings').click();
    const settingsModal = page.getByTestId('preact-settings-modal');
    await expect(page.getByTestId('preact-modal-overlay')).toHaveAttribute('role', 'presentation');
    await expect(page.getByTestId('preact-modal-panel')).toBeVisible();
    await expect(settingsModal).toBeVisible();
    await expect(settingsModal).toHaveAttribute('role', 'dialog');
    await expect(settingsModal).toHaveAttribute('aria-modal', 'true');
    await expect(settingsModal).toHaveAttribute('aria-labelledby', 'preact-settings-title');
    await expect(settingsModal).toHaveAttribute('aria-describedby', 'preact-settings-note');
    await expect(page.getByTestId('preact-settings-tabs')).toHaveAttribute('role', 'tablist');
    await expect(page.getByTestId('preact-settings-panel')).toHaveAttribute('role', 'tabpanel');
    await expectLegacySettingsShadow(page);
    await page.keyboard.press('Escape');
    await expect(page.locator('#settings-modal')).toBeHidden();
    await expect(page.locator('#settings-modal')).not.toHaveAttribute('data-preact-shadow', 'true');
    await expect(settingsModal).toHaveCount(0);

    expect(runtimeErrors).toEqual([]);
});

test('desktop can show wave result summary', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'desktop-only wave summary smoke');
    const runtimeErrors = collectRuntimeErrors(page);

    await startGame(page);
    await page.evaluate(async () => {
        const scene = window.__GRADIUM_GAME__?.scene.getScene('MainScene') as any;
        scene.uiManager.showWaveResultSummary({
            wave: 1,
            outcome: 'survived',
            enemiesDestroyed: 5,
            coreDamage: 0,
            coreHpPercent: 100,
            dataProcessed: 12,
            buildingsDamaged: 0,
            buildingsDestroyed: 0,
            lines: []
        });
        await new Promise(resolve => setTimeout(resolve, 5));
        scene.uiManager.showWaveResultSummary({
            wave: 2,
            outcome: 'survived',
            enemiesDestroyed: 8,
            coreDamage: 4,
            coreHpPercent: 96,
            dataProcessed: 18,
            buildingsDamaged: 1,
            buildingsDestroyed: 0,
            lines: []
        });
    });

    await expectLegacyWaveResultShadow(page);
    const latestLegacyWaveResult = page.locator('.wave-result-card').last();
    await expect(latestLegacyWaveResult).toContainText('웨이브 결과');
    await expect(latestLegacyWaveResult).toContainText('Core 수신 데이터');
    await expect(page.getByTestId('preact-wave-result-card')).toBeVisible();
    await expect(page.getByTestId('preact-wave-result-card')).toContainText(/Core Integrity|Core 무결성/);
    const waveTitleId = await page.getByTestId('preact-wave-result-title').getAttribute('id');
    const waveIntegritySummaryId = await page.getByTestId('preact-wave-result-integrity-summary').getAttribute('id');
    expect(waveTitleId).toBeTruthy();
    expect(waveIntegritySummaryId).toBeTruthy();
    await expect(page.getByTestId('preact-wave-result-card')).toHaveAttribute('aria-labelledby', waveTitleId!);
    await expect(page.getByTestId('preact-wave-result-card')).toHaveAttribute('aria-describedby', waveIntegritySummaryId!);
    await expect(page.getByTestId('preact-wave-result-integrity')).toHaveAttribute('role', 'progressbar');
    await expect(page.getByTestId('preact-wave-result-integrity')).toHaveAttribute('aria-valuenow', '96');
    await expect(page.getByTestId('preact-wave-result-integrity')).toHaveAttribute('aria-valuetext', '96%');
    await expect(page.getByTestId('preact-wave-result-stats')).toHaveAttribute('role', 'list');
    await expect(page.locator('[data-testid^="preact-wave-result-stat-"]')).toHaveCount(4);
    await expect(page.getByTestId('preact-wave-result-history')).toHaveAttribute('role', 'list');
    const waveHistoryLabelId = await page.getByTestId('preact-wave-result-history-label').getAttribute('id');
    expect(waveHistoryLabelId).toBeTruthy();
    await expect(page.getByTestId('preact-wave-result-history')).toHaveAttribute('aria-labelledby', waveHistoryLabelId!);
    await expect(page.getByTestId('preact-wave-result-history').locator('[role="listitem"]')).toHaveCount(2);
    await page.getByTestId('preact-wave-result-close').click();
    await expect(page.getByTestId('preact-wave-result-card')).toHaveCount(0);

    expect(runtimeErrors).toEqual([]);
});

test('desktop shows the Preact game-over screen from the existing game-over event', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'desktop-only game-over smoke');
    const runtimeErrors = collectRuntimeErrors(page);

    await startGame(page);
    await page.evaluate(async () => {
        const modulePath = '/src/managers/EventBus.ts';
        const { default: EventBus } = await import(modulePath);
        EventBus.emit('GAME_OVER');
    });

    const preactGameOver = page.getByTestId('preact-game-over-screen');
    await expect(preactGameOver).toBeVisible();
    await expect(preactGameOver).toContainText('Game Over');
    await expect(preactGameOver).toContainText(/Core Integrity|Core 무결성/);
    await expect(page.getByTestId('preact-game-over-integrity')).toHaveAttribute('role', 'progressbar');
    await expect(page.getByTestId('preact-game-over-integrity')).toHaveAttribute('aria-valuetext', /^\d+%$/);
    await expect(page.getByTestId('preact-game-over-model-meter')).toHaveAttribute('role', 'progressbar');
    await expect(page.getByTestId('preact-game-over-model-meter')).toHaveAttribute('aria-valuetext', /^\d+%$/);
    await expect(page.getByTestId('preact-game-over-stats')).toHaveAttribute('role', 'list');
    await expect(page.locator('[data-testid^="preact-game-over-stat-"]')).toHaveCount(4);
    await expect(page.getByTestId('preact-game-over-restart')).toBeVisible();
    await expect(page.getByTestId('preact-game-over-main-menu')).toBeVisible();
    await expectLegacyGameOverShadow(page);
    await expect(page.locator('#game-over-stats')).toContainText(/Wave|웨이브/);

    expect(runtimeErrors).toEqual([]);
});

test('desktop shows Preact activity log entries while legacy log entries stay shadowed', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'desktop-only activity log smoke');
    const runtimeErrors = collectRuntimeErrors(page);
    const message = 'System: Preact activity smoke.';

    await startGame(page);
    await page.evaluate(text => {
        const scene = window.__GRADIUM_GAME__?.scene.getScene('MainScene') as any;
        scene.uiManager.logMessage(text, true);
    }, message);

    await expect(page.getByTestId('preact-activity-log')).toBeVisible();
    await expect(page.getByTestId('preact-activity-log')).toContainText(message);
    const activityEntries = page.locator('#preact-activity-log-entries');
    await expect(activityEntries).toHaveAttribute('role', 'log');
    await expect(activityEntries).toHaveAttribute('aria-live', 'polite');
    await expect(activityEntries).toHaveAttribute('aria-relevant', 'additions text');
    await expect(activityEntries.locator('[data-testid^="preact-activity-log-entry-"]').last()).toHaveAttribute('role', 'article');
    const alertFilter = page.getByTestId('preact-activity-log-alerts');
    await expect(alertFilter).toBeVisible();
    await expect(alertFilter).toHaveAttribute('aria-controls', 'preact-activity-log-entries');
    await expect(alertFilter).toHaveAttribute('aria-pressed', 'false');
    await expectLegacyActivityLogShadow(page, message);

    expect(runtimeErrors).toEqual([]);
});

test('desktop shows the Preact tooltip while the legacy tooltip stays shadowed', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'desktop-only tooltip smoke');
    const runtimeErrors = collectRuntimeErrors(page);

    await startGame(page);
    const corePoint = await getScreenPointForTile(page, 0, 0);
    await page.mouse.move(corePoint.x, corePoint.y);

    const preactTooltip = page.getByTestId('preact-tooltip');
    await expect(preactTooltip).toBeVisible();
    await expect(preactTooltip).toHaveAttribute('aria-labelledby', 'preact-tooltip-title');
    await expect(preactTooltip).toHaveAttribute('aria-describedby', 'preact-tooltip-body');
    await expect(preactTooltip).toContainText(/Neural Core|CORE|Type|유형/);
    await expectLegacyTooltipShadow(page);

    expect(runtimeErrors).toEqual([]);
});

test('desktop restores keyboard focus to the canvas after closing modals', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'desktop-only focus smoke');
    const runtimeErrors = collectRuntimeErrors(page);

    await startGame(page);
    await page.getByTestId('preact-topbar-settings').click();
    await expect(page.getByTestId('preact-settings-modal')).toBeVisible();
    await expectLegacySettingsShadow(page);
    await page.getByTestId('preact-settings-close').click();
    await expect(page.locator('#settings-modal')).toBeHidden();

    await expect.poll(async () => page.evaluate(() => document.activeElement?.tagName)).toBe('CANVAS');

    expect(runtimeErrors).toEqual([]);
});

test('desktop defaults to Korean and switches to English', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'desktop-only language smoke');
    const runtimeErrors = collectRuntimeErrors(page);

    await startGame(page);
    await expect(page.locator('#tutorial-panel')).toContainText(/(Core 목표|자원 확인|전력망 확장)/, { timeout: 5000 });
    await expectLegacyTutorialPanelShadow(page);
    await expect(page.getByTestId('preact-top-bar')).toContainText('전력 출력');
    await expect(page.getByTestId('preact-stat-label-power')).toContainText('전력 출력');
    await expect(page.locator('.hud-label').filter({ hasText: '전력 출력' })).toBeAttached();

    await page.getByTestId('preact-topbar-settings').click();
    const preactSettings = page.getByTestId('preact-settings-modal');
    await expect(preactSettings).toBeVisible();
    await expectLegacySettingsShadow(page);
    await expect(page.locator('#settings-modal')).toContainText('시스템 설정');
    await preactSettings.getByRole('button', { name: 'English' }).click();

    await expect(page.locator('#settings-modal')).toContainText('System Settings');
    await expect(page.getByTestId('preact-top-bar')).toContainText('Power Output');
    await expect(page.getByTestId('preact-stat-label-power')).toContainText('Power Output');
    await expect(page.locator('.hud-label').filter({ hasText: 'Power Output' })).toBeAttached();
    await expect(page.locator('#tutorial-panel')).toContainText(/(Core objective|Resource check|Expand power grid)/);

    await page.getByTestId('preact-settings-close').click();
    expect(runtimeErrors).toEqual([]);
});

test('mobile layout exposes action controls without blocking startup', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('mobile-'), 'mobile-only smoke');
    const runtimeErrors = collectRuntimeErrors(page);

    await startGame(page);
    await page.waitForFunction(() => document.body.classList.contains('mobile-layout'));

    await expectLegacyMobileControlsShadow(page);
    if (isShortLandscape(page)) {
        await expect(page.getByTestId('preact-mobile-action-bar')).toBeHidden();
        await expect(page.getByTestId('preact-mobile-build-summary')).toBeHidden();
    } else {
        await expect(page.getByTestId('preact-mobile-action-bar')).toBeVisible();
        const preactBuildSummary = page.getByTestId('preact-mobile-build-summary');
        await expect(preactBuildSummary).toBeVisible();
        await expect(preactBuildSummary).toHaveAttribute('aria-labelledby', 'preact-mobile-build-summary-title');
        await expect(preactBuildSummary).toHaveAttribute('aria-describedby', 'preact-mobile-build-summary-detail');
        await expect(preactBuildSummary).toHaveAttribute('aria-live', 'polite');
    }
    await expect(page.locator('#mobile-action-rotate')).toBeAttached();
    await expect(page.locator('#mobile-action-remove')).toBeAttached();
    await expect(page.locator('#mobile-action-cable')).toBeAttached();
    await expect(page.locator('#mobile-action-cancel')).toBeAttached();
    await expect(page.locator('#mobile-action-defense')).toBeAttached();
    await expect(page.locator('#mobile-action-power')).toBeAttached();
    if (!isShortLandscape(page)) {
        await expect(page.getByTestId('preact-mobile-action-rotate')).toBeVisible();
        await expect(page.getByTestId('preact-mobile-action-toolbar')).toHaveAttribute('role', 'toolbar');
        await expect(page.getByTestId('preact-mobile-action-power')).toBeVisible();
    }

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

    await clickMobileAction(page, 'rotate');
    await expect.poll(async () => (await getMainSceneState(page)).currentRotation).toBe(1);

    await clickMobileAction(page, 'remove');
    await expect.poll(async () => (await getMainSceneState(page)).selectedBuildingType).toBe('REMOVE');
    await expect(page.locator('#mobile-action-remove')).toHaveClass(/active/);
    if (!isShortLandscape(page)) {
        await expect(page.getByTestId('preact-mobile-action-remove')).toHaveAttribute('aria-pressed', 'true');
    }

    await clickMobileAction(page, 'cancel');
    await expect.poll(async () => (await getMainSceneState(page)).selectedBuildingType).toBe('DATA_DOWNLOADER');

    await clickMobileAction(page, 'cable');
    await expect.poll(async () => (await getMainSceneState(page)).selectedBuildingType).toBe('BASIC');
    await expect(page.locator('#mobile-action-cable')).toHaveClass(/active/);
    if (!isShortLandscape(page)) {
        const preactCableAction = page.getByTestId('preact-mobile-action-cable');
        await expect(preactCableAction).toHaveAttribute('aria-controls', 'preact-mobile-cable-menu');
        await expect(preactCableAction).toHaveAttribute('aria-haspopup', 'menu');
        await expect(preactCableAction).toHaveAttribute('aria-expanded', 'false');
        await expect(preactCableAction).toHaveAttribute('aria-pressed', 'true');
    }

    await clickMobileAction(page, 'cancel');
    await expect.poll(async () => (await getMainSceneState(page)).selectedBuildingType).toBe('DATA_DOWNLOADER');
    await expect.poll(async () => (await getMainSceneState(page)).cableState).toBe('IDLE');
    await expect.poll(async () => (await getMainSceneState(page)).mobileActionStatus).toBe(null);

    if (!isShortLandscape(page)) {
        await page.evaluate(() => {
            const scene = window.__GRADIUM_GAME__?.scene.getScene('MainScene') as any;
            scene.researchManager.loadUnlockedResearch(['TECH_FIBER_OPTIC']);
            scene.uiManager.updateMobileControls();
        });
        await page.getByTestId('preact-mobile-action-cable').click();
        await expect(page.getByTestId('preact-mobile-action-cable')).toHaveAttribute('aria-expanded', 'true');
        await expect(page.getByTestId('preact-mobile-cable-menu')).toHaveAttribute('role', 'menu');
        await expect(page.getByTestId('preact-mobile-cable-BASIC')).toHaveAttribute('role', 'menuitemradio');
        await expect(page.getByTestId('preact-mobile-cable-FIBER')).toHaveAttribute('role', 'menuitemradio');
        await expect(page.getByTestId('preact-mobile-cable-FIBER')).toHaveAttribute('aria-checked', 'false');
        await page.getByTestId('preact-mobile-cable-FIBER').focus();
        await page.getByTestId('preact-mobile-cable-FIBER').press('Enter');
        await expect.poll(async () => (await getMainSceneState(page)).selectedBuildingType).toBe('FIBER');
        await page.getByTestId('preact-mobile-action-cable').click();
        await expect(page.getByTestId('preact-mobile-cable-FIBER')).toHaveAttribute('aria-checked', 'true');
        await page.getByTestId('preact-mobile-action-cancel').click();
    }

    await clickMobileAction(page, 'defense');
    await expect.poll(async () => (await getMainSceneState(page)).showDefenseRange).toBe(true);
    await expect(page.locator('#mobile-action-defense')).toHaveClass(/active/);

    await clickMobileAction(page, 'power');
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

    await selectBuildCategory(page, 'PRODUCTION');
    await selectBuildTool(page, 'PROCESSOR');
    await page.touchscreen.tap(targetPoint.x, targetPoint.y);
    await expectBuildingCount(page, 'PROCESSOR', 1);

    await clickMobileAction(page, 'cable');
    await expect.poll(async () => (await getMainSceneState(page)).selectedBuildingType).toBe('BASIC');

    await page.touchscreen.tap(sourcePoint.x, sourcePoint.y);
    await expect.poll(async () => (await getMainSceneState(page)).cableState).toBe('CABLE_START');
    await expect.poll(async () => (await getMainSceneState(page)).mobileActionStatus).toBe('케이블: 끝 지점 선택');

    await page.touchscreen.tap(targetPoint.x, targetPoint.y);
    await expect.poll(async () => (await getMainSceneState(page)).cableCount).toBe(1);
    await expect.poll(async () => (await getMainSceneState(page)).cableState).toBe('IDLE');

    await clickMobileAction(page, 'cancel');
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

    await selectBuildCategory(page, 'PRODUCTION');
    await selectBuildTool(page, 'PROCESSOR');
    await page.mouse.click(targetPoint.x, targetPoint.y);
    await expectBuildingCount(page, 'PROCESSOR', 1);

    await selectBuildCategory(page, 'LOGISTICS');
    await selectBuildTool(page, 'BASIC');
    await expect.poll(async () => (await getMainSceneState(page)).selectedBuildingType).toBe('BASIC');

    await page.mouse.click(sourcePoint.x, sourcePoint.y);
    await page.mouse.click(targetPoint.x, targetPoint.y);
    await expect.poll(async () => (await getMainSceneState(page)).cableCount).toBe(1);

    await selectBuildTool(page, 'REMOVE');
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

    await page.evaluate(() => (document.querySelector('canvas') as HTMLCanvasElement | null)?.focus());
    await page.keyboard.press('R');
    await expect.poll(async () => (await getMainSceneState(page)).currentRotation).toBe(1);

    await pressGameHotkey(page, 'F1', async () => (await getMainSceneState(page)).showDefenseRange);
    await pressGameHotkey(page, 'F2', async () => (await getMainSceneState(page)).showPowerGrid);

    await selectBuildCategory(page, 'LOGISTICS');
    await selectBuildTool(page, 'CONVEYOR');
    const conveyorPoint = await getScreenPointForTile(page, -224, -32);
    await page.mouse.click(conveyorPoint.x, conveyorPoint.y);
    await expectBuildingCount(page, 'CONVEYOR', 1);

    await selectBuildTool(page, 'STORAGE');
    const storagePoint = await getScreenPointForTile(page, -224, -96);
    await page.mouse.click(storagePoint.x, storagePoint.y);
    await expectBuildingCount(page, 'STORAGE', 2);

    await selectBuildCategory(page, 'PRODUCTION');
    await selectBuildTool(page, 'WEIGHT_TRAINER');
    const trainerPoint = await getScreenPointForTile(page, -160, -96);
    await page.mouse.click(trainerPoint.x, trainerPoint.y);
    await expectBuildingCount(page, 'WEIGHT_TRAINER', 1);

    await selectBuildCategory(page, 'DEFENSE');
    await selectBuildTool(page, 'CLASSIFIER');
    const classifierPoint = await getScreenPointForTile(page, -128, -128);
    await page.mouse.click(classifierPoint.x, classifierPoint.y);
    await expectBuildingCount(page, 'CLASSIFIER', 1);

    await page.mouse.click(classifierPoint.x, classifierPoint.y, { button: 'right' });
    await expectBuildingCount(page, 'CLASSIFIER', 0);

    await page.getByTestId('preact-topbar-settings').click();
    const preactSettings = page.getByTestId('preact-settings-modal');
    await expect(preactSettings).toBeVisible();
    await expectLegacySettingsShadow(page);
    await expect(preactSettings.getByRole('tab', { name: /^(게임|Game)$/ })).toHaveAttribute('aria-controls', 'preact-settings-panel');
    await expect(preactSettings.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'preact-settings-tab-game');
    await preactSettings.getByRole('button', { name: '2x' }).click();
    await expect.poll(async () => (await getMainSceneState(page)).gameSpeed).toBe(2);
    await preactSettings.getByRole('tab', { name: /^(그래픽|Graphics)$/ }).click();
    await expect(preactSettings.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'preact-settings-tab-graphics');
    await expect(preactSettings.getByRole('button', { name: /Bloom/ })).toHaveAttribute('aria-pressed', /^(true|false)$/);
    await preactSettings.getByRole('tab', { name: /^(시스템|System)$/ }).click();
    await expect(preactSettings.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'preact-settings-tab-system');
    await preactSettings.getByRole('button', { name: /^(저장|Save)$/ }).click();
    await expect.poll(async () => (await getMainSceneState(page)).savedGameExists).toBe(true);
    await page.getByTestId('preact-settings-close').click();
    await expect(page.locator('#settings-modal')).toBeHidden();

    await unlockFirstDefenseProgress(page);
    await expect(page.locator('#btn-research')).toHaveCount(0);
    await expect(page.locator('#research-modal')).toHaveCount(0);

    expect(runtimeErrors).toEqual([]);
});

test('desktop operates the Preact training lab panel', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'desktop-only training lab smoke');
    const runtimeErrors = collectRuntimeErrors(page);

    await page.addInitScript(() => {
        localStorage.setItem('gradium_tutorial_completed', 'true');
        localStorage.setItem('gradium_tutorial_step', '12');
    });
    await startGame(page);

    await page.evaluate(() => {
        const scene = window.__GRADIUM_GAME__?.scene.getScene('MainScene') as any;
        scene.buildingManager.place(-192, -160, 'MODEL_TRAINING_LAB', 0, { skipCost: true });
    });

    await page.getByTestId('preact-topbar-lab').click();
    const labModal = page.getByTestId('preact-training-lab-modal');
    const labPanel = labModal.getByRole('tabpanel');
    await expect(labModal).toBeVisible();
    await expectLegacyTrainingLabShadow(page);
    await expect(page.getByTestId('preact-training-lab-tab-DEFENSE')).toHaveAttribute('aria-controls', 'preact-training-lab-panel');
    await expect(labPanel).toHaveAttribute('aria-labelledby', 'preact-training-lab-tab-DEFENSE');
    await expect(page.getByTestId('preact-training-lab-row-CLASSIFIER')).toHaveAttribute('aria-labelledby', 'preact-training-lab-row-CLASSIFIER-title');
    await expect(page.getByTestId('preact-training-lab-row-CLASSIFIER')).toHaveAttribute('aria-describedby', 'preact-training-lab-row-CLASSIFIER-detail');
    await expect(page.getByTestId('preact-training-lab-row-CLASSIFIER-data-progress')).toHaveAttribute('role', 'progressbar');
    await expect(page.getByTestId('preact-training-lab-row-CLASSIFIER-data-progress')).toHaveAttribute('aria-valuetext', /%$/);
    await expect(page.getByTestId('preact-training-lab-row-CLASSIFIER-work-progress')).toHaveAttribute('role', 'progressbar');
    await expect(page.getByTestId('preact-training-lab-row-CLASSIFIER-work-progress')).toHaveAttribute('aria-valuetext', /%$/);

    await page.getByTestId('preact-training-lab-auto').click();
    await expect(page.getByTestId('preact-training-lab-auto')).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(async () => {
        return page.evaluate(() => {
            const scene = window.__GRADIUM_GAME__?.scene.getScene('MainScene') as any;
            return {
                autoEnabled: scene.trainingPlanner.autoEnabled,
                mode: scene.trainingPlanner.mode
            };
        });
    }).toEqual({ autoEnabled: false, mode: 'MANUAL_LOCK' });

    await page.getByTestId('preact-training-lab-reward-CLASSIFIER-damage').click();
    await expect.poll(async () => {
        return page.evaluate(() => {
            const scene = window.__GRADIUM_GAME__?.scene.getScene('MainScene') as any;
            return scene.getDefenseModelState('CLASSIFIER').trainingRewardPreference;
        });
    }).toBe('damage');

    await page.getByTestId('preact-training-lab-row-FILTER').click();
    await expect.poll(async () => {
        return page.evaluate(() => {
            const scene = window.__GRADIUM_GAME__?.scene.getScene('MainScene') as any;
            return scene.trainingPlanner.activeJobId;
        });
    }).toBe('DEFENSE_FILTER');

    await page.getByTestId('preact-training-lab-tab-SYSTEM').click();
    await expect(page.getByTestId('preact-training-lab-tab-SYSTEM')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('preact-training-lab-tab-SYSTEM')).toHaveAttribute('aria-controls', 'preact-training-lab-panel');
    await expect(labPanel).toHaveAttribute('aria-labelledby', 'preact-training-lab-tab-SYSTEM');

    await page.getByTestId('preact-training-lab-close').click();
    await expect(page.getByTestId('preact-training-lab-modal')).toHaveCount(0);
    await expect(page.locator('#training-lab-modal')).toBeHidden();
    await expect(page.locator('#training-lab-modal')).not.toHaveAttribute('data-preact-shadow', 'true');
    await expect.poll(async () => page.evaluate(() => document.activeElement?.tagName)).toBe('CANVAS');

    expect(runtimeErrors).toEqual([]);
});
