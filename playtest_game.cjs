const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

async function run() {
    const screenshotDir = path.join(__dirname, 'playtest_screenshots');
    if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir);
    }
    
    console.log('Launching browser...');
    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();
    
    // Listen to console and page errors
    page.on('pageerror', error => console.error('PAGE ERROR:', error.message));
    page.on('console', message => {
        if (message.type() === 'error') {
            console.error('CONSOLE ERROR:', message.text());
        } else {
            console.log('CONSOLE:', message.text());
        }
    });

    // Clear localStorage to ensure tutorial starts fresh
    await page.addInitScript(() => {
        localStorage.clear();
    });

    console.log('Navigating to http://localhost:5173/...');
    await page.goto('http://localhost:5173/');
    
    console.log('Waiting for canvas...');
    await page.waitForSelector('canvas');
    
    // Wait for system initialization text
    await page.waitForFunction(() => {
        const scene = window.__GRADIUM_GAME__?.scene.getScene('MainMenuScene');
        return scene?.children?.list?.some(child =>
            child.text === '> 시스템 초기화 <' || child.text === '> Initialize System <'
        );
    });

    console.log('Taking screenshot of Main Menu...');
    await page.screenshot({ path: path.join(screenshotDir, '01_main_menu.png') });
    
    console.log('Clicking start button...');
    await page.mouse.click(640, 480); // width/2 = 640, height/2 + 120 = 480
    
    console.log('Waiting for Top HUD...');
    await page.waitForSelector('#top-hud');
    
    console.log('Tutorial started!');
    
    // Function to check state
    const getTutorialStep = async () => {
        return page.evaluate(() => {
            const scene = window.__GRADIUM_GAME__?.scene.getScene('MainScene');
            if (!scene || !scene.tutorialManager) return { loading: true };
            const activeStep = scene.tutorialManager.steps.find(step => !step.completed);
            return {
                id: activeStep?.id,
                title: activeStep?.title,
                completed: scene.tutorialManager.isCompleted(),
                stepIndex: scene.tutorialManager.getSavedStep()
            };
        });
    };

    // Helper to get tile screen point
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

    // Helper to select a tool by switching category and clicking the button
    const selectTool = async (category, buildingType) => {
        await page.evaluate((cat) => {
            const scene = window.__GRADIUM_GAME__?.scene.getScene('MainScene');
            scene.uiManager.activeCategory = cat;
            scene.uiManager.createBuildingButtons();
        }, category);
        await page.click(`#btn-${buildingType.toLowerCase()}`);
    };

    // Let's loop and play step-by-step
    let lastStepId = '';
    for (let loop = 0; loop < 250; loop++) {
        const step = await getTutorialStep();
        if (step.loading) {
            console.log('MainScene is loading...');
            await new Promise(r => setTimeout(r, 500));
            continue;
        }
        if (step.completed) {
            console.log('Tutorial is completed!');
            await page.screenshot({ path: path.join(screenshotDir, '13_tutorial_completed.png') });
            break;
        }
        
        if (step.id !== lastStepId) {
            console.log(`Step ${step.stepIndex}: ${step.id} - ${step.title}`);
            await page.screenshot({ path: path.join(screenshotDir, `step_${step.stepIndex}_${step.id}.png`) });
            lastStepId = step.id;
        }
        
        // Let's automate the inputs based on step
        if (step.id === 'CORE') {
            // Auto complete, wait
            await new Promise(r => setTimeout(r, 500));
        } else if (step.id === 'RESOURCE') {
            // Auto complete, wait
            await new Promise(r => setTimeout(r, 500));
        } else if (step.id === 'POWER') {
            // Place POWER_NODE at -96, -128
            const exists = await page.evaluate(() => {
                const scene = window.__GRADIUM_GAME__?.scene.getScene('MainScene');
                return Boolean(scene.buildingManager.get('-96,-128'));
            });
            if (!exists) {
                console.log('Placing Power Node...');
                await selectTool('POWER', 'POWER_NODE');
                const pt = await getScreenPointForTile(-96, -128);
                await page.mouse.click(pt.x, pt.y);
            }
            await new Promise(r => setTimeout(r, 1000));
        } else if (step.id === 'MINER') {
            // Place MINER at -160, -96
            const exists = await page.evaluate(() => {
                const scene = window.__GRADIUM_GAME__?.scene.getScene('MainScene');
                return Boolean(scene.buildingManager.get('-160,-96'));
            });
            if (!exists) {
                console.log('Placing Miner...');
                await selectTool('EXTRACTION', 'MINER');
                const pt = await getScreenPointForTile(-160, -96);
                await page.mouse.click(pt.x, pt.y);
            }
            await new Promise(r => setTimeout(r, 1000));
        } else if (step.id === 'STORAGE') {
            // Place STORAGE at -192, 0
            const exists = await page.evaluate(() => {
                const scene = window.__GRADIUM_GAME__?.scene.getScene('MainScene');
                return Boolean(scene.buildingManager.get('-192,0'));
            });
            if (!exists) {
                console.log('Placing Storage...');
                await selectTool('LOGISTICS', 'STORAGE');
                const pt = await getScreenPointForTile(-192, 0);
                await page.mouse.click(pt.x, pt.y);
            }
            await new Promise(r => setTimeout(r, 1000));
        } else if (step.id === 'DOWNLOADER') {
            // Place DATA_DOWNLOADER at 128, -32
            const exists = await page.evaluate(() => {
                const scene = window.__GRADIUM_GAME__?.scene.getScene('MainScene');
                return Boolean(scene.buildingManager.get('128,-32'));
            });
            if (!exists) {
                console.log('Placing Downloader...');
                await selectTool('EXTRACTION', 'DATA_DOWNLOADER');
                const pt = await getScreenPointForTile(128, -32);
                await page.mouse.click(pt.x, pt.y);
            }
            await new Promise(r => setTimeout(r, 1000));
        } else if (step.id === 'CABLE') {
            // Place PROCESSOR at 160, -32
            const exists = await page.evaluate(() => {
                const scene = window.__GRADIUM_GAME__?.scene.getScene('MainScene');
                return Boolean(scene.buildingManager.get('160,-32'));
            });
            if (!exists) {
                console.log('Placing Processor...');
                await selectTool('PRODUCTION', 'PROCESSOR');
                const pt1 = await getScreenPointForTile(160, -32);
                await page.mouse.click(pt1.x, pt1.y);
                await new Promise(r => setTimeout(r, 1000));
                continue;
            }
            
            // Connect cable from downloader (128, -32) to processor (160, -32)
            const cableConnected = await page.evaluate(() => {
                const scene = window.__GRADIUM_GAME__?.scene.getScene('MainScene');
                return scene.cableManager.cables.has(scene.cableManager.makeCableId('128,-32', '160,-32'));
            });
            if (!cableConnected) {
                console.log('Connecting Cable...');
                await selectTool('LOGISTICS', 'BASIC');
                const startPt = await getScreenPointForTile(128, -32);
                const endPt = await getScreenPointForTile(160, -32);
                await page.mouse.click(startPt.x, startPt.y);
                await page.mouse.click(endPt.x, endPt.y);
            }
            await new Promise(r => setTimeout(r, 1000));
        } else if (step.id === 'PROCESSOR') {
            // Wait for it to produce LABELED_DATA
            await new Promise(r => setTimeout(r, 1000));
        } else if (step.id === 'TRAINER') {
            // Place WEIGHT_TRAINER at 160, 64
            const exists = await page.evaluate(() => {
                const scene = window.__GRADIUM_GAME__?.scene.getScene('MainScene');
                return Boolean(scene.buildingManager.get('160,64'));
            });
            if (!exists) {
                console.log('Placing Trainer...');
                await selectTool('PRODUCTION', 'WEIGHT_TRAINER');
                const pt = await getScreenPointForTile(160, 64);
                await page.mouse.click(pt.x, pt.y);
                await new Promise(r => setTimeout(r, 1000));
                continue;
            }
            
            // Connect cable from Processor to Trainer
            const cableConnected = await page.evaluate(() => {
                const scene = window.__GRADIUM_GAME__?.scene.getScene('MainScene');
                return scene.cableManager.cables.has(scene.cableManager.makeCableId('160,-32', '160,64'));
            });
            if (!cableConnected) {
                console.log('Connecting Cable to Trainer...');
                await selectTool('LOGISTICS', 'BASIC');
                const startPt = await getScreenPointForTile(160, -32);
                const endPt = await getScreenPointForTile(160, 64);
                await page.mouse.click(startPt.x, startPt.y);
                await page.mouse.click(endPt.x, endPt.y);
            }
            await new Promise(r => setTimeout(r, 1000));
        } else if (step.id === 'DEFENSE') {
            // Place CLASSIFIER at -64, -128 (shift to avoid Top HUD overlap)
            const exists = await page.evaluate(() => {
                const scene = window.__GRADIUM_GAME__?.scene.getScene('MainScene');
                return Boolean(scene.buildingManager.get('-64,-128'));
            });
            if (!exists) {
                console.log('Placing Classifier...');
                await selectTool('DEFENSE', 'CLASSIFIER');
                const pt = await getScreenPointForTile(-64, -128);
                await page.mouse.click(pt.x, pt.y);
            }
            await new Promise(r => setTimeout(r, 1000));
        } else if (step.id === 'FIRST_WAVE') {
            // Start wave by clicking wave start button or using scene
            const waveActive = await page.evaluate(() => {
                const scene = window.__GRADIUM_GAME__?.scene.getScene('MainScene');
                return scene.waveManager.waveActive;
            });
            if (!waveActive) {
                console.log('Starting Wave...');
                await page.evaluate(() => {
                    const scene = window.__GRADIUM_GAME__?.scene.getScene('MainScene');
                    scene.waveManager.startWave();
                });
            }
            // Wait for wave to complete
            for (let i = 0; i < 40; i++) {
                const active = await page.evaluate(() => {
                    const scene = window.__GRADIUM_GAME__?.scene.getScene('MainScene');
                    return scene.waveManager.waveActive;
                });
                if (!active) break;
                await new Promise(r => setTimeout(r, 1000));
            }
            console.log('Wave ended!');
            await new Promise(r => setTimeout(r, 1000));
        } else if (step.id === 'MODEL_LAB') {
            // Place MODEL_TRAINING_LAB at 160, 128
            const exists = await page.evaluate(() => {
                const scene = window.__GRADIUM_GAME__?.scene.getScene('MainScene');
                return scene.buildingManager.getByType('MODEL_TRAINING_LAB').length > 0;
            });
            if (!exists) {
                console.log('Placing Model Training Lab...');
                await selectTool('PRODUCTION', 'MODEL_TRAINING_LAB');
                const pt = await getScreenPointForTile(160, 128);
                await page.mouse.click(pt.x, pt.y);
                await new Promise(r => setTimeout(r, 1000));
                continue;
            }
            
            // Connect cable from Trainer to Model Lab
            const cableConnected = await page.evaluate(() => {
                const scene = window.__GRADIUM_GAME__?.scene.getScene('MainScene');
                return scene.cableManager.cables.has(scene.cableManager.makeCableId('160,64', '160,128'));
            });
            if (!cableConnected) {
                console.log('Connecting Cable to Model Lab...');
                await selectTool('LOGISTICS', 'BASIC');
                const startPt = await getScreenPointForTile(160, 64);
                const endPt = await getScreenPointForTile(160, 128);
                await page.mouse.click(startPt.x, startPt.y);
                await page.mouse.click(endPt.x, endPt.y);
                await new Promise(r => setTimeout(r, 1000));
                continue;
            }
            
            // Set model target to CLASSIFIER
            const targetSet = await page.evaluate(() => {
                const scene = window.__GRADIUM_GAME__?.scene.getScene('MainScene');
                const lab = scene.buildingManager.getByType('MODEL_TRAINING_LAB')[0];
                return Boolean(lab && lab.targetType);
            });
            if (!targetSet) {
                console.log('Setting model target...');
                await page.evaluate(() => {
                    const scene = window.__GRADIUM_GAME__?.scene.getScene('MainScene');
                    const lab = scene.buildingManager.getByType('MODEL_TRAINING_LAB')[0];
                    if (lab) lab.setTarget('CLASSIFIER');
                });
            }
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    
    // Let's play the main game campaign for a few waves and log statistics!
    console.log('Checking campaign mode...');
    await new Promise(r => setTimeout(r, 1000));
    const campaignMode = await page.evaluate(() => {
        const scene = window.__GRADIUM_GAME__?.scene.getScene('MainScene');
        return {
            mode: scene?.mode,
            mapType: scene?.mapManager?.mapType,
            wave: scene?.waveManager?.currentWave
        };
    });
    console.log('Campaign Mode State:', campaignMode);
    
    await page.screenshot({ path: path.join(screenshotDir, '14_campaign_start.png') });
    
    await browser.close();
    console.log('Playtest completed successfully!');
}

run().catch(err => {
    console.error('Playtest Script Error:', err);
    process.exit(1);
});
