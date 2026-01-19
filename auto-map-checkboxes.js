const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Credentials
const USERNAME = '11621010';
const PASSWORD = 'lbbc2245';
const LOGIN_URL = 'https://ara.formsimplicity.com';

const screenshotsDir = path.join(__dirname, 'screenshots');

// All Page 1 checkboxes
const CHECKBOXES = [
    'p01cb001_71',
    'p01cb002_72',
    'p01cb003_73',
    'p01cb004_74',
    'p01cb005_75',
    'p01cb006_76',
    'p01cb007_77',
    'p01cb008_78',
    'p01cb009_79',
    'p01cb010_80',
    'p01cb011_81',
    'p01cb012_82',
    'p01cb013_83',
    'p01cb014_84',
    'p01cb015_85'
];

function log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
}

async function autoMapCheckboxes() {
    log('=== AUTO CHECKBOX MAPPER ===');

    const browser = await chromium.launch({
        headless: false,
        slowMo: 200
    });

    const context = await browser.newContext({
        viewport: { width: 1400, height: 900 }
    });

    const page = await context.newPage();
    const mapping = {};

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

        // Step 4: Get all text elements and their positions for reference
        log('Step 4: Extracting all text positions from form...');

        const textElements = await page.evaluate(() => {
            const texts = [];
            // Get all text from the page
            const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );

            let node;
            while (node = walker.nextNode()) {
                const text = node.textContent.trim();
                if (text && text.length > 1 && text.length < 100) {
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

        // Step 5: Map each checkbox
        log('Step 5: Mapping each checkbox by position...');
        log('');

        for (const checkboxName of CHECKBOXES) {
            const checkbox = await page.$(`input[name="${checkboxName}"]`);

            if (checkbox) {
                // Get checkbox position
                const box = await checkbox.boundingBox();
                const cbX = box.x;
                const cbY = box.y;
                const cbCenterX = box.x + box.width / 2;
                const cbCenterY = box.y + box.height / 2;

                // Find nearest text to the RIGHT of the checkbox (within 300px horizontally, 30px vertically)
                let nearestText = null;
                let nearestDistance = Infinity;

                for (const textEl of textElements) {
                    // Text should be to the right of checkbox and roughly same vertical position
                    const textCenterY = textEl.y + textEl.height / 2;
                    const verticalDistance = Math.abs(textCenterY - cbCenterY);
                    const horizontalDistance = textEl.x - cbX;

                    // Text must be to the right (positive horizontal) and close vertically
                    if (horizontalDistance > 0 && horizontalDistance < 400 && verticalDistance < 25) {
                        if (horizontalDistance < nearestDistance) {
                            nearestDistance = horizontalDistance;
                            nearestText = textEl.text;
                        }
                    }
                }

                // Also check for text slightly above or below (for multi-line labels)
                if (!nearestText) {
                    for (const textEl of textElements) {
                        const textCenterY = textEl.y + textEl.height / 2;
                        const verticalDistance = Math.abs(textCenterY - cbCenterY);
                        const horizontalDistance = textEl.x - cbX;

                        if (horizontalDistance > -50 && horizontalDistance < 500 && verticalDistance < 50) {
                            const distance = Math.sqrt(horizontalDistance * horizontalDistance + verticalDistance * verticalDistance);
                            if (distance < nearestDistance) {
                                nearestDistance = distance;
                                nearestText = textEl.text;
                            }
                        }
                    }
                }

                mapping[checkboxName] = {
                    label: nearestText || 'UNKNOWN',
                    position: { x: Math.round(cbX), y: Math.round(cbY) }
                };

                log(`${checkboxName} @ (${Math.round(cbX)}, ${Math.round(cbY)}) => "${nearestText || 'UNKNOWN'}"`);
            } else {
                mapping[checkboxName] = { label: 'NOT FOUND', position: null };
                log(`${checkboxName} => NOT FOUND`);
            }
        }

        // Step 6: Output final mapping
        log('');
        log('=== FINAL CHECKBOX MAPPING ===');
        log('');

        // Sort by Y position then X position
        const sorted = Object.entries(mapping)
            .filter(([_, info]) => info.position)
            .sort((a, b) => {
                const yDiff = a[1].position.y - b[1].position.y;
                if (Math.abs(yDiff) > 20) return yDiff;
                return a[1].position.x - b[1].position.x;
            });

        for (const [name, info] of sorted) {
            log(`${name} => ${info.label}`);
        }

        // Save to JSON file
        const outputPath = path.join(__dirname, 'page1-checkbox-mapping.json');
        fs.writeFileSync(outputPath, JSON.stringify(mapping, null, 2));
        log('');
        log(`Mapping saved to: ${outputPath}`);

        await page.waitForTimeout(5000);

    } catch (error) {
        log(`ERROR: ${error.message}`);
        console.error(error);
    } finally {
        await browser.close();
        log('Done!');
    }

    return mapping;
}

autoMapCheckboxes().catch(console.error);
