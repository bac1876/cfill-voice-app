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

async function mapAllFields() {
    log('=== FULL FORM FIELD MAPPER ===');

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

        // Step 4: Get ALL checkboxes in the form
        log('Step 4: Getting ALL checkboxes...');

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
            return checkboxes.sort((a, b) => a.y - b.y);
        });

        log(`Found ${allCheckboxes.length} total checkboxes`);

        // Group by page prefix
        const byPage = {};
        for (const cb of allCheckboxes) {
            const match = cb.name.match(/^p(\d+)cb/);
            if (match) {
                const pageNum = match[1];
                if (!byPage[pageNum]) byPage[pageNum] = [];
                byPage[pageNum].push(cb);
            }
        }

        log('');
        log('Checkboxes by page:');
        for (const [pageNum, cbs] of Object.entries(byPage)) {
            log(`  Page ${pageNum}: ${cbs.length} checkboxes`);
        }

        // Step 5: Get all text elements
        log('');
        log('Step 5: Getting text elements...');

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

        // Step 6: Map Page 2 checkboxes specifically
        log('');
        log('=== PAGE 2 CHECKBOXES (p02cb*) ===');

        if (byPage['02'] && byPage['02'].length > 0) {
            for (const cb of byPage['02']) {
                const checkbox = await page.$(`input[name="${cb.name}"]`);
                if (checkbox) {
                    const box = await checkbox.boundingBox();
                    const cbCenterY = box.y + box.height / 2;

                    let nearestText = null;
                    let nearestDistance = Infinity;

                    for (const textEl of textElements) {
                        const textCenterY = textEl.y + textEl.height / 2;
                        const verticalDistance = Math.abs(textCenterY - cbCenterY);
                        const horizontalDistance = textEl.x - box.x;

                        if (horizontalDistance > 0 && horizontalDistance < 500 && verticalDistance < 25) {
                            if (horizontalDistance < nearestDistance) {
                                nearestDistance = horizontalDistance;
                                nearestText = textEl.text;
                            }
                        }
                    }

                    log(`${cb.name} @ y=${Math.round(cb.y)} => "${nearestText || 'UNKNOWN'}"`);
                }
            }
        } else {
            log('No Page 2 checkboxes found (p02cb*)');
        }

        // Step 7: Look at the content around Page 2 area (after Page 1 ends ~y=1600)
        log('');
        log('=== TEXT CONTENT IN PAGE 2 AREA (y > 1600) ===');

        const page2Text = textElements
            .filter(t => t.y > 1600 && t.y < 3500)
            .sort((a, b) => a.y - b.y);

        for (const item of page2Text.slice(0, 50)) {
            log(`y=${Math.round(item.y)}: "${item.text.substring(0, 80)}"`);
        }

        // Step 8: Find FHA specific section
        log('');
        log('=== FHA NOTICE SECTION ===');

        const fhaText = textElements.filter(t =>
            t.text.includes('FHA') ||
            t.text.includes('HUD') ||
            t.text.includes('appraised value')
        );

        for (const item of fhaText) {
            log(`y=${Math.round(item.y)}: "${item.text.substring(0, 100)}"`);
        }

        // Step 9: Get all text fields and their positions
        log('');
        log('=== TEXT INPUT FIELDS (sorted by Y) ===');

        const textFields = await page.evaluate(() => {
            const fields = [];
            const inputs = document.querySelectorAll('input[type="text"]');
            inputs.forEach(input => {
                const name = input.getAttribute('name') || '';
                if (name) {
                    const rect = input.getBoundingClientRect();
                    fields.push({
                        name: name,
                        x: Math.round(rect.x),
                        y: Math.round(rect.y),
                        width: Math.round(rect.width)
                    });
                }
            });
            return fields.sort((a, b) => a.y - b.y);
        });

        // Show fields in Page 2 area
        const page2Fields = textFields.filter(f => f.y > 1600 && f.y < 3500);
        log(`Found ${page2Fields.length} text fields in Page 2 area`);

        for (const field of page2Fields.slice(0, 30)) {
            log(`${field.name} @ y=${field.y}`);
        }

        // Save data
        const outputPath = path.join(__dirname, 'full-form-mapping.json');
        fs.writeFileSync(outputPath, JSON.stringify({
            checkboxesByPage: byPage,
            page2TextContent: page2Text.slice(0, 100),
            page2TextFields: page2Fields,
            fhaRelatedText: fhaText
        }, null, 2));
        log('');
        log(`Full mapping saved to: ${outputPath}`);

        await page.waitForTimeout(5000);

    } catch (error) {
        log(`ERROR: ${error.message}`);
        console.error(error);
    } finally {
        await browser.close();
        log('Done!');
    }
}

mapAllFields().catch(console.error);
