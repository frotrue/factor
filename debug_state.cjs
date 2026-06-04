const { chromium } = require('@playwright/test');

async function main() {
    console.log('Connecting to browser on 9222...');
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const contexts = browser.contexts();
    if (contexts.length === 0) {
        console.log('No contexts found.');
        await browser.close();
        return;
    }
    const pages = contexts[0].pages();
    if (pages.length === 0) {
        console.log('No pages found.');
        await browser.close();
        return;
    }
    const page = pages[0];
    console.log('Connected! Current URL:', page.url());

    const state = await page.evaluate(() => {
        const game = window.__GRADIUM_GAME__;
        if (!game) return { error: 'No game instance found' };
        const scene = game.scene.getScene('MainScene');
        if (!scene) return { error: 'No MainScene found' };

        const tm = scene.tutorialManager;
        const activeStep = tm?.steps?.find(s => !s.completed);

        const buildings = [];
        scene.buildingManager?.forEach(b => {
            buildings.push({
                type: b.type,
                x: b.x,
                y: b.y,
                hasPower: b.hasPower
            });
        });

        const cables = Array.from(scene.cableManager?.cables?.keys() || []);

        return {
            mode: scene.mode,
            isTutorialActive: Boolean(tm && !tm.isCompleted()),
            activeStep: activeStep ? {
                id: activeStep.id,
                title: activeStep.title,
                completed: activeStep.completed,
                completionKind: activeStep.completion?.kind
            } : null,
            buildings,
            cables,
            powerGrid: scene.powerManager ? {
                totalProduction: scene.powerManager.totalProduction,
                totalDemand: scene.powerManager.totalDemand,
                net: scene.powerManager.totalProduction - scene.powerManager.totalDemand
            } : null,
            targetType: scene.trainingPlanner?.getTargetType(),
            activeJobId: scene.trainingPlanner?.activeJobId,
            modePlanner: scene.trainingPlanner?.mode,
            modelTargetSetForStep: tm?.modelTargetSetForStep
        };
    });

    console.log('Phaser Game State:', JSON.stringify(state, null, 2));
    await browser.close();
}

main().catch(console.error);
