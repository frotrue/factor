const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

async function run() {
    console.log('Launching browser...');
    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();
    page.on('pageerror', error => console.error('PAGE ERROR:', error.message));
    page.on('console', message => console.log('CONSOLE:', message.text()));

    // Clear localStorage to ensure tutorial starts fresh
    await page.addInitScript(() => {
        localStorage.clear();
    });

    console.log('Navigating to game...');
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('canvas');
    
    // Wait for system initialization
    await page.waitForFunction(() => {
        const scene = window.__GRADIUM_GAME__?.scene.getScene('MainMenuScene');
        return scene?.children?.list?.some(child =>
            child.text === '> 시스템 초기화 <' || child.text === '> Initialize System <'
        );
    });

    console.log('Clicking start button...');
    await page.mouse.click(640, 480);
    await page.waitForSelector('#top-hud');
    console.log('Tutorial started!');

    const getScreenPointForTile = async (x, y) => {
        return page.evaluate(({ x, y }) => {
            const scene = window.__GRADIUM_GAME__?.scene.getScene('MainScene');
            const camera = scene.cameras.main;
            const canvas = document.querySelector('canvas');
            const rect = canvas.getBoundingClientRect();
            return {
                x: rect.left + (x + 16 - camera.worldView.x) * camera.zoom,
                y: rect.top + (y + 16 - camera.worldView.y) * camera.zoom
            };
        }, { x, y });
    };

    const selectTool = async (category, buildingType) => {
        await page.evaluate((cat) => {
            const scene = window.__GRADIUM_GAME__?.scene.getScene('MainScene');
            scene.uiManager.activeCategory = cat;
            scene.uiManager.createBuildingButtons();
        }, category);
        await page.click(`#btn-${buildingType.toLowerCase()}`);
    };

    const getTutorialStep = async () => {
        return page.evaluate(() => {
            const scene = window.__GRADIUM_GAME__?.scene.getScene('MainScene');
            if (!scene || !scene.tutorialManager) return { loading: true };
            const activeStep = scene.tutorialManager.steps.find(step => !step.completed);
            return {
                id: activeStep?.id,
                stepIndex: scene.tutorialManager.getSavedStep(),
                completed: scene.tutorialManager.isCompleted()
            };
        });
    };

    // Fast-forward or automate steps up to Step 11
    let step = await getTutorialStep();
    while (step.loading) {
        await new Promise(r => setTimeout(r, 200));
        step = await getTutorialStep();
    }

    console.log('Starting automated fast-forward...');
    for (let i = 0; i < 200; i++) {
        step = await getTutorialStep();
        if (step.completed || step.id === 'MODEL_LAB') {
            break;
        }

        if (step.id === 'CORE' || step.id === 'RESOURCE') {
            await new Promise(r => setTimeout(r, 500));
        } else if (step.id === 'POWER') {
            await selectTool('POWER', 'POWER_NODE');
            const pt = await getScreenPointForTile(-96, -128);
            await page.mouse.click(pt.x, pt.y);
            await new Promise(r => setTimeout(r, 500));
        } else if (step.id === 'MINER') {
            await selectTool('EXTRACTION', 'MINER');
            const pt = await getScreenPointForTile(-160, -96);
            await page.mouse.click(pt.x, pt.y);
            await new Promise(r => setTimeout(r, 500));
        } else if (step.id === 'STORAGE') {
            await selectTool('LOGISTICS', 'STORAGE');
            const pt = await getScreenPointForTile(-192, 0);
            await page.mouse.click(pt.x, pt.y);
            await new Promise(r => setTimeout(r, 500));
        } else if (step.id === 'DOWNLOADER') {
            await selectTool('EXTRACTION', 'DATA_DOWNLOADER');
            const pt = await getScreenPointForTile(128, -32);
            await page.mouse.click(pt.x, pt.y);
            await new Promise(r => setTimeout(r, 500));
        } else if (step.id === 'CABLE') {
            const hasProc = await page.evaluate(() => Boolean(window.__GRADIUM_GAME__?.scene.getScene('MainScene').buildingManager.get('160,-32')));
            if (!hasProc) {
                await selectTool('PRODUCTION', 'PROCESSOR');
                const pt = await getScreenPointForTile(160, -32);
                await page.mouse.click(pt.x, pt.y);
            } else {
                await selectTool('LOGISTICS', 'BASIC');
                const startPt = await getScreenPointForTile(128, -32);
                const endPt = await getScreenPointForTile(160, -32);
                await page.mouse.click(startPt.x, startPt.y);
                await page.mouse.click(endPt.x, endPt.y);
            }
            await new Promise(r => setTimeout(r, 500));
        } else if (step.id === 'PROCESSOR') {
            await new Promise(r => setTimeout(r, 500));
        } else if (step.id === 'TRAINER') {
            const hasTrainer = await page.evaluate(() => Boolean(window.__GRADIUM_GAME__?.scene.getScene('MainScene').buildingManager.get('160,64')));
            if (!hasTrainer) {
                await selectTool('PRODUCTION', 'WEIGHT_TRAINER');
                const pt = await getScreenPointForTile(160, 64);
                await page.mouse.click(pt.x, pt.y);
            } else {
                await selectTool('LOGISTICS', 'BASIC');
                const startPt = await getScreenPointForTile(160, -32);
                const endPt = await getScreenPointForTile(160, 64);
                await page.mouse.click(startPt.x, startPt.y);
                await page.mouse.click(endPt.x, endPt.y);
            }
            await new Promise(r => setTimeout(r, 500));
        } else if (step.id === 'DEFENSE') {
            await selectTool('DEFENSE', 'CLASSIFIER');
            const pt = await getScreenPointForTile(-64, -128);
            await page.mouse.click(pt.x, pt.y);
            await new Promise(r => setTimeout(r, 500));
        } else if (step.id === 'FIRST_WAVE') {
            const active = await page.evaluate(() => window.__GRADIUM_GAME__?.scene.getScene('MainScene').waveManager.waveActive);
            if (!active) {
                await page.evaluate(() => window.__GRADIUM_GAME__?.scene.getScene('MainScene').waveManager.startWave());
            }
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    console.log('Reached step:', await getTutorialStep());

    // Place Model Lab
    console.log('Placing Model Training Lab...');
    
    await page.evaluate(() => {
        const scene = window.__GRADIUM_GAME__?.scene.getScene('MainScene');
        if (scene) {
            scene.cameras.main.scrollY += 160;
            scene.cameras.main.clampToBounds();
        }
    });

    const diagnostics = await page.evaluate(() => {
        const scene = window.__GRADIUM_GAME__?.scene.getScene('MainScene');
        if (!scene) return { error: 'No MainScene' };
        
        const type = 'MODEL_TRAINING_LAB';
        const bConfig = scene.uiManager.buildableData[type] || window.CONFIG?.BUILDINGS[type];
        const w = 2;
        const h = 2;
        const x = 160;
        const y = 96;
        
        const blockedDetails = [];
        for (let dx = 0; dx < w; dx++) {
            for (let dy = 0; dy < h; dy++) {
                const tx = x + dx * 32;
                const ty = y + dy * 32;
                blockedDetails.push({
                    tx, ty,
                    inBounds: scene.mapManager.isAreaWithinBuildBounds(tx, ty, 1, 1),
                    hasBuilding: scene.buildingManager.has(`${tx},${ty}`),
                    buildingType: scene.buildingManager.get(`${tx},${ty}`)?.type,
                    terrainBlocked: scene.mapManager.isTerrainBlocked(tx, ty)
                });
            }
        }
        
        return {
            siliconCount: scene.inventoryManager?.getResourceCount('SILICON'),
            isBlocked: scene.isBlocked(x, y, w, h),
            blockedDetails,
            allowedBuildings: scene.tutorialManager?.getAllowedBuildings(),
            selectedBuildingType: scene.uiManager.getSelectedBuildingType()
        };
    });
    console.log('Placement Diagnostics:', diagnostics);

    await selectTool('PRODUCTION', 'MODEL_TRAINING_LAB');
    const selectedToolType = await page.evaluate(() => {
        const scene = window.__GRADIUM_GAME__?.scene.getScene('MainScene');
        return scene.uiManager.getSelectedBuildingType();
    });
    console.log('Selected Tool Type after selectTool:', selectedToolType);

    const labPt = await getScreenPointForTile(160, 96);
    console.log(`Clicking to place lab at screen coords: x=${labPt.x}, y=${labPt.y}`);
    
    const blockingElement = await page.evaluate(({x, y}) => {
        const el = document.elementFromPoint(x, y);
        return el ? {
            tagName: el.tagName,
            id: el.id,
            className: el.className,
            outerHTML: el.outerHTML.substring(0, 150),
            isOverUI: window.__GRADIUM_GAME__?.scene.getScene('MainScene')?.inputController?.isPointerOverDomUI({ x, y })
        } : null;
    }, { x: labPt.x, y: labPt.y });
    console.log('DOM Element at click position:', blockingElement);

    await page.mouse.click(labPt.x, labPt.y);
    await new Promise(r => setTimeout(r, 1000));

    const checkLabExists = await page.evaluate(() => {
        const scene = window.__GRADIUM_GAME__?.scene.getScene('MainScene');
        const labs = scene.buildingManager.getByType('MODEL_TRAINING_LAB');
        return labs.map(l => ({ x: l.x, y: l.y, type: l.type }));
    });
    console.log('Labs on board:', checkLabExists);

    // Connect cable
    console.log('Connecting Cable...');
    await selectTool('LOGISTICS', 'BASIC');
    const startPt = await getScreenPointForTile(160, 64);
    const endPt = await getScreenPointForTile(160, 96);
    await page.mouse.click(startPt.x, startPt.y);
    await page.mouse.click(endPt.x, endPt.y);
    await new Promise(r => setTimeout(r, 1000));

    const checkCableConnected = await page.evaluate(() => {
        const scene = window.__GRADIUM_GAME__?.scene.getScene('MainScene');
        return scene.cableManager.cables.has(scene.cableManager.makeCableId('160,64', '160,96'));
    });
    console.log('Cable connected:', checkCableConnected);

    // Inspect before setTarget
    const beforeTarget = await page.evaluate(() => {
        const scene = window.__GRADIUM_GAME__?.scene.getScene('MainScene');
        const lab = scene.buildingManager.getByType('MODEL_TRAINING_LAB')[0];
        if (!lab) return { error: 'No lab found' };
        return {
            targetType: lab.targetType,
            activeJobId: scene.trainingPlanner.activeJobId,
            mode: scene.trainingPlanner.mode,
            modelTargetSetForStep: scene.tutorialManager.modelTargetSetForStep
        };
    });
    console.log('Before setTarget:', beforeTarget);

    // Call setTarget
    console.log('Calling setTarget("CLASSIFIER")...');
    const callResult = await page.evaluate(() => {
        try {
            const scene = window.__GRADIUM_GAME__?.scene.getScene('MainScene');
            const lab = scene.buildingManager.getByType('MODEL_TRAINING_LAB')[0];
            if (!lab) return { error: 'No lab' };
            lab.setTarget('CLASSIFIER');
            return {
                targetType: lab.targetType,
                activeJobId: scene.trainingPlanner.activeJobId,
                mode: scene.trainingPlanner.mode,
                modelTargetSetForStep: scene.tutorialManager.modelTargetSetForStep,
                tutorialCompleted: scene.tutorialManager.isCompleted()
            };
        } catch (e) {
            return { error: e.message, stack: e.stack };
        }
    });
    console.log('After setTarget:', callResult);

    // Wait a bit and check again
    await new Promise(r => setTimeout(r, 1000));
    const finalStep = await getTutorialStep();
    console.log('Final tutorial step:', finalStep);

    await browser.close();
}

run().catch(console.error);
