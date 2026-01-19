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

async function gotoPage2() {
    log('=== NAVIGATE TO PAGE 2 AND MAP ===');

    const browser = await chromium.launch({
        headless: false,
        slowMo: 200
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

        // Step 4: Scroll down to see page navigation
        log('Step 4: Scrolling to find page navigation...');
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(1000);

        // Take screenshot to see the pagination area
        await page.screenshot({
            path: path.join(__dirname, 'screenshots', 'pagination-area.png'),
            fullPage: true
        });

        // Step 5: Find and list all pagination elements
        log('Step 5: Finding pagination...');

        const paginationInfo = await page.evaluate(() => {
            const info = {
                pageLinks: [],
                pageText: null
            };

            // Find all elements with page-link class
            const pageLinks = document.querySelectorAll('.page-link, a[class*="page"]');
            pageLinks.forEach(link => {
                info.pageLinks.push({
                    text: link.textContent.trim(),
                    className: link.className,
                    href: link.href,
                    visible: link.offsetParent !== null,
                    rect: link.getBoundingClientRect()
                });
            });

            // Find current page text
            const pageText = document.body.innerText.match(/Page \d+ of \d+/);
            info.pageText = pageText ? pageText[0] : null;

            return info;
        });

        log(`Current: ${paginationInfo.pageText}`);
        log('Page links found:');
        for (const link of paginationInfo.pageLinks) {
            log(`  "${link.text}" visible=${link.visible} y=${Math.round(link.rect.y)}`);
        }

        // Step 6: Click on page 2 using different methods
        log('');
        log('Step 6: Clicking page 2...');

        // Method 1: Use evaluate to click directly
        const clicked = await page.evaluate(() => {
            const links = document.querySelectorAll('.page-link, a[class*="page"]');
            for (const link of links) {
                const text = link.textContent.trim();
                // Look for "2" that's not part of a larger number
                if (text === '2' || text.includes('Page 2')) {
                    link.click();
                    return true;
                }
            }
            return false;
        });

        if (clicked) {
            log('Clicked page 2 link via evaluate');
        } else {
            log('Could not find page 2 link to click');

            // Try clicking the pagination next button
            const nextClicked = await page.evaluate(() => {
                const next = document.querySelector('.pagination-next, [aria-label="Next"], .next');
                if (next) {
                    next.click();
                    return true;
                }
                return false;
            });

            if (nextClicked) {
                log('Clicked next page button');
            }
        }

        await page.waitForTimeout(3000);

        // Check new page
        const newPageText = await page.evaluate(() => {
            const pageText = document.body.innerText.match(/Page \d+ of \d+/);
            return pageText ? pageText[0] : null;
        });

        log(`After click: ${newPageText}`);

        // Take screenshot of Page 2
        await page.screenshot({
            path: path.join(__dirname, 'screenshots', 'page2-content.png'),
            fullPage: true
        });
        log('Screenshot saved: page2-content.png');

        // Step 7: Map Page 2 content
        log('');
        log('Step 7: Mapping Page 2 fields...');

        // Get all checkboxes
        const checkboxes = await page.evaluate(() => {
            const cbs = [];
            document.querySelectorAll('input[type="checkbox"]').forEach(input => {
                const name = input.getAttribute('name') || '';
                if (name) {
                    const rect = input.getBoundingClientRect();
                    cbs.push({ name, y: rect.y });
                }
            });
            return cbs.sort((a, b) => a.name.localeCompare(b.name));
        });

        log(`Found ${checkboxes.length} checkboxes:`);
        for (const cb of checkboxes) {
            log(`  ${cb.name}`);
        }

        // Get text elements for mapping
        const textElements = await page.evaluate(() => {
            const texts = [];
            const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );

            let node;
            while (node = walker.nextNode()) {
                const text = node.textContent.trim();
                if (text && text.length > 1 && text.length < 300) {
                    const range = document.createRange();
                    range.selectNode(node);
                    const rect = range.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0) {
                        texts.push({
                            text: text,
                            x: rect.x,
                            y: rect.y,
                            width: rect.width,
                            height: rect.height
                        });
                    }
                }
            }
            return texts;
        });

        // Map checkboxes to labels
        log('');
        log('=== CHECKBOX MAPPING ===');

        for (const cb of checkboxes) {
            const checkbox = await page.$(`input[name="${cb.name}"]`);
            if (checkbox) {
                const box = await checkbox.boundingBox();
                if (box) {
                    const cbCenterY = box.y + box.height / 2;

                    let nearestText = null;
                    let nearestDistance = Infinity;

                    for (const textEl of textElements) {
                        const textCenterY = textEl.y + textEl.height / 2;
                        const verticalDistance = Math.abs(textCenterY - cbCenterY);
                        const horizontalDistance = textEl.x - box.x;

                        if (horizontalDistance > 0 && horizontalDistance < 600 && verticalDistance < 30) {
                            if (horizontalDistance < nearestDistance) {
                                nearestDistance = horizontalDistance;
                                nearestText = textEl.text;
                            }
                        }
                    }

                    log(`${cb.name} => "${nearestText || 'UNKNOWN'}"`);
                }
            }
        }

        // Get text fields
        log('');
        log('=== TEXT FIELDS ===');

        const textFields = await page.evaluate(() => {
            const fields = [];
            document.querySelectorAll('input[type="text"]').forEach(input => {
                const name = input.getAttribute('name') || '';
                if (name && !name.includes('xfa[0]')) {
                    const rect = input.getBoundingClientRect();
                    fields.push({ name, y: rect.y });
                }
            });
            return fields.sort((a, b) => a.y - b.y);
        });

        for (const field of textFields) {
            log(`${field.name}`);
        }

        // Save mapping
        fs.writeFileSync(
            path.join(__dirname, 'page2-mapping.json'),
            JSON.stringify({ checkboxes, textFields, newPageText }, null, 2)
        );

        await page.waitForTimeout(10000);

    } catch (error) {
        log(`ERROR: ${error.message}`);
        console.error(error);
    } finally {
        await browser.close();
        log('Done!');
    }
}

gotoPage2().catch(console.error);
