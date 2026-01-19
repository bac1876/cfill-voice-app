const { chromium } = require('playwright');
const path = require('path');

// Credentials
const USERNAME = '11621010';
const PASSWORD = 'lbbc2245';
const LOGIN_URL = 'https://ara.formsimplicity.com';

const screenshotsDir = path.join(__dirname, 'screenshots');

// All Page 1 checkboxes from form-fields.json
const CHECKBOXES = [
    'p01cb001_71',
    'p01cb002_72',
    'p01cb003_73',
    'p01cb004_74',
    'p01cb005_75',
    'p01cb006_76',
    'p01cb007_77',
    'p01cb008_78',
    'p01cb009_79',
    'p01cb010_80',
    'p01cb011_81',
    'p01cb012_82',
    'p01cb013_83',
    'p01cb014_84',
    'p01cb015_85'
];

function log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
}

async function diagnoseCheckboxes() {
    log('=== CHECKBOX DIAGNOSTIC ===');
    log('Will check each checkbox one at a time to identify what it controls');

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

        // Take initial screenshot
        await page.screenshot({ path: path.join(screenshotsDir, 'checkbox-00-initial.png'), fullPage: true });
        log('Initial screenshot saved');

        // Step 4: Check each checkbox one at a time
        log('Step 4: Testing each checkbox...');

        for (let i = 0; i < CHECKBOXES.length; i++) {
            const checkboxName = CHECKBOXES[i];
            log(`  Testing checkbox ${i + 1}/15: ${checkboxName}`);

            const checkbox = await page.$(`input[name="${checkboxName}"]`);
            if (checkbox) {
                await checkbox.click();
                await page.waitForTimeout(500);

                // Take screenshot showing which checkbox is now checked
                const screenshotName = `checkbox-${String(i + 1).padStart(2, '0')}-${checkboxName}.png`;
                await page.screenshot({ path: path.join(screenshotsDir, screenshotName), fullPage: true });
                log(`    ✓ Checked and screenshot saved: ${screenshotName}`);

                // Uncheck it for the next test
                await checkbox.click();
                await page.waitForTimeout(300);
            } else {
                log(`    ✗ Checkbox not found: ${checkboxName}`);
            }
        }

        log('');
        log('=== DIAGNOSTIC COMPLETE ===');
        log('Check the screenshots folder to see which checkbox each field name controls.');
        log('');

        // Keep browser open briefly
        await page.waitForTimeout(5000);

    } catch (error) {
        log(`ERROR: ${error.message}`);
        await page.screenshot({ path: path.join(screenshotsDir, 'checkbox-error.png'), fullPage: true });
    } finally {
        await browser.close();
        log('Done!');
    }
}

diagnoseCheckboxes().catch(console.error);
