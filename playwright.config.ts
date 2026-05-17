import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e',
    timeout: 30_000,
    expect: {
        timeout: 5_000
    },
    use: {
        baseURL: 'http://127.0.0.1:5174',
        trace: 'retain-on-failure'
    },
    webServer: {
        command: 'npm run dev -- --host 127.0.0.1 --port 5174',
        url: 'http://127.0.0.1:5174',
        reuseExistingServer: true,
        timeout: 60_000
    },
    projects: [
        {
            name: 'desktop-chromium',
            use: {
                ...devices['Desktop Chrome'],
                viewport: { width: 1280, height: 720 }
            }
        },
        {
            name: 'mobile-portrait',
            use: {
                ...devices['Pixel 5'],
                viewport: { width: 390, height: 844 }
            }
        },
        {
            name: 'mobile-landscape',
            use: {
                ...devices['Pixel 5 landscape'],
                viewport: { width: 844, height: 390 }
            }
        }
    ]
});
