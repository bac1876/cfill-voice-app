const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Credentials
const USERNAME = '11621010';
const PASSWORD = 'lbbc2245';
const LOGIN_URL = 'https://ara.formsimplicity.com';

const screenshotsDir = path.join(__dirname, 'screenshots');

// Discovered selectors
const SELECTORS = {
    // Login
    username: 'input[type="text"]',
    password: 'input[type="password"]',
    submit: 'button[type="submit"]',

    // Forms Library
    formsLibraryUrl: 'https://ara.formsimplicity.com/formslibrary/formslibrary',
    searchBox: 'input[placeholder*="search" i]',

    // Real Estate Contract Residential - Form ID 60014
    contractCheckbox: 'input[name="aForms[]"][value="60014"]',
    contractLink: 'a[data-form-id="60014"]',

    // Add to Transaction button
    addToTransactionBtn: 'button.add-to-transaction-btn',

    // New Transaction Modal
    newTransactionModal: '#blank-forms-add-to-transaction-modal',
    newTransactionOption: 'text=New Transaction',
    streetAddressInput: 'input#transactionStreetAddress',
    sameAsAddressCheckbox: 'input#same-as-address',
    transactionNameInput: 'input#transaction-name',
    propertyTypeDropdown: 'select#transaction_property_type',
    transactionTypeDropdown: 'select#transaction_type',
    submitTransactionBtn: 'button[type="submit"]'
};

function log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
}

async function exploreFullWorkflow() {
    log('Starting Full Workflow exploration...');
    log('Workflow: Login -> Forms Library -> Select Contract -> Add to Transaction -> Create New Transaction');

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
        await page.fill(SELECTORS.username, USERNAME);
        await page.fill(SELECTORS.password, PASSWORD);
        await page.click(SELECTORS.submit);
        await page.waitForURL('**/users/started', { timeout: 30000 });
        log('Login successful!');
        await page.waitForTimeout(2000);

        // Step 2: Navigate to Forms Library
        log('Step 2: Navigating to Forms Library...');
        await page.goto(SELECTORS.formsLibraryUrl, { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(screenshotsDir, '40-forms-library.png'), fullPage: true });

        // Step 3: Select the Real Estate Contract Residential checkbox
        log('Step 3: Selecting Real Estate Contract Residential...');

        // Wait for the checkbox to be visible
        await page.waitForSelector(SELECTORS.contractCheckbox, { timeout: 10000 });

        // Check the checkbox
        const checkbox = await page.$(SELECTORS.contractCheckbox);
        if (checkbox) {
            const isChecked = await checkbox.isChecked();
            if (!isChecked) {
                await checkbox.click();
                log('Checkbox clicked!');
            }
            await page.waitForTimeout(1000);
        } else {
            log('ERROR: Could not find contract checkbox');
        }

        await page.screenshot({ path: path.join(screenshotsDir, '41-checkbox-selected.png'), fullPage: true });

        // Step 4: Click "Add to Transaction" button
        log('Step 4: Clicking Add to Transaction button...');

        // The button should now be enabled
        await page.waitForSelector(SELECTORS.addToTransactionBtn + ':not([disabled])', { timeout: 5000 });
        await page.click(SELECTORS.addToTransactionBtn);
        await page.waitForTimeout(2000);

        await page.screenshot({ path: path.join(screenshotsDir, '42-add-transaction-modal.png'), fullPage: true });

        // Step 5: Look for the modal options
        log('Step 5: Exploring Add to Transaction modal...');

        // Check if modal is visible
        const modal = await page.$(SELECTORS.newTransactionModal);
        if (modal) {
            const isVisible = await modal.isVisible();
            log(`Modal visible: ${isVisible}`);

            // Get modal content
            const modalContent = await modal.textContent();
            log(`Modal content preview: ${modalContent.substring(0, 300)}...`);

            // Look for "New Transaction" button/option
            const newTransactionBtns = await page.$$('button:has-text("New Transaction"), a:has-text("New Transaction")');
            log(`Found ${newTransactionBtns.length} New Transaction buttons`);

            // Look for radio buttons or tabs
            const radioButtons = await modal.$$('input[type="radio"]');
            log(`Found ${radioButtons.length} radio buttons`);

            const tabButtons = await modal.$$('[role="tab"], .nav-tabs a, .tab-item');
            log(`Found ${tabButtons.length} tab buttons`);

            // Try clicking on New Transaction option
            try {
                // First check if there's a tab or button to click
                const newTxnTab = await page.$('a:has-text("New Transaction"), button:has-text("New Transaction"), [data-toggle="tab"]:has-text("New")');
                if (newTxnTab) {
                    await newTxnTab.click();
                    log('Clicked on New Transaction tab/button');
                    await page.waitForTimeout(1000);
                }
            } catch (e) {
                log(`New Transaction tab click failed: ${e.message}`);
            }

            await page.screenshot({ path: path.join(screenshotsDir, '43-new-transaction-options.png'), fullPage: true });

            // Step 6: Fill in the new transaction form
            log('Step 6: Filling in transaction details...');

            // Try to fill street address
            const addressInput = await page.$('input#transactionStreetAddress');
            if (addressInput && await addressInput.isVisible()) {
                await addressInput.fill('1234 Test Street');
                log('Filled street address');
            }

            // Try to check "Same as address"
            const sameAsAddressCb = await page.$('input#same-as-address');
            if (sameAsAddressCb && await sameAsAddressCb.isVisible()) {
                await sameAsAddressCb.click();
                log('Clicked Same as address checkbox');
            }

            await page.waitForTimeout(500);

            // Select Property Type = Residential
            const propertyType = await page.$('select#transaction_property_type');
            if (propertyType && await propertyType.isVisible()) {
                await propertyType.selectOption('R'); // R = Residential
                log('Selected Property Type: Residential');
            }

            await page.waitForTimeout(500);

            // Select Transaction Type = Purchase
            const transactionType = await page.$('select#transaction_type');
            if (transactionType && await transactionType.isVisible()) {
                await transactionType.selectOption('P'); // P = Purchase
                log('Selected Transaction Type: Purchase');
            }

            await page.waitForTimeout(500);
            await page.screenshot({ path: path.join(screenshotsDir, '44-form-filled.png'), fullPage: true });

            // Step 7: Find and click the submit button
            log('Step 7: Looking for submit button...');

            const submitButtons = await modal.$$('button[type="submit"], button:has-text("Add to Transaction"), button:has-text("Create"), button:has-text("Save")');
            log(`Found ${submitButtons.length} potential submit buttons`);

            for (let i = 0; i < submitButtons.length; i++) {
                const text = await submitButtons[i].textContent();
                const isVisible = await submitButtons[i].isVisible();
                const isDisabled = await submitButtons[i].isDisabled();
                log(`  Button ${i}: "${text.trim()}" - visible: ${isVisible}, disabled: ${isDisabled}`);
            }

            // Try clicking the submit button
            if (submitButtons.length > 0) {
                for (const btn of submitButtons) {
                    const isVisible = await btn.isVisible();
                    const isDisabled = await btn.isDisabled();
                    if (isVisible && !isDisabled) {
                        log('Clicking submit button...');
                        await btn.click();
                        await page.waitForTimeout(5000);
                        break;
                    }
                }
            }

            await page.screenshot({ path: path.join(screenshotsDir, '45-after-submit.png'), fullPage: true });
            log(`URL after submit: ${page.url()}`);

        } else {
            log('ERROR: Modal not found');
        }

        // Step 8: Explore the resulting page (should be the form)
        log('Step 8: Exploring the form page...');

        // Check if we're on a new page
        const currentUrl = page.url();
        log(`Current URL: ${currentUrl}`);

        // Look for iframes (form might be in iframe)
        const iframes = await page.$$('iframe');
        log(`Found ${iframes.length} iframes`);

        for (let i = 0; i < iframes.length; i++) {
            const src = await iframes[i].getAttribute('src');
            log(`  Iframe ${i}: ${src}`);
        }

        // Look for form fields
        const allInputs = await page.$$('input:visible');
        const allTextareas = await page.$$('textarea:visible');
        const allSelects = await page.$$('select:visible');
        log(`Form elements: ${allInputs.length} inputs, ${allTextareas.length} textareas, ${allSelects.length} selects`);

        // Take a final screenshot
        await page.screenshot({ path: path.join(screenshotsDir, '46-final-state.png'), fullPage: true });

        // Save page HTML for analysis
        const pageHTML = await page.content();
        fs.writeFileSync(path.join(__dirname, 'workflow-result-html.txt'), pageHTML);
        log('Saved page HTML to workflow-result-html.txt');

        // Keep browser open
        log('Workflow exploration complete! Browser stays open for 60 seconds...');
        await page.waitForTimeout(60000);

    } catch (error) {
        log(`ERROR: ${error.message}`);
        console.error(error);
        await page.screenshot({ path: path.join(screenshotsDir, 'error-workflow.png'), fullPage: true });
    } finally {
        await browser.close();
        log('Done!');
    }
}

exploreFullWorkflow().catch(console.error);
