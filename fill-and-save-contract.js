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
    // Global Info fields
    'Global_Info-Property-Location-Address-Full_66': '1234 Maple Creek Drive, Rogers, AR 72758',
    'Global_Info-Buyer-Entity-Name_67': 'John Michael Smith and Sarah Jane Smith',
    'Global_Info-Sale-Price-Amount_68': '375000',

    // Legal Description
    'Global_Info-Property-Legal-Description-Full_35': 'Lot 15, Block 3, Maple Creek Subdivision, Phase II, Benton County, Arkansas'
};

function log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
}

async function fillAndSaveContract() {
    log('Starting: Fill contract with test data and save');

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
        await page.screenshot({ path: path.join(screenshotsDir, '60-contract-opened.png'), fullPage: true });

        log(`URL: ${page.url()}`);

        // Step 4: Fill the form fields
        log('Step 4: Filling form fields with test data...');

        for (const [fieldName, value] of Object.entries(TEST_DATA)) {
            try {
                // Try input first
                let element = await page.$(`input[name="${fieldName}"]`);
                if (!element) {
                    // Try textarea
                    element = await page.$(`textarea[name="${fieldName}"]`);
                }

                if (element) {
                    await element.fill(value);
                    log(`Filled: ${fieldName} = ${value}`);
                } else {
                    log(`Field not found: ${fieldName}`);
                }
            } catch (e) {
                log(`Error filling ${fieldName}: ${e.message}`);
            }
        }

        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(screenshotsDir, '61-form-filled.png'), fullPage: true });

        // Step 5: Look for and click Save button
        log('Step 5: Looking for Save button...');

        // Find all links/buttons with "Save" text
        const saveElements = await page.$$('a:has-text("Save"), button:has-text("Save")');
        log(`Found ${saveElements.length} Save elements`);

        for (let i = 0; i < saveElements.length; i++) {
            const text = await saveElements[i].textContent();
            const href = await saveElements[i].getAttribute('href');
            const className = await saveElements[i].getAttribute('class');
            log(`  Save ${i}: text="${text.trim()}" href="${href}" class="${className}"`);
        }

        // Look for the Save Form link in the toolbar
        const saveFormLink = await page.$('a:has-text("Save Form")');
        if (saveFormLink) {
            log('Found "Save Form" link, clicking...');
            await saveFormLink.click();
            await page.waitForTimeout(3000);
            await page.screenshot({ path: path.join(screenshotsDir, '62-after-save-click.png'), fullPage: true });

            // Check for modal/dialog
            log('Checking for save dialog...');
            const modals = await page.$$('.modal.show, .modal.in, [role="dialog"], .modal:visible');
            log(`Found ${modals.length} visible modals after save click`);

            // Look for any dialog content
            const modalContent = await page.$('.modal-content');
            if (modalContent) {
                const text = await modalContent.textContent();
                log(`Modal content: ${text.substring(0, 300)}...`);
            }

            // Look for the "New Transaction" option
            log('Looking for New Transaction option...');
            const newTransactionOptions = await page.$$('text=New Transaction, input[value*="new" i], label:has-text("New Transaction")');
            log(`Found ${newTransactionOptions.length} New Transaction options`);

            for (const opt of newTransactionOptions) {
                const isVisible = await opt.isVisible();
                if (isVisible) {
                    log('Clicking New Transaction option...');
                    await opt.click();
                    await page.waitForTimeout(1000);
                    break;
                }
            }

            await page.screenshot({ path: path.join(screenshotsDir, '63-save-dialog.png'), fullPage: true });

            // Look for address field in dialog
            const addressField = await page.$('input#transactionStreetAddress, input[name="address"]');
            if (addressField && await addressField.isVisible()) {
                log('Filling address in save dialog...');
                await addressField.fill('1234 Maple Creek Drive');
                await page.waitForTimeout(500);
            }

            // Check "Same as address" if available
            const sameAsAddress = await page.$('input#same-as-address');
            if (sameAsAddress && await sameAsAddress.isVisible()) {
                await sameAsAddress.click();
                log('Clicked Same as address checkbox');
                await page.waitForTimeout(500);
            }

            // Select Property Type: Residential
            const propertyType = await page.$('select#transaction_property_type');
            if (propertyType && await propertyType.isVisible()) {
                await propertyType.selectOption('R');
                log('Selected Property Type: Residential');
                await page.waitForTimeout(500);
            }

            // Select Transaction Type: Purchase
            const transactionType = await page.$('select#transaction_type');
            if (transactionType && await transactionType.isVisible()) {
                await transactionType.selectOption('P');
                log('Selected Transaction Type: Purchase');
                await page.waitForTimeout(500);
            }

            await page.screenshot({ path: path.join(screenshotsDir, '64-save-form-filled.png'), fullPage: true });

            // Look for submit/save button in dialog
            log('Looking for submit button in dialog...');
            const submitButtons = await page.$$('.modal button[type="submit"], .modal button:has-text("Add to Transaction"), .modal button:has-text("Save"), .modal button:has-text("Create")');
            log(`Found ${submitButtons.length} submit buttons`);

            for (const btn of submitButtons) {
                const isVisible = await btn.isVisible();
                const isDisabled = await btn.isDisabled();
                const text = await btn.textContent();
                log(`  Button: "${text.trim()}" visible=${isVisible} disabled=${isDisabled}`);

                if (isVisible && !isDisabled) {
                    log('Clicking submit button...');
                    await btn.click();
                    await page.waitForTimeout(5000);
                    break;
                }
            }

            await page.screenshot({ path: path.join(screenshotsDir, '65-after-save.png'), fullPage: true });
            log(`URL after save: ${page.url()}`);
        } else {
            log('Save Form link not found');
        }

        // Final state
        await page.screenshot({ path: path.join(screenshotsDir, '66-final-state.png'), fullPage: true });

        // Keep browser open for inspection
        log('Fill and save complete! Browser stays open for 60 seconds...');
        await page.waitForTimeout(60000);

    } catch (error) {
        log(`ERROR: ${error.message}`);
        console.error(error);
        await page.screenshot({ path: path.join(screenshotsDir, 'error-fill-save.png'), fullPage: true });
    } finally {
        await browser.close();
        log('Done!');
    }
}

fillAndSaveContract().catch(console.error);
