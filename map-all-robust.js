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

async function mapAllRobust() {
    log('=== ROBUST 18-PAGE MAPPING ===');

    const browser = await chromium.launch({
        headless: false,
        slowMo: 30
    });

    const context = await browser.newContext({
        viewport: { width: 1400, height: 900 }
    });

    const page = await context.newPage();

    // Data storage
    const checkboxes = {};
    const textFields = {};

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

        // Step 4: Scroll through entire form and map everything
        log('Step 4: Scrolling and mapping...');

        let scrollPos = 0;
        const scrollStep = 400;
        let lastHeight = 0;
        let stuckCount = 0;

        while (stuckCount < 5) {
            // Get all text elements at current position
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
                    if (text && text.length > 1 && text.length < 500) {
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

            // Get visible checkboxes
            const visibleCheckboxes = await page.evaluate(() => {
                const cbs = [];
                document.querySelectorAll('input[type="checkbox"]').forEach(input => {
                    const name = input.getAttribute('name') || '';
                    if (name.match(/^p\d{2}cb/)) {
                        const rect = input.getBoundingClientRect();
                        if (rect.y > -100 && rect.y < window.innerHeight + 100) {
                            cbs.push({
                                name: name,
                                x: rect.x,
                                y: rect.y,
                                width: rect.width,
                                height: rect.height
                            });
                        }
                    }
                });
                return cbs;
            });

            // Map checkboxes
            for (const cb of visibleCheckboxes) {
                if (!checkboxes[cb.name]) {
                    const cbCenterY = cb.y + cb.height / 2;
                    let label = null;
                    let minDist = Infinity;

                    for (const t of textElements) {
                        const tCenterY = t.y + t.height / 2;
                        const vDist = Math.abs(tCenterY - cbCenterY);
                        const hDist = t.x - (cb.x + cb.width);

                        if (hDist > -20 && hDist < 500 && vDist < 25) {
                            if (t.text.length > 2 && !t.text.match(/^[_\s.]+$/) && t.text !== 'A.' && t.text !== 'B.' && t.text !== 'C.') {
                                if (hDist < minDist) {
                                    minDist = hDist;
                                    label = t.text.substring(0, 100);
                                }
                            }
                        }
                    }

                    checkboxes[cb.name] = label || 'NEEDS_REVIEW';
                }
            }

            // Get visible text fields
            const visibleFields = await page.evaluate(() => {
                const fields = [];
                document.querySelectorAll('input[type="text"]').forEach(input => {
                    const name = input.getAttribute('name') || '';
                    if (name.match(/^p\d{2}tf/) || name.startsWith('Global_Info')) {
                        const rect = input.getBoundingClientRect();
                        if (rect.y > -100 && rect.y < window.innerHeight + 100) {
                            fields.push({
                                name: name,
                                x: rect.x,
                                y: rect.y,
                                width: rect.width,
                                height: rect.height
                            });
                        }
                    }
                });
                return fields;
            });

            // Map text fields
            for (const tf of visibleFields) {
                if (!textFields[tf.name]) {
                    const tfCenterY = tf.y + tf.height / 2;
                    let label = null;
                    let minDist = Infinity;

                    // Look for label to the LEFT
                    for (const t of textElements) {
                        const tCenterY = t.y + t.height / 2;
                        const vDist = Math.abs(tCenterY - tfCenterY);
                        const hDist = tf.x - (t.x + t.width);

                        if (hDist > -30 && hDist < 200 && vDist < 20) {
                            if (t.text.length > 1 && !t.text.match(/^[_\s]+$/)) {
                                if (hDist < minDist) {
                                    minDist = hDist;
                                    label = t.text.substring(0, 100);
                                }
                            }
                        }
                    }

                    // If no label to left, look above
                    if (!label) {
                        for (const t of textElements) {
                            const vDist = tf.y - (t.y + t.height);
                            const hOverlap = !(t.x > tf.x + tf.width + 50 || t.x + t.width < tf.x - 50);

                            if (vDist > 0 && vDist < 40 && hOverlap) {
                                if (t.text.length > 1 && !t.text.match(/^[_\s]+$/)) {
                                    label = t.text.substring(0, 100);
                                    break;
                                }
                            }
                        }
                    }

                    textFields[tf.name] = label || 'NEEDS_REVIEW';
                }
            }

            // Scroll down
            scrollPos += scrollStep;
            await page.evaluate((pos) => window.scrollTo(0, pos), scrollPos);
            await page.waitForTimeout(150);

            // Check if stuck
            const currentHeight = await page.evaluate(() => document.body.scrollHeight);
            const currentScroll = await page.evaluate(() => window.scrollY);

            if (currentHeight === lastHeight && currentScroll >= currentHeight - 1000) {
                stuckCount++;
            } else {
                stuckCount = 0;
            }
            lastHeight = currentHeight;

            // Safety limit
            if (scrollPos > 60000) break;
        }

        log(`Mapped ${Object.keys(checkboxes).length} checkboxes`);
        log(`Mapped ${Object.keys(textFields).length} text fields`);

        // Step 5: Organize by page
        log('');
        log('Step 5: Organizing by page...');

        const masterMapping = {
            formInfo: {
                name: 'Real Estate Contract (Residential)',
                formId: '60014',
                totalPages: 18,
                mappedAt: new Date().toISOString()
            },
            pages: {}
        };

        for (let pageNum = 1; pageNum <= 18; pageNum++) {
            const pageKey = `page${pageNum}`;
            const pagePrefix = `p${String(pageNum).padStart(2, '0')}`;

            masterMapping.pages[pageKey] = {
                pageNumber: pageNum,
                checkboxes: {},
                textFields: {}
            };

            // Add checkboxes
            for (const [name, label] of Object.entries(checkboxes)) {
                if (name.startsWith(pagePrefix + 'cb')) {
                    masterMapping.pages[pageKey].checkboxes[name] = label;
                }
            }

            // Add text fields
            for (const [name, label] of Object.entries(textFields)) {
                if (name.startsWith(pagePrefix + 'tf')) {
                    masterMapping.pages[pageKey].textFields[name] = label;
                }
            }
        }

        // Add global fields to a separate section
        masterMapping.globalFields = {};
        for (const [name, label] of Object.entries(textFields)) {
            if (name.startsWith('Global_Info')) {
                masterMapping.globalFields[name] = label;
            }
        }

        // Step 6: Save
        log('');
        log('Step 6: Saving...');

        const outputPath = path.join(__dirname, 'form-field-mappings.json');
        fs.writeFileSync(outputPath, JSON.stringify(masterMapping, null, 2));
        log(`Saved to: ${outputPath}`);

        // Summary
        log('');
        log('=== SUMMARY ===');

        let totalCb = 0;
        let totalTf = 0;
        let needsReview = 0;

        for (const [pageKey, pageData] of Object.entries(masterMapping.pages)) {
            const cbCount = Object.keys(pageData.checkboxes).length;
            const tfCount = Object.keys(pageData.textFields).length;
            totalCb += cbCount;
            totalTf += tfCount;

            for (const label of Object.values(pageData.checkboxes)) {
                if (label === 'NEEDS_REVIEW') needsReview++;
            }
            for (const label of Object.values(pageData.textFields)) {
                if (label === 'NEEDS_REVIEW') needsReview++;
            }

            if (cbCount > 0 || tfCount > 0) {
                log(`${pageKey}: ${cbCount} checkboxes, ${tfCount} text fields`);
            }
        }

        const globalCount = Object.keys(masterMapping.globalFields).length;
        log(`Global fields: ${globalCount}`);
        log('');
        log(`Total checkboxes: ${totalCb}`);
        log(`Total text fields: ${totalTf + globalCount}`);
        log(`Items needing review: ${needsReview}`);

        await page.waitForTimeout(3000);

    } catch (error) {
        log(`ERROR: ${error.message}`);

        // Save what we have
        const emergencySave = {
            checkboxes: checkboxes,
            textFields: textFields,
            error: error.message
        };
        fs.writeFileSync(
            path.join(__dirname, 'form-field-mappings-emergency.json'),
            JSON.stringify(emergencySave, null, 2)
        );
        log('Emergency save completed');
    } finally {
        await browser.close();
        log('Done!');
    }
}

mapAllRobust().catch(console.error);
