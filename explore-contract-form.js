const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Credentials
const USERNAME = '11621010';
const PASSWORD = 'lbbc2245';
const LOGIN_URL = 'https://ara.formsimplicity.com';

const screenshotsDir = path.join(__dirname, 'screenshots');

function log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
}

async function exploreContractForm() {
    log('Starting Contract Form exploration...');

    const browser = await chromium.launch({
        headless: false,
        slowMo: 400
    });

    const context = await browser.newContext({
        viewport: { width: 1400, height: 900 }
    });

    const page = await context.newPage();

    try {
        // Login
        log('Step 1: Logging in...');
        await page.goto(LOGIN_URL, { waitUntil: 'networkidle' });
        await page.fill('input[type="text"]', USERNAME);
        await page.fill('input[type="password"]', PASSWORD);
        await page.click('button[type="submit"]');
        await page.waitForURL('**/users/started', { timeout: 30000 });
        log('Login successful!');
        await page.waitForTimeout(2000);

        // Navigate to Forms Library
        log('Step 2: Navigating to Forms Library...');
        await page.goto('https://ara.formsimplicity.com/formslibrary/formslibrary', { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(screenshotsDir, '30-forms-library.png'), fullPage: true });

        // Search for Real Estate Contract
        log('Step 3: Searching for Real Estate Contract Residential...');

        const searchSelectors = [
            'input[type="search"]',
            'input[placeholder*="search" i]',
            'input[name*="search" i]',
            'input[id*="search" i]',
            '.search-input',
            '#search',
            'input.form-control'
        ];

        let searchBox = null;
        for (const selector of searchSelectors) {
            const element = await page.$(selector);
            if (element && await element.isVisible()) {
                searchBox = element;
                log(`Found search box: ${selector}`);
                break;
            }
        }

        if (searchBox) {
            await searchBox.fill('Real Estate Contract Residential');
            await page.keyboard.press('Enter');
            await page.waitForTimeout(3000);
            await page.screenshot({ path: path.join(screenshotsDir, '31-search-results.png'), fullPage: true });
        }

        // Step 4: Click on "Real Estate Contract Residential"
        log('Step 4: Looking for and clicking on Real Estate Contract Residential...');

        // Try to find the contract link
        const contractSelectors = [
            'a:has-text("Real Estate Contract Residential")',
            'td:has-text("Real Estate Contract Residential")',
            'tr:has-text("Real Estate Contract Residential") a',
            'text=Real Estate Contract Residential'
        ];

        let clicked = false;
        for (const selector of contractSelectors) {
            try {
                const element = await page.$(selector);
                if (element && await element.isVisible()) {
                    log(`Found contract with selector: ${selector}`);
                    await element.click();
                    clicked = true;
                    break;
                }
            } catch (e) {
                log(`Selector ${selector} failed: ${e.message}`);
            }
        }

        if (!clicked) {
            // Try clicking on the row itself
            log('Trying to find contract in table rows...');
            const rows = await page.$$('tr');
            for (const row of rows) {
                const text = await row.textContent();
                if (text && text.includes('Real Estate Contract Residential')) {
                    log('Found row with contract, looking for clickable element...');
                    const link = await row.$('a');
                    if (link) {
                        await link.click();
                        clicked = true;
                        break;
                    } else {
                        await row.click();
                        clicked = true;
                        break;
                    }
                }
            }
        }

        await page.waitForTimeout(3000);
        await page.screenshot({ path: path.join(screenshotsDir, '32-after-contract-click.png'), fullPage: true });
        log(`URL after click: ${page.url()}`);

        // Step 5: Explore the form that opens
        log('Step 5: Exploring the opened form...');

        // Check for iframe (forms are often in iframes)
        const iframes = await page.$$('iframe');
        log(`Found ${iframes.length} iframes`);

        for (let i = 0; i < iframes.length; i++) {
            const frame = await iframes[i].contentFrame();
            if (frame) {
                const inputs = await frame.$$('input');
                const textareas = await frame.$$('textarea');
                const selects = await frame.$$('select');
                log(`Iframe ${i}: ${inputs.length} inputs, ${textareas.length} textareas, ${selects.length} selects`);
            }
        }

        // Check main page for form elements
        const mainInputs = await page.$$('input:visible');
        const mainTextareas = await page.$$('textarea:visible');
        const mainSelects = await page.$$('select:visible');
        log(`Main page: ${mainInputs.length} inputs, ${mainTextareas.length} textareas, ${mainSelects.length} selects`);

        await page.screenshot({ path: path.join(screenshotsDir, '33-form-content.png'), fullPage: true });

        // Scroll down to see more
        await page.evaluate(() => window.scrollTo(0, 500));
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(screenshotsDir, '34-scrolled-down.png'), fullPage: true });

        // Step 6: Look for "Add to Transaction" button
        log('Step 6: Looking for Add to Transaction button...');

        const addToTransactionSelectors = [
            'button:has-text("Add to Transaction")',
            'a:has-text("Add to Transaction")',
            'text=Add to Transaction',
            '[onclick*="transaction"]',
            '.add-transaction'
        ];

        for (const selector of addToTransactionSelectors) {
            try {
                const element = await page.$(selector);
                if (element && await element.isVisible()) {
                    log(`Found Add to Transaction: ${selector}`);

                    // Click it to see the dialog
                    await element.click();
                    await page.waitForTimeout(2000);
                    await page.screenshot({ path: path.join(screenshotsDir, '35-add-to-transaction-dialog.png'), fullPage: true });

                    // Look for "New Transaction" option
                    log('Looking for New Transaction option...');
                    const newTransactionBtn = await page.$('text=New Transaction');
                    if (newTransactionBtn) {
                        log('Found New Transaction option');
                        await newTransactionBtn.click();
                        await page.waitForTimeout(2000);
                        await page.screenshot({ path: path.join(screenshotsDir, '36-new-transaction-dialog.png'), fullPage: true });

                        // Look for "Same as property address"
                        const sameAsProperty = await page.$('text=Same as property address');
                        if (sameAsProperty) {
                            log('Found Same as property address option');
                        }

                        // Look for Property Type dropdown
                        const propertyTypeDropdown = await page.$('select:has-text("Residential"), [name*="property" i], label:has-text("Property Type")');
                        if (propertyTypeDropdown) {
                            log('Found Property Type dropdown');
                        }

                        // Look for Transaction Type dropdown
                        const transactionTypeDropdown = await page.$('select:has-text("Purchase"), [name*="transaction" i], label:has-text("Transaction Type")');
                        if (transactionTypeDropdown) {
                            log('Found Transaction Type dropdown');
                        }
                    }
                    break;
                }
            } catch (e) {
                log(`Selector ${selector} failed: ${e.message}`);
            }
        }

        // Step 7: Get all dialogs/modals content
        log('Step 7: Checking for modal dialogs...');
        const modals = await page.$$('.modal, [role="dialog"], .dialog, .popup');
        log(`Found ${modals.length} modal/dialog elements`);

        for (let i = 0; i < modals.length; i++) {
            const text = await modals[i].textContent();
            log(`Modal ${i} content: ${text.substring(0, 200)}...`);
        }

        await page.screenshot({ path: path.join(screenshotsDir, '37-final-state.png'), fullPage: true });

        // Capture the page HTML for analysis
        const pageHTML = await page.content();
        fs.writeFileSync(path.join(__dirname, 'form-page-html.txt'), pageHTML);
        log('Saved page HTML to form-page-html.txt');

        // Keep browser open
        log('Exploration complete. Browser stays open for 60 seconds for manual inspection...');
        await page.waitForTimeout(60000);

    } catch (error) {
        log(`ERROR: ${error.message}`);
        await page.screenshot({ path: path.join(screenshotsDir, 'error-contract-form.png'), fullPage: true });
    } finally {
        await browser.close();
        log('Done!');
    }
}

exploreContractForm().catch(console.error);
