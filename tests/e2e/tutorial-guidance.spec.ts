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
            minerGhosts: byId.MINER.visualHints.ghosts,
            downloaderGhosts: byId.DOWNLOADER.visualHints.ghosts,
            processorGhosts: byId.PROCESSOR.visualHints.ghosts,
            trainerGhosts: byId.TRAINER.visualHints.ghosts,
            siliconResource: resourceAt(-128, -64),
            oldSiliconGuideTile: resourceAt(-32, -32),
            energyResource: resourceAt(96, 96),
            downloaderTileResource: resourceAt(128, -32),
            processorTileResource: resourceAt(160, -32),
            trainerTileResource: resourceAt(160, 64)
        };
    });

    expect(guidance.resourceAreas).toEqual(expect.arrayContaining([
        expect.objectContaining({ x: -112, y: -48, kind: 'resource', radius: 52 }),
        expect.objectContaining({ x: 112, y: 112, kind: 'resource' })
    ]));
    expect(guidance.siliconResource).toBe('SILICON');
    expect(guidance.oldSiliconGuideTile).toBeNull();
    expect(guidance.energyResource).toBe('ENERGY');
    expect(guidance.downloaderTileResource).toBeNull();
    expect(guidance.processorTileResource).toBeNull();
    expect(guidance.trainerTileResource).toBeNull();
    expect(guidance.minerGhosts).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'MINER', x: -160, y: -96 })
    ]));
    expect(guidance.downloaderGhosts).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'DOWNLOAD', x: 128, y: -32 })
    ]));
    expect(guidance.processorGhosts).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'PROCESSOR', x: 160, y: -32 })
    ]));
    expect(guidance.trainerGhosts).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'TRAINER', x: 160, y: 64 })
    ]));

    const completion = await page.evaluate(() => {
        const scene = window.__GRADIUM_GAME__?.scene.getScene('MainScene') as any;
        const tutorialManager = scene.tutorialManager as any;
        tutorialManager.loadState(false, 2);

        scene.buildingManager.place(-96, -128, 'POWER_NODE', 0, { skipCost: true });
        tutorialManager.checkActiveStepCompletion();

        const miner = scene.buildingManager.place(-160, -96, 'MINER', 0, { skipCost: true });
        miner.outputBuffer.push('SILICON');
        tutorialManager.checkActiveStepCompletion();

        scene.buildingManager.place(-192, 0, 'STORAGE', 0, { skipCost: true });

        const downloader = scene.buildingManager.place(128, -32, 'DATA_DOWNLOADER', 0, { skipCost: true });
        downloader.outputBuffer.push('RAW_DATA');
        tutorialManager.checkActiveStepCompletion();

        const processor = scene.buildingManager.place(160, -32, 'PROCESSOR', 0, { skipCost: true });
        scene.cableManager.connect('128,-32', '160,-32', 'BASIC');
        tutorialManager.checkActiveStepCompletion();

        processor.outputBuffer.push('LABELED_DATA');
        tutorialManager.checkActiveStepCompletion();

        const trainer = scene.buildingManager.place(160, 64, 'WEIGHT_TRAINER', 0, { skipCost: true });
        trainer.outputBuffer.push('WEIGHT_UPDATE');
        tutorialManager.checkActiveStepCompletion();

        scene.buildingManager.place(-32, -224, 'CLASSIFIER', 0, { skipCost: true });
        scene.waveManager.startWave();
        scene.waveManager.endWave();
        const lab = scene.buildingManager.place(160, 128, 'MODEL_TRAINING_LAB', 0, { skipCost: true });
        lab.setTarget('CLASSIFIER');

        return {
            completed: scene.tutorialManager.isCompleted(),
            step: scene.tutorialManager.getSavedStep(),
            labAcceptsWeightUpdate: lab.canAcceptItem('WEIGHT_UPDATE')
        };
    });

    expect(completion).toEqual({
        completed: true,
        step: 12,
        labAcceptsWeightUpdate: true
    });

    await page.waitForFunction(() => {
        const scene = window.__GRADIUM_GAME__?.scene.getScene('MainScene') as any;
        return scene?.mode === 'campaign' && scene?.mapManager?.mapType === 'random' && !scene?.tutorialManager;
    });

    const campaignStart = await page.evaluate(() => {
        const scene = window.__GRADIUM_GAME__?.scene.getScene('MainScene') as any;
        const tutorialBuildingKeys = [
            '-96,-128',
            '-160,-96',
            '-192,0',
            '128,-32',
            '160,-32',
            '160,64',
            '-32,-224',
            '160,128'
        ];
        return {
            mode: scene.mode,
            mapType: scene.mapManager.mapType,
            hasTutorialFactory: tutorialBuildingKeys.some(key => Boolean(scene.buildingManager.get(key))),
            campaignSaveExists: Boolean(localStorage.getItem('gradium_save')),
            tutorialCompleted: localStorage.getItem('gradium_tutorial_completed')
        };
    });

    expect(campaignStart).toEqual({
        mode: 'campaign',
        mapType: 'random',
        hasTutorialFactory: false,
        campaignSaveExists: false,
        tutorialCompleted: 'true'
    });
});
