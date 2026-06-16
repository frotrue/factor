import { expect, Page, test } from '@playwright/test';

async function startGame(page: Page): Promise<void> {
    const viewport = page.viewportSize()!;
    await page.goto('/');
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
    if (viewport.width > 980 && viewport.height > 520) {
        await expect(page.locator('#top-hud')).toBeAttached();
        await expect(page.locator('#top-hud')).toBeHidden();
        await expect(page.locator('#top-hud')).toHaveAttribute('data-preact-shadow', 'true');
        await expect(page.getByTestId('preact-top-bar')).toBeVisible();
    } else {
        await page.waitForFunction(() => document.body.classList.contains('mobile-layout'));
        await expect(page.locator('#top-hud')).toBeVisible();
        await expect(page.getByTestId('preact-top-bar')).toBeAttached();
    }
    if (viewport.width > 1180) {
        await expect(page.getByTestId('preact-tutorial-panel')).toBeVisible();
    } else {
        await expect(page.getByTestId('preact-tutorial-panel')).toBeAttached();
    }
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
        const baselineThroughput = scene.researchManager.getResearchThroughput();
        const center = scene.buildingManager.place(160, 128, 'RESEARCH_OPERATIONS_CENTER', 0, { skipCost: true });
        center.hasPower = true;

        return {
            completed: scene.tutorialManager.isCompleted(),
            step: scene.tutorialManager.getSavedStep(),
            centerAcceptsWeightUpdate: center.canAcceptItem('WEIGHT_UPDATE'),
            hasTrainingTargetApi: typeof center.setTarget === 'function',
            baselineThroughput,
            throughputWithRoc: scene.researchManager.getResearchThroughput()
        };
    });

    expect(completion.completed).toBe(true);
    expect(completion.step).toBe(12);
    expect(completion.centerAcceptsWeightUpdate).toBe(false);
    expect(completion.hasTrainingTargetApi).toBe(false);
    expect(completion.throughputWithRoc).toBeGreaterThan(completion.baselineThroughput);

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
