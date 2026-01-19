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
    log('=== PAGE 2 FIELD MAPPER ===');

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

        // Step 4: Navigate to Page 2
        log('Step 4: Navigating to Page 2...');

        // Look for page navigation - try clicking page 2 link or scrolling
        const page2Link = await page.$('a:has-text("Page 2")');
        if (page2Link) {
            await page2Link.click();
            await page.waitForTimeout(2000);
        } else {
            // Try scrolling down to page 2
            await page.evaluate(() => {
                const page2 = document.querySelector('[data-page="2"]') ||
                              document.querySelector('.page-2') ||
                              document.querySelector('#page-2');
                if (page2) page2.scrollIntoView();
            });
            await page.waitForTimeout(1000);
        }

        // Step 5: Find all Page 2 checkboxes (p02cb*)
        log('Step 5: Finding Page 2 checkboxes...');

        const page2Checkboxes = await page.evaluate(() => {
            const checkboxes = [];
            const inputs = document.querySelectorAll('input[type="checkbox"]');
            inputs.forEach(input => {
                const name = input.getAttribute('name') || '';
                if (name.startsWith('p02cb')) {
                    checkboxes.push(name);
                }
            });
            return checkboxes.sort();
        });

        log(`Found ${page2Checkboxes.length} Page 2 checkboxes`);

        // Step 6: Find all Page 2 text fields (look for p02 or Page 2 related fields)
        log('Step 6: Finding Page 2 text fields...');

        const page2TextFields = await page.evaluate(() => {
            const fields = [];
            const inputs = document.querySelectorAll('input[type="text"]');
            inputs.forEach(input => {
                const name = input.getAttribute('name') || '';
                // Get fields that might be on page 2
                if (name) {
                    const rect = input.getBoundingClientRect();
                    fields.push({
                        name: name,
                        y: rect.top
                    });
                }
            });
            return fields;
        });

        log(`Found ${page2TextFields.length} text fields total`);

        // Step 7: Extract text elements for context
        log('Step 7: Extracting text elements...');

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
                if (text && text.length > 1 && text.length < 200) {
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

        log(`Found ${textElements.length} text elements`);

        // Step 8: Map checkboxes to labels
        log('');
        log('=== PAGE 2 CHECKBOX MAPPING ===');

        const checkboxMapping = {};

        for (const checkboxName of page2Checkboxes) {
            const checkbox = await page.$(`input[name="${checkboxName}"]`);

            if (checkbox) {
                const box = await checkbox.boundingBox();
                const cbX = box.x;
                const cbY = box.y;
                const cbCenterY = box.y + box.height / 2;

                // Find nearest text to the RIGHT of checkbox
                let nearestText = null;
                let nearestDistance = Infinity;

                for (const textEl of textElements) {
                    const textCenterY = textEl.y + textEl.height / 2;
                    const verticalDistance = Math.abs(textCenterY - cbCenterY);
                    const horizontalDistance = textEl.x - cbX;

                    if (horizontalDistance > 0 && horizontalDistance < 500 && verticalDistance < 25) {
                        if (horizontalDistance < nearestDistance) {
                            nearestDistance = horizontalDistance;
                            nearestText = textEl.text;
                        }
                    }
                }

                checkboxMapping[checkboxName] = {
                    label: nearestText || 'UNKNOWN',
                    position: { x: Math.round(cbX), y: Math.round(cbY) }
                };

                log(`${checkboxName} @ (${Math.round(cbX)}, ${Math.round(cbY)}) => "${nearestText || 'UNKNOWN'}"`);
            }
        }

        // Step 9: Look specifically for FHA-related content
        log('');
        log('=== FHA RELATED CONTENT ===');

        const fhaContent = textElements.filter(t =>
            t.text.toLowerCase().includes('fha') ||
            t.text.toLowerCase().includes('loan type') ||
            t.text.toLowerCase().includes('hud')
        );

        for (const item of fhaContent) {
            log(`"${item.text}" @ y=${Math.round(item.y)}`);
        }

        // Step 10: Get full page text for context
        log('');
        log('=== PAGE 2 FULL TEXT (for context) ===');

        // Scroll to see page 2 content
        await page.evaluate(() => window.scrollTo(0, 1000));
        await page.waitForTimeout(500);

        // Take screenshot of page 2 area
        await page.screenshot({
            path: path.join(__dirname, 'screenshots', 'page2-mapping.png'),
            fullPage: true
        });
        log('Screenshot saved: page2-mapping.png');

        // Save mapping to file
        const outputPath = path.join(__dirname, 'page2-checkbox-mapping.json');
        fs.writeFileSync(outputPath, JSON.stringify({
            checkboxes: checkboxMapping,
            fhaRelatedText: fhaContent
        }, null, 2));
        log(`Mapping saved to: ${outputPath}`);

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
