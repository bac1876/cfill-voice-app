const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Credentials
const USERNAME = '11621010';
const PASSWORD = 'lbbc2245';
const LOGIN_URL = 'https://ara.formsimplicity.com';

const screenshotsDir = path.join(__dirname, 'screenshots');

// Test data
const TEST_DATA = {
    'Global_Info-Property-Location-Address-Full_66': '1234 Maple Creek Drive, Rogers, AR 72758',
    'Global_Info-Buyer-Entity-Name_67': 'John Michael Smith and Sarah Jane Smith',
    'Global_Info-Sale-Price-Amount_68': '375000',
    'Global_Info-Property-Legal-Description-Full_35': 'Lot 15, Block 3, Maple Creek Subdivision, Phase II, Benton County, Arkansas'
};

function log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
}

async function fillAndSaveContract() {
    log('Starting: Fill contract with test data and save (v3 - fixed dropdowns)');

    const browser = await chromium.launch({
        headless: false,
        slowMo: 500
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
        log(`URL: ${page.url()}`);

        // Step 4: Fill form fields
        log('Step 4: Filling form fields...');
        for (const [fieldName, value] of Object.entries(TEST_DATA)) {
            try {
                let element = await page.$(`input[name="${fieldName}"]`);
                if (!element) {
                    element = await page.$(`textarea[name="${fieldName}"]`);
                }
                if (element) {
                    await element.fill(value);
                    log(`Filled: ${fieldName.split('-')[2] || fieldName}`);
                }
            } catch (e) {
                log(`Error: ${e.message}`);
            }
        }
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(screenshotsDir, '80-form-filled.png'), fullPage: true });

        // Step 5: Click Save Form
        log('Step 5: Clicking Save Form...');
        await page.click('a:has-text("Save Form")');
        await page.waitForTimeout(2000);

        // Step 6: Select "New transaction" radio
        log('Step 6: Selecting New transaction...');
        await page.click('label:has-text("New transaction")');
        await page.waitForTimeout(1000);

        // Step 7: Fill Street Address
        log('Step 7: Filling street address...');
        // Wait for the input to be enabled after selecting New transaction
        await page.waitForSelector('input[name="address"]:not([disabled])', { timeout: 5000 });
        await page.fill('input[name="address"]', '1234 Maple Creek Drive');
        await page.waitForTimeout(500);

        // Step 8: Check "Same as property address"
        log('Step 8: Checking Same as property address...');
        await page.click('label:has-text("Same as")');
        await page.waitForTimeout(500);

        // Step 9: Select Property Type using JavaScript
        log('Step 9: Selecting Property Type: Residential...');
        await page.evaluate(() => {
            const select = document.querySelector('select.property-type-select, select[name="transaction_property_type"]');
            if (select) {
                select.value = 'R';
                select.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
        await page.waitForTimeout(500);

        // Step 10: Select Transaction Type using JavaScript
        log('Step 10: Selecting Transaction Type: Purchase...');
        await page.evaluate(() => {
            const select = document.querySelector('select.transaction-type-select, select[name="transaction_type"]');
            if (select) {
                select.value = 'P';
                select.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
        await page.waitForTimeout(500);

        await page.screenshot({ path: path.join(screenshotsDir, '81-dialog-filled.png'), fullPage: true });

        // Verify dropdowns are selected
        const propertyValue = await page.evaluate(() => {
            const select = document.querySelector('select.property-type-select');
            return select ? select.value : 'not found';
        });
        const transactionValue = await page.evaluate(() => {
            const select = document.querySelector('select.transaction-type-select');
            return select ? select.value : 'not found';
        });
        log(`Property Type value: ${propertyValue}`);
        log(`Transaction Type value: ${transactionValue}`);

        // Step 11: Click Save & Submit Form
        log('Step 11: Clicking Save & Submit Form...');

        // Find the visible submit button
        const submitBtn = await page.$('button:has-text("Save & Submit Form"):visible');
        if (submitBtn) {
            await submitBtn.click();
            log('Clicked Save & Submit Form');
        } else {
            // Try clicking by evaluating
            await page.evaluate(() => {
                const buttons = document.querySelectorAll('button');
                for (const btn of buttons) {
                    if (btn.textContent.includes('Save & Submit') && btn.offsetParent !== null) {
                        btn.click();
                        return true;
                    }
                }
                return false;
            });
            log('Clicked via JavaScript');
        }

        await page.waitForTimeout(5000);
        await page.screenshot({ path: path.join(screenshotsDir, '82-after-save.png'), fullPage: true });
        log(`URL after save: ${page.url()}`);

        // Check success
        if (page.url().includes('transaction')) {
            log('SUCCESS: Transaction created!');
        }

        // Keep browser open
        log('Complete! Browser stays open for 60 seconds...');
        await page.waitForTimeout(60000);

    } catch (error) {
        log(`ERROR: ${error.message}`);
        await page.screenshot({ path: path.join(screenshotsDir, 'error-v3.png'), fullPage: true });
    } finally {
        await browser.close();
        log('Done!');
    }
}

fillAndSaveContract().catch(console.error);
