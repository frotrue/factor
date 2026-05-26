import { expect, Page, test } from '@playwright/test';

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
    await page.waitForFunction(() => {
        const scene = window.__GRADIUM_GAME__?.scene.getScene('MainScene') as any;
        return Boolean(scene?.tutorialManager && scene?.buildingManager && scene?.mapManager);
    });
}

test('tutorial guidance points at valid tiles and can be completed through gameplay events', async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.removeItem('gradium_save');
        localStorage.removeItem('gradium_tutorial_completed');
        localStorage.removeItem('gradium_tutorial_step');
    });

    await startGame(page);

    const guidance = await page.evaluate(() => {
        const scene = window.__GRADIUM_GAME__?.scene.getScene('MainScene') as any;
        scene.tutorialManager.loadState(false, 0);
        const steps = scene.tutorialManager.steps;
        const byId = Object.fromEntries(steps.map((step: any) => [step.id, step]));
        const resourceAt = (x: number, y: number) => scene.mapManager.getResourceAt(x, y);

        return {
            resourceAreas: byId.RESOURCE.visualHints.areas,
            dataGhosts: byId.DATA_SOURCE.visualHints.ghosts,
            processingGhosts: byId.PROCESSING.visualHints.ghosts,
            researchFlows: byId.RESEARCH.visualHints.flows,
            siliconResource: resourceAt(-128, -64),
            energyResource: resourceAt(96, 96),
            downloaderTileResource: resourceAt(-160, -128),
            processorTileResource: resourceAt(-96, -128),
            trainerTileResource: resourceAt(-32, -128)
        };
    });

    expect(guidance.resourceAreas).toEqual(expect.arrayContaining([
        expect.objectContaining({ x: -112, y: -48, kind: 'resource' }),
        expect.objectContaining({ x: 112, y: 112, kind: 'resource' })
    ]));
    expect(guidance.siliconResource).toBe('SILICON');
    expect(guidance.energyResource).toBe('ENERGY');
    expect(guidance.downloaderTileResource).toBeNull();
    expect(guidance.processorTileResource).toBeNull();
    expect(guidance.trainerTileResource).toBeNull();
    expect(guidance.dataGhosts).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'MINER', x: -128, y: -64 }),
        expect.objectContaining({ type: 'DOWNLOAD', x: -160, y: -128 })
    ]));
    expect(guidance.processingGhosts).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'PROCESSOR', x: -96, y: -128 }),
        expect.objectContaining({ type: 'TRAINER', x: -32, y: -128 })
    ]));
    expect(guidance.researchFlows).toEqual(expect.arrayContaining([
        expect.objectContaining({ itemType: 'WEIGHT_UPDATE' })
    ]));

    const completion = await page.evaluate(() => {
        const scene = window.__GRADIUM_GAME__?.scene.getScene('MainScene') as any;
        scene.tutorialManager.loadState(false, 1);

        scene.buildingManager.place(-96, -32, 'POWER_NODE', 0, { skipCost: true });
        scene.buildingManager.place(-128, -64, 'MINER', 0, { skipCost: true });
        scene.buildingManager.place(-160, -128, 'DATA_DOWNLOADER', 0, { skipCost: true });
        scene.buildingManager.place(-128, -32, 'CONVEYOR', 0, { skipCost: true });
        scene.buildingManager.place(-96, -128, 'PROCESSOR', 0, { skipCost: true });
        scene.buildingManager.place(-32, -160, 'CLASSIFIER', 0, { skipCost: true });
        scene.waveManager.startWave();
        const lab = scene.buildingManager.place(32, -128, 'MODEL_TRAINING_LAB', 0, { skipCost: true });
        lab.setTarget('CLASSIFIER');

        return {
            completed: scene.tutorialManager.isCompleted(),
            step: scene.tutorialManager.getSavedStep(),
            labAcceptsWeightUpdate: lab.canAcceptItem('WEIGHT_UPDATE')
        };
    });

    expect(completion).toEqual({
        completed: true,
        step: 7,
        labAcceptsWeightUpdate: true
    });
});
