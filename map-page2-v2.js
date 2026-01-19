const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Credentials
const USERNAME = '11621010';
const PASSWORD = 'lbbc2245';
const LOGIN_URL = 'https://ara.formsimplicity.com';

function log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
}

async function mapPage2() {
    log('=== PAGE 2 FIELD MAPPER V2 ===');

    const browser = await chromium.launch({
        headless: false,
        slowMo: 100
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

        // Step 4: Find page navigation
        log('Step 4: Looking for page navigation...');

        // Look for navigation elements
        const navElements = await page.evaluate(() => {
            const elements = [];
            // Look for anything with page, next, nav in class or text
            const all = document.querySelectorAll('a, button, select, input');
            all.forEach(el => {
                const text = (el.textContent || '').toLowerCase();
                const className = (el.className || '').toLowerCase();
                const id = (el.id || '').toLowerCase();

                if (text.includes('page') || text.includes('next') ||
                    className.includes('page') || className.includes('nav') ||
                    id.includes('page') || id.includes('nav') ||
                    text.includes('2') || text.includes('→')) {
                    elements.push({
                        tag: el.tagName,
                        text: el.textContent?.substring(0, 50),
                        className: el.className,
                        id: el.id,
                        type: el.type
                    });
                }
            });
            return elements;
        });

        log('Found navigation elements:');
        for (const el of navElements) {
            log(`  ${el.tag}: "${el.text}" class="${el.className}" id="${el.id}"`);
        }

        // Try clicking on "Page 2" or scrolling the form pages dropdown
        log('');
        log('Step 5: Navigating to Page 2...');

        // Method 1: Look for page selector/dropdown
        const pageSelector = await page.$('select[name*="page"], select[id*="page"]');
        if (pageSelector) {
            log('Found page selector dropdown');
            await pageSelector.selectOption({ index: 1 }); // Select page 2
            await page.waitForTimeout(2000);
        }

        // Method 2: Look for page 2 link
        const page2Link = await page.$('a:has-text("2"), button:has-text("2")');
        if (page2Link) {
            log('Found page 2 link/button');
            await page2Link.click();
            await page.waitForTimeout(2000);
        }

        // Method 3: Look for "next page" button
        const nextBtn = await page.$('[aria-label*="next" i], [title*="next" i], button:has-text("Next"), a:has-text("Next")');
        if (nextBtn) {
            log('Found next button');
            await nextBtn.click();
            await page.waitForTimeout(2000);
        }

        // Method 4: Try keyboard navigation
        log('Trying keyboard navigation (Page Down)...');
        await page.keyboard.press('PageDown');
        await page.waitForTimeout(1000);

        // Method 5: Look for page thumbnails or page list
        const pageThumbs = await page.$$('.page-thumbnail, .page-item, [data-page]');
        if (pageThumbs.length > 1) {
            log(`Found ${pageThumbs.length} page thumbnails`);
            await pageThumbs[1].click(); // Click second page
            await page.waitForTimeout(2000);
        }

        // Take screenshot to see current state
        await page.screenshot({
            path: path.join(__dirname, 'screenshots', 'page2-nav-attempt.png'),
            fullPage: true
        });
        log('Screenshot saved: page2-nav-attempt.png');

        // Step 6: Now find all checkboxes and fields
        log('');
        log('Step 6: Getting current page checkboxes...');

        const allCheckboxes = await page.evaluate(() => {
            const checkboxes = [];
            const inputs = document.querySelectorAll('input[type="checkbox"]');
            inputs.forEach(input => {
                const name = input.getAttribute('name') || '';
                if (name) {
                    const rect = input.getBoundingClientRect();
                    checkboxes.push({
                        name: name,
                        x: rect.x,
                        y: rect.y
                    });
                }
            });
            return checkboxes.sort((a, b) => a.name.localeCompare(b.name));
        });

        log(`Found ${allCheckboxes.length} checkboxes:`);
        for (const cb of allCheckboxes) {
            log(`  ${cb.name}`);
        }

        // Get all text fields
        log('');
        log('All text input fields:');

        const allFields = await page.evaluate(() => {
            const fields = [];
            const inputs = document.querySelectorAll('input[type="text"]');
            inputs.forEach(input => {
                const name = input.getAttribute('name') || '';
                if (name && !name.includes('xfa[0]')) {
                    fields.push(name);
                }
            });
            return fields.sort();
        });

        for (const field of allFields) {
            log(`  ${field}`);
        }

        // Look for the current page indicator
        const pageIndicator = await page.evaluate(() => {
            const text = document.body.innerText;
            const match = text.match(/Page (\d+) of (\d+)/);
            return match ? `Page ${match[1]} of ${match[2]}` : 'Unknown';
        });

        log('');
        log(`Current page: ${pageIndicator}`);

        await page.waitForTimeout(5000);

    } catch (error) {
        log(`ERROR: ${error.message}`);
        console.error(error);
    } finally {
        await browser.close();
        log('Done!');
    }
}

mapPage2().catch(console.error);
