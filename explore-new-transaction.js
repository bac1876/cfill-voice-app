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

async function exploreNewTransaction() {
    log('Starting exploration of New Transaction flow...');

    const browser = await chromium.launch({
        headless: false,
        slowMo: 500
    });

    const context = await browser.newContext({
        viewport: { width: 1400, height: 900 }
    });

    const page = await context.newPage();

    try {
        // Login
        log('Logging in...');
        await page.goto(LOGIN_URL, { waitUntil: 'networkidle' });
        await page.fill('input[type="text"]', USERNAME);
        await page.fill('input[type="password"]', PASSWORD);
        await page.click('button[type="submit"]');
        await page.waitForURL('**/users/started', { timeout: 30000 });
        log('Login successful!');

        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(screenshotsDir, '10-logged-in-dashboard.png'), fullPage: true });

        // Click "Start a New Transaction"
        log('Looking for "Start a New Transaction" button...');

        // Try different selectors
        const newTransactionSelectors = [
            'text=Start a New Transaction',
            'a:has-text("Start a New Transaction")',
            '.start-transaction',
            '[href*="transaction"]'
        ];

        for (const selector of newTransactionSelectors) {
            try {
                const element = await page.$(selector);
                if (element && await element.isVisible()) {
                    log(`Found: ${selector}`);
                    await element.click();
                    await page.waitForTimeout(3000);
                    break;
                }
            } catch (e) {
                continue;
            }
        }

        await page.screenshot({ path: path.join(screenshotsDir, '11-after-new-transaction-click.png'), fullPage: true });
        log(`URL after click: ${page.url()}`);

        // Wait for any modal or new page
        await page.waitForTimeout(2000);

        // Look for form selection options
        log('Looking for form types...');

        const pageContent = await page.content();

        // Check if there's a form selection dialog
        const formOptions = await page.$$('text=/Real Estate Contract|Residential Purchase|Contract/i');
        log(`Found ${formOptions.length} form-related options`);

        // Look for any dropdown or selection
        const selects = await page.$$('select');
        log(`Found ${selects.length} select dropdowns`);

        for (let i = 0; i < selects.length; i++) {
            const options = await selects[i].$$('option');
            log(`Select ${i} has ${options.length} options`);
            for (const opt of options.slice(0, 10)) { // First 10 options
                const text = await opt.textContent();
                if (text.toLowerCase().includes('contract') || text.toLowerCase().includes('residential')) {
                    log(`  Found relevant option: "${text}"`);
                }
            }
        }

        await page.screenshot({ path: path.join(screenshotsDir, '12-form-selection.png'), fullPage: true });

        // Try clicking on Blank Forms instead
        log('Trying Blank Forms tab...');
        try {
            await page.click('text=Blank Forms');
            await page.waitForTimeout(3000);
            await page.screenshot({ path: path.join(screenshotsDir, '13-blank-forms-page.png'), fullPage: true });
            log(`Blank Forms URL: ${page.url()}`);

            // Look for Real Estate Contract in the forms list
            const contractLinks = await page.$$('text=/Real Estate Contract/i');
            log(`Found ${contractLinks.length} "Real Estate Contract" links`);

            // Get all links on the page
            const allLinks = await page.$$('a');
            for (const link of allLinks) {
                const text = await link.textContent();
                if (text && text.toLowerCase().includes('contract')) {
                    const href = await link.getAttribute('href');
                    log(`Contract link: "${text.trim()}" -> ${href}`);
                }
            }

            // Look for a search box
            const searchBox = await page.$('input[type="search"], input[placeholder*="search" i], input[name*="search" i]');
            if (searchBox) {
                log('Found search box - searching for "Real Estate Contract"');
                await searchBox.fill('Real Estate Contract');
                await page.waitForTimeout(2000);
                await page.screenshot({ path: path.join(screenshotsDir, '14-search-results.png'), fullPage: true });
            }

        } catch (e) {
            log(`Blank Forms navigation failed: ${e.message}`);
        }

        // Final state
        await page.screenshot({ path: path.join(screenshotsDir, '15-final-exploration.png'), fullPage: true });

        // Keep browser open to observe
        log('Exploration complete. Browser stays open for 15 seconds...');
        await page.waitForTimeout(15000);

    } catch (error) {
        log(`ERROR: ${error.message}`);
        await page.screenshot({ path: path.join(screenshotsDir, 'error-new-transaction.png'), fullPage: true });
    } finally {
        await browser.close();
        log('Done!');
    }
}

exploreNewTransaction().catch(console.error);
