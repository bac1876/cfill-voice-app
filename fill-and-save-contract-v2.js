const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Credentials
const USERNAME = '11621010';
const PASSWORD = 'lbbc2245';
const LOGIN_URL = 'https://ara.formsimplicity.com';

const screenshotsDir = path.join(__dirname, 'screenshots');

// Test data to fill the form
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
    log('Starting: Fill contract with test data and save (v2)');

    const browser = await chromium.launch({
        headless: false,
        slowMo: 400
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

        // Step 3: Click on contract name to open it
        log('Step 3: Opening Real Estate Contract Residential...');
        await page.click('a[data-form-id="60014"]');
        await page.waitForTimeout(5000);

        log(`URL: ${page.url()}`);

        // Step 4: Fill the form fields
        log('Step 4: Filling form fields with test data...');

        for (const [fieldName, value] of Object.entries(TEST_DATA)) {
            try {
                let element = await page.$(`input[name="${fieldName}"]`);
                if (!element) {
                    element = await page.$(`textarea[name="${fieldName}"]`);
                }

                if (element) {
                    await element.fill(value);
                    log(`Filled: ${fieldName.split('_')[0]}`);
                } else {
                    log(`Field not found: ${fieldName}`);
                }
            } catch (e) {
                log(`Error filling ${fieldName}: ${e.message}`);
            }
        }

        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(screenshotsDir, '70-form-filled.png'), fullPage: true });

        // Step 5: Click Save Form link
        log('Step 5: Clicking Save Form...');
        await page.click('a:has-text("Save Form")');
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(screenshotsDir, '71-save-dialog.png'), fullPage: true });

        // Step 6: Select "New transaction" radio button
        log('Step 6: Selecting New transaction radio button...');

        // Find the New transaction radio button
        const newTransactionRadio = await page.$('input[type="radio"][value="new"], input[name*="transaction" i][type="radio"]');
        if (newTransactionRadio) {
            await newTransactionRadio.click();
            log('Clicked New transaction radio');
        } else {
            // Try clicking the label
            const newTransactionLabel = await page.$('label:has-text("New transaction")');
            if (newTransactionLabel) {
                await newTransactionLabel.click();
                log('Clicked New transaction label');
            } else {
                // Try text selector
                await page.click('text=New transaction');
                log('Clicked text "New transaction"');
            }
        }

        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(screenshotsDir, '72-new-transaction-selected.png'), fullPage: true });

        // Step 7: Fill Street Address
        log('Step 7: Filling street address...');
        const streetAddress = await page.$('input[name="address"], input#transactionStreetAddress, input[placeholder*="street" i]');
        if (streetAddress) {
            await streetAddress.waitForElementState('enabled', { timeout: 5000 });
            await streetAddress.fill('1234 Maple Creek Drive');
            log('Filled street address');
        }

        await page.waitForTimeout(500);

        // Step 8: Check "Same as property address"
        log('Step 8: Clicking Same as property address...');
        const sameAsAddress = await page.$('input#same-as-address, input[type="checkbox"]:near(:text("Same as"))');
        if (sameAsAddress && await sameAsAddress.isVisible()) {
            await sameAsAddress.click();
            log('Clicked Same as property address');
        }

        await page.waitForTimeout(500);

        // Step 9: Select Property Type: Residential
        log('Step 9: Selecting Property Type: Residential...');
        const propertyType = await page.$('select#transaction_property_type, select[name*="property_type" i]');
        if (propertyType && await propertyType.isVisible()) {
            await propertyType.selectOption('R');
            log('Selected Property Type: Residential');
        }

        await page.waitForTimeout(500);

        // Step 10: Select Transaction Type: Purchase
        log('Step 10: Selecting Transaction Type: Purchase...');
        const transactionType = await page.$('select#transaction_type, select[name*="transaction_type" i]');
        if (transactionType && await transactionType.isVisible()) {
            await transactionType.selectOption('P');
            log('Selected Transaction Type: Purchase');
        }

        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(screenshotsDir, '73-dialog-filled.png'), fullPage: true });

        // Step 11: Click "Save & Submit Form" button
        log('Step 11: Clicking Save & Submit Form...');
        const submitBtn = await page.$('button:has-text("Save & Submit Form"), button:has-text("Save Form"), input[type="submit"][value*="Save"]');
        if (submitBtn) {
            const isDisabled = await submitBtn.isDisabled();
            log(`Submit button disabled: ${isDisabled}`);
            if (!isDisabled) {
                await submitBtn.click();
                log('Clicked Save & Submit Form');
                await page.waitForTimeout(5000);
            }
        } else {
            log('Submit button not found, trying alternative...');
            await page.click('button:has-text("Save")');
        }

        await page.screenshot({ path: path.join(screenshotsDir, '74-after-submit.png'), fullPage: true });
        log(`URL after submit: ${page.url()}`);

        // Check if we're on a new page (transaction detail)
        if (page.url().includes('transaction')) {
            log('SUCCESS: Transaction created!');
        }

        // Final state
        await page.screenshot({ path: path.join(screenshotsDir, '75-final.png'), fullPage: true });

        // Keep browser open for inspection
        log('Complete! Browser stays open for 60 seconds...');
        await page.waitForTimeout(60000);

    } catch (error) {
        log(`ERROR: ${error.message}`);
        console.error(error);
        await page.screenshot({ path: path.join(screenshotsDir, 'error-v2.png'), fullPage: true });
    } finally {
        await browser.close();
        log('Done!');
    }
}

fillAndSaveContract().catch(console.error);
