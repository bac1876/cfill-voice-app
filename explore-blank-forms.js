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

async function exploreBlankForms() {
    log('Starting Blank Forms exploration...');

    const browser = await chromium.launch({
        headless: false,
        slowMo: 300
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

        // Step 2: Navigate directly to Forms Library
        log('Step 2: Navigating to Forms Library...');
        await page.goto('https://ara.formsimplicity.com/formslibrary/formslibrary', { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);

        await page.screenshot({ path: path.join(screenshotsDir, '20-forms-library.png'), fullPage: true });
        log(`Forms Library URL: ${page.url()}`);

        // Step 3: Search for "Real Estate Contract Residential"
        log('Step 3: Looking for Real Estate Contract Residential...');

        // Try to find a search box
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
            await searchBox.fill('Real Estate Contract');
            await page.keyboard.press('Enter');
            await page.waitForTimeout(3000);
            await page.screenshot({ path: path.join(screenshotsDir, '21-search-results.png'), fullPage: true });
        } else {
            log('No search box found, looking in page content...');
        }

        // Look for the contract in the list
        log('Looking for Real Estate Contract Residential link...');

        // Get all text content to understand page structure
        const pageText = await page.innerText('body');
        const lines = pageText.split('\n').filter(l => l.toLowerCase().includes('contract') || l.toLowerCase().includes('residential'));
        log('Relevant lines found:');
        lines.slice(0, 15).forEach(l => log(`  - ${l.trim().substring(0, 80)}`));

        // Try various selectors for the contract
        const contractSelectors = [
            'text=/Real Estate Contract.*Residential/i',
            'a:has-text("Real Estate Contract")',
            'td:has-text("Real Estate Contract")',
            '.form-name:has-text("Real Estate Contract")',
            'tr:has-text("Real Estate Contract")'
        ];

        let contractElement = null;
        for (const selector of contractSelectors) {
            try {
                const elements = await page.$$(selector);
                if (elements.length > 0) {
                    log(`Found ${elements.length} elements with selector: ${selector}`);
                    for (const el of elements.slice(0, 5)) {
                        const text = await el.textContent();
                        log(`  Content: ${text.substring(0, 100)}`);
                    }
                    contractElement = elements[0];
                }
            } catch (e) {
                // Continue
            }
        }

        await page.screenshot({ path: path.join(screenshotsDir, '22-contract-search.png'), fullPage: true });

        // Try clicking on the contract if found
        if (contractElement) {
            log('Clicking on contract...');
            await contractElement.click();
            await page.waitForTimeout(3000);
            await page.screenshot({ path: path.join(screenshotsDir, '23-after-contract-click.png'), fullPage: true });
            log(`URL after click: ${page.url()}`);
        }

        // Step 4: Check for form content
        log('Step 4: Checking page structure...');

        // Look for iframe (forms might be in iframe)
        const iframes = await page.$$('iframe');
        log(`Found ${iframes.length} iframes`);

        // Look for form elements
        const inputs = await page.$$('input:visible');
        const selects = await page.$$('select:visible');
        const textareas = await page.$$('textarea:visible');
        log(`Visible form elements: ${inputs.length} inputs, ${selects.length} selects, ${textareas.length} textareas`);

        // Take more screenshots
        await page.screenshot({ path: path.join(screenshotsDir, '24-form-page.png'), fullPage: true });

        // Scroll and screenshot
        await page.evaluate(() => window.scrollTo(0, 500));
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(screenshotsDir, '25-scrolled.png'), fullPage: true });

        // Keep browser open
        log('Exploration complete. Browser stays open for 30 seconds...');
        await page.waitForTimeout(30000);

    } catch (error) {
        log(`ERROR: ${error.message}`);
        await page.screenshot({ path: path.join(screenshotsDir, 'error-blank-forms.png'), fullPage: true });
    } finally {
        await browser.close();
        log('Done!');
    }
}

exploreBlankForms().catch(console.error);
