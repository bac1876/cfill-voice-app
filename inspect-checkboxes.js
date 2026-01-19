const { chromium } = require('playwright');

// Credentials
const USERNAME = '11621010';
const PASSWORD = 'lbbc2245';
const LOGIN_URL = 'https://ara.formsimplicity.com';

// All Page 1 checkboxes
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

async function inspectCheckboxes() {
    log('=== CHECKBOX INSPECTOR ===');
    log('Will open DevTools and click each checkbox one at a time');
    log('Watch the Elements panel to see which element is selected');
    log('');

    const browser = await chromium.launch({
        headless: false,
        slowMo: 500,
        devtools: true  // Opens DevTools automatically
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

        log('');
        log('=== READY TO INSPECT ===');
        log('DevTools should be open. Click on Elements tab if not already there.');
        log('I will now click each checkbox one at a time.');
        log('After each click, look at the form to see which box is checked.');
        log('');
        log('Press Ctrl+C to stop at any time.');
        log('');

        // Click each checkbox with a long pause
        for (let i = 0; i < CHECKBOXES.length; i++) {
            const checkboxName = CHECKBOXES[i];

            log(`=== CHECKBOX ${i + 1}/15: ${checkboxName} ===`);
            log('Clicking now...');

            const checkbox = await page.$(`input[name="${checkboxName}"]`);

            if (checkbox) {
                // Scroll to checkbox first
                await checkbox.scrollIntoViewIfNeeded();
                await page.waitForTimeout(500);

                // Click it
                await checkbox.click();

                log(`CLICKED: ${checkboxName}`);
                log('Look at the form - which checkbox is now checked?');
                log('Waiting 8 seconds before unchecking...');

                await page.waitForTimeout(8000);

                // Uncheck it
                await checkbox.click();
                log('Unchecked. Moving to next...');
                await page.waitForTimeout(2000);
            } else {
                log(`NOT FOUND: ${checkboxName}`);
            }

            log('');
        }

        log('=== ALL CHECKBOXES INSPECTED ===');
        log('Browser will stay open for 60 seconds for final review...');
        await page.waitForTimeout(60000);

    } catch (error) {
        log(`ERROR: ${error.message}`);
    } finally {
        await browser.close();
        log('Done!');
    }
}

inspectCheckboxes().catch(console.error);
