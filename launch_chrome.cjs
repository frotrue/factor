const { chromium } = require('@playwright/test');

(async () => {
    try {
        console.log('Launching Playwright Chromium from workspace...');
        const browser = await chromium.launch({
            headless: true,
            args: [
                '--remote-debugging-port=9222',
                '--remote-allow-origins=*',
                '--no-sandbox',
                '--disable-setuid-sandbox'
            ]
        });
        console.log('Playwright Chromium launched successfully on port 9222!');
        
        // Keep the process alive
        await new Promise(() => {});
    } catch (err) {
        console.error('Error launching browser:', err);
        process.exit(1);
    }
})();
