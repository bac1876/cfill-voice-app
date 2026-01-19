const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Credentials
const USERNAME = '11621010';
const PASSWORD = 'lbbc2245';
const LOGIN_URL = 'https://ara.formsimplicity.com';

const screenshotsDir = path.join(__dirname, 'screenshots');

// Page 2 checkboxes
const PAGE2_CHECKBOXES = [
    'p02cb001_98',
    'p02cb002_99',
    'p02cb003_100'
];

function log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
}

async function mapPage2Checkboxes() {
    log('=== PAGE 2 CHECKBOX MAPPER ===');

    const browser = await chromium.launch({
        headless: false,
        slowMo: 200
    });

    const context = await browser.newContext({
        viewport: { width: 1400, height: 900 }
    });

    const page = await context.newPage();

    try {
        // Step 1: Login
        log('Step 1: Logging in...');
        await page.goto(LOGIN_URL, { waitUntil: 'networkidle' });
        await page.fill('input[type="text"]', USERNAME);
        await page.fill('input[type="password"]', PASSWORD);
        await page.click('button[type="submit"]');
        await page.waitForURL('**/users/started', { timeout: 30000 });
        log('Login successful!');
        await page.waitForTimeout(2000);

        // Step 2: Navigate to Forms Library
        log('Step 2: Navigating to Forms Library...');
        await page.goto('https://ara.formsimplicity.com/formslibrary/formslibrary', { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);

        // Step 3: Open contract
        log('Step 3: Opening Real Estate Contract Residential...');
        await page.click('a[data-form-id="60014"]');
        await page.waitForTimeout(5000);

        // Step 4: Take initial screenshot
        log('Step 4: Taking initial screenshot...');
        await page.screenshot({ path: path.join(screenshotsDir, 'page2-cb-00-initial.png'), fullPage: true });

        // Step 5: Click each Page 2 checkbox and screenshot
        log('Step 5: Testing each Page 2 checkbox...');
        log('');

        for (let i = 0; i < PAGE2_CHECKBOXES.length; i++) {
            const checkboxName = PAGE2_CHECKBOXES[i];
            log(`Testing ${i + 1}/3: ${checkboxName}`);

            const checkbox = await page.$(`input[name="${checkboxName}"]`);

            if (checkbox) {
                // Scroll to checkbox
                await checkbox.scrollIntoViewIfNeeded();
                await page.waitForTimeout(500);

                // Click it
                await checkbox.click();
                await page.waitForTimeout(500);

                // Take screenshot
                const screenshotName = `page2-cb-${String(i + 1).padStart(2, '0')}-${checkboxName}.png`;
                await page.screenshot({ path: path.join(screenshotsDir, screenshotName), fullPage: true });
                log(`  ✓ Screenshot saved: ${screenshotName}`);

                // Uncheck it
                await checkbox.click();
                await page.waitForTimeout(300);
            } else {
                log(`  ✗ Checkbox not found: ${checkboxName}`);
            }
        }

        log('');
        log('=== PAGE 2 CHECKBOX MAPPING COMPLETE ===');
        log('Check screenshots folder to identify each checkbox');

        await page.waitForTimeout(5000);

    } catch (error) {
        log(`ERROR: ${error.message}`);
        console.error(error);
    } finally {
        await browser.close();
        log('Done!');
    }
}

mapPage2Checkboxes().catch(console.error);
