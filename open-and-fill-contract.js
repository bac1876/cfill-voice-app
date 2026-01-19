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

async function openAndFillContract() {
    log('Starting: Click contract name -> Open -> Fill -> Save');

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
        await page.screenshot({ path: path.join(screenshotsDir, '50-forms-library.png'), fullPage: true });

        // Step 3: Click on the NAME of "Real Estate Contract Residential"
        log('Step 3: Clicking on the contract NAME to open it...');

        // The contract name link has data-form-id="60014"
        const contractNameLink = await page.$('a[data-form-id="60014"]');

        if (contractNameLink) {
            log('Found contract name link, clicking...');
            await contractNameLink.click();
        } else {
            // Fallback: try text selector
            log('Trying text selector...');
            await page.click('a:has-text("Real Estate Contract Residential")');
        }

        // Wait for the contract to open
        log('Waiting for contract to open...');
        await page.waitForTimeout(5000);

        await page.screenshot({ path: path.join(screenshotsDir, '51-contract-opened.png'), fullPage: true });
        log(`URL after clicking contract: ${page.url()}`);

        // Step 4: Explore what opened
        log('Step 4: Exploring the opened contract...');

        // Check for new window/tab
        const pages = context.pages();
        log(`Number of pages/tabs: ${pages.length}`);

        // Check for iframes (PDF forms are often in iframes)
        const iframes = await page.$$('iframe');
        log(`Found ${iframes.length} iframes`);

        for (let i = 0; i < iframes.length; i++) {
            const src = await iframes[i].getAttribute('src');
            const name = await iframes[i].getAttribute('name');
            const id = await iframes[i].getAttribute('id');
            log(`  Iframe ${i}: src="${src}", name="${name}", id="${id}"`);
        }

        // Check for PDF viewer or form elements
        const pdfViewers = await page.$$('[class*="pdf"], [id*="pdf"], embed, object');
        log(`Found ${pdfViewers.length} PDF-related elements`);

        // Check for modal/popup
        const modals = await page.$$('.modal.show, .modal.in, [role="dialog"]:visible');
        log(`Found ${modals.length} visible modals`);

        // Check for form inputs
        const inputs = await page.$$('input:visible');
        const textareas = await page.$$('textarea:visible');
        log(`Visible form elements: ${inputs.length} inputs, ${textareas.length} textareas`);

        await page.screenshot({ path: path.join(screenshotsDir, '52-contract-content.png'), fullPage: true });

        // If there's an iframe, try to interact with it
        if (iframes.length > 0) {
            log('Attempting to access iframe content...');
            for (let i = 0; i < iframes.length; i++) {
                try {
                    const frame = await iframes[i].contentFrame();
                    if (frame) {
                        const frameInputs = await frame.$$('input');
                        const frameTextareas = await frame.$$('textarea');
                        log(`  Iframe ${i} content: ${frameInputs.length} inputs, ${frameTextareas.length} textareas`);

                        // Try to get some text content
                        const bodyText = await frame.evaluate(() => document.body?.innerText?.substring(0, 500));
                        if (bodyText) {
                            log(`  Iframe ${i} text preview: ${bodyText.substring(0, 200)}...`);
                        }
                    }
                } catch (e) {
                    log(`  Iframe ${i} access error: ${e.message}`);
                }
            }
        }

        // Scroll down to see more content
        await page.evaluate(() => window.scrollTo(0, 500));
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(screenshotsDir, '53-scrolled.png'), fullPage: true });

        // Step 5: Look for fillable fields
        log('Step 5: Looking for fillable fields...');

        // Get all visible input elements with their attributes
        const allInputs = await page.$$eval('input:visible', inputs =>
            inputs.map(input => ({
                type: input.type,
                name: input.name,
                id: input.id,
                placeholder: input.placeholder,
                value: input.value
            })).slice(0, 20)
        );

        log('Visible inputs:');
        allInputs.forEach((inp, i) => {
            log(`  ${i}: type="${inp.type}" name="${inp.name}" id="${inp.id}" placeholder="${inp.placeholder}"`);
        });

        // Step 6: Try to fill some fields if available
        log('Step 6: Attempting to fill fields...');

        // Look for common field names
        const fieldMappings = [
            { selector: 'input[name*="buyer" i]', value: 'John Smith' },
            { selector: 'input[name*="seller" i]', value: 'Jane Doe' },
            { selector: 'input[name*="address" i]', value: '123 Test Street' },
            { selector: 'input[name*="price" i]', value: '350000' },
            { selector: 'input[name*="date" i]', value: '01/15/2026' }
        ];

        for (const field of fieldMappings) {
            try {
                const element = await page.$(field.selector);
                if (element && await element.isVisible()) {
                    await element.fill(field.value);
                    log(`Filled field: ${field.selector} = ${field.value}`);
                }
            } catch (e) {
                // Field not found, continue
            }
        }

        await page.screenshot({ path: path.join(screenshotsDir, '54-fields-filled.png'), fullPage: true });

        // Step 7: Look for Save button
        log('Step 7: Looking for Save button...');

        const saveSelectors = [
            'button:has-text("Save")',
            'a:has-text("Save")',
            'input[type="submit"][value*="Save" i]',
            '.save-btn',
            '#save',
            'button:has-text("Submit")',
            'button:has-text("Done")'
        ];

        for (const selector of saveSelectors) {
            try {
                const element = await page.$(selector);
                if (element && await element.isVisible()) {
                    log(`Found save button: ${selector}`);
                    const text = await element.textContent();
                    log(`  Button text: "${text}"`);
                }
            } catch (e) {
                // Continue
            }
        }

        // Get page HTML for analysis
        const pageHTML = await page.content();
        fs.writeFileSync(path.join(__dirname, 'contract-page-html.txt'), pageHTML);
        log('Saved page HTML to contract-page-html.txt');

        await page.screenshot({ path: path.join(screenshotsDir, '55-final.png'), fullPage: true });

        // Keep browser open for manual inspection
        log('Exploration complete! Browser stays open for 90 seconds for manual inspection...');
        await page.waitForTimeout(90000);

    } catch (error) {
        log(`ERROR: ${error.message}`);
        console.error(error);
        await page.screenshot({ path: path.join(screenshotsDir, 'error-open-fill.png'), fullPage: true });
    } finally {
        await browser.close();
        log('Done!');
    }
}

openAndFillContract().catch(console.error);
