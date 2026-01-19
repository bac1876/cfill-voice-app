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

async function mapPageByPage() {
    log('=== PAGE-BY-PAGE MAPPING ===');
    log('This script will scroll to each page, wait for it to load,');
    log('and extract all checkbox and text field labels.');

    const browser = await chromium.launch({
        headless: false,
        slowMo: 50
    });

    const context = await browser.newContext({
        viewport: { width: 1400, height: 900 }
    });

    const page = await context.newPage();

    // Store all mappings
    const allCheckboxes = {};
    const allTextFields = {};

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

        // Navigate to Forms Library
        await page.goto('https://ara.formsimplicity.com/formslibrary/formslibrary', { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);

        // Open contract
        log('Opening Real Estate Contract Residential (form 60014)...');
        await page.click('a[data-form-id="60014"]');
        await page.waitForTimeout(5000);

        // Process each page
        for (let targetPage = 1; targetPage <= 18; targetPage++) {
            log('');
            log(`=== PROCESSING PAGE ${targetPage} ===`);

            // Scroll to find this page
            let foundPage = false;
            let attempts = 0;
            const maxAttempts = 100;

            // Start from top if page 1
            if (targetPage === 1) {
                await page.evaluate(() => window.scrollTo(0, 0));
                await page.waitForTimeout(500);
            }

            while (!foundPage && attempts < maxAttempts) {
                attempts++;

                // Look for "Page X of 18" text
                const pageIndicator = await page.evaluate((target) => {
                    const walker = document.createTreeWalker(
                        document.body,
                        NodeFilter.SHOW_TEXT,
                        null,
                        false
                    );

                    let node;
                    while (node = walker.nextNode()) {
                        const text = node.textContent.trim();
                        if (text === `Page ${target} of 18`) {
                            const range = document.createRange();
                            range.selectNode(node);
                            const rect = range.getBoundingClientRect();
                            // Check if visible in viewport
                            if (rect.y >= 0 && rect.y < window.innerHeight) {
                                return { found: true, y: rect.y };
                            }
                        }
                    }
                    return { found: false };
                }, targetPage);

                if (pageIndicator.found) {
                    foundPage = true;
                    log(`Found "Page ${targetPage} of 18" indicator`);
                } else {
                    // Scroll down a bit
                    await page.evaluate(() => window.scrollBy(0, 300));
                    await page.waitForTimeout(150);
                }
            }

            if (!foundPage) {
                log(`WARNING: Could not find page ${targetPage}, skipping...`);
                continue;
            }

            // Wait for page content to load
            await page.waitForTimeout(500);

            // Extract all checkboxes on this page
            const pagePrefix = `p${String(targetPage).padStart(2, '0')}`;

            const pageCheckboxes = await page.evaluate((prefix) => {
                const results = {};
                const checkboxes = document.querySelectorAll(`input[type="checkbox"][name^="${prefix}cb"]`);

                checkboxes.forEach(cb => {
                    const name = cb.getAttribute('name');
                    const rect = cb.getBoundingClientRect();

                    // Only process if visible
                    if (rect.y >= -100 && rect.y < window.innerHeight + 100) {
                        // Find nearby text to the right
                        const walker = document.createTreeWalker(
                            document.body,
                            NodeFilter.SHOW_TEXT,
                            null,
                            false
                        );

                        let bestLabel = null;
                        let bestDist = Infinity;

                        let node;
                        while (node = walker.nextNode()) {
                            const text = node.textContent.trim();
                            if (text && text.length > 2 && text.length < 300 && !text.match(/^[_\s.]+$/)) {
                                const range = document.createRange();
                                range.selectNode(node);
                                const textRect = range.getBoundingClientRect();

                                const vDist = Math.abs(textRect.y - rect.y);
                                const hDist = textRect.x - rect.x;

                                // Text to the right (or slightly left), within 40px vertically
                                if (hDist > -30 && hDist < 600 && vDist < 40) {
                                    // Skip single letters like A., B., C.
                                    if (!text.match(/^[A-Z]\.?$/) && text.length > 3) {
                                        const dist = hDist + vDist;
                                        if (dist < bestDist) {
                                            bestDist = dist;
                                            bestLabel = text.substring(0, 150);
                                        }
                                    }
                                }
                            }
                        }

                        results[name] = bestLabel || 'NEEDS_REVIEW';
                    }
                });

                return results;
            }, pagePrefix);

            // Add to master list
            for (const [name, label] of Object.entries(pageCheckboxes)) {
                allCheckboxes[name] = label;
            }

            log(`  Found ${Object.keys(pageCheckboxes).length} checkboxes`);

            // Extract all text fields on this page
            const pageTextFields = await page.evaluate((prefix) => {
                const results = {};
                const fields = document.querySelectorAll(`input[type="text"][name^="${prefix}tf"]`);

                fields.forEach(field => {
                    const name = field.getAttribute('name');
                    const rect = field.getBoundingClientRect();

                    // Only process if visible
                    if (rect.y >= -100 && rect.y < window.innerHeight + 100) {
                        // Find nearby text to the LEFT
                        const walker = document.createTreeWalker(
                            document.body,
                            NodeFilter.SHOW_TEXT,
                            null,
                            false
                        );

                        let bestLabel = null;
                        let bestDist = Infinity;

                        let node;
                        while (node = walker.nextNode()) {
                            const text = node.textContent.trim();
                            if (text && text.length > 1 && text.length < 200 && !text.match(/^[_\s]+$/)) {
                                const range = document.createRange();
                                range.selectNode(node);
                                const textRect = range.getBoundingClientRect();

                                const vDist = Math.abs(textRect.y - rect.y);
                                const hDist = rect.x - (textRect.x + textRect.width);

                                // Text to the left, within 30px vertically
                                if (hDist > -30 && hDist < 200 && vDist < 30) {
                                    const dist = Math.abs(hDist) + vDist;
                                    if (dist < bestDist) {
                                        bestDist = dist;
                                        bestLabel = text.substring(0, 100);
                                    }
                                }
                            }
                        }

                        results[name] = bestLabel || 'NEEDS_REVIEW';
                    }
                });

                return results;
            }, pagePrefix);

            // Add to master list
            for (const [name, label] of Object.entries(pageTextFields)) {
                allTextFields[name] = label;
            }

            log(`  Found ${Object.keys(pageTextFields).length} text fields`);

            // Also capture any Global_Info fields visible on this page
            const globalFields = await page.evaluate(() => {
                const results = {};
                const fields = document.querySelectorAll('input[type="text"][name^="Global_Info"]');

                fields.forEach(field => {
                    const name = field.getAttribute('name');
                    const rect = field.getBoundingClientRect();

                    // Only process if visible
                    if (rect.y >= -100 && rect.y < window.innerHeight + 100) {
                        const walker = document.createTreeWalker(
                            document.body,
                            NodeFilter.SHOW_TEXT,
                            null,
                            false
                        );

                        let bestLabel = null;
                        let bestDist = Infinity;

                        let node;
                        while (node = walker.nextNode()) {
                            const text = node.textContent.trim();
                            if (text && text.length > 1 && text.length < 200 && !text.match(/^[_\s]+$/)) {
                                const range = document.createRange();
                                range.selectNode(node);
                                const textRect = range.getBoundingClientRect();

                                const vDist = Math.abs(textRect.y - rect.y);
                                const hDist = rect.x - (textRect.x + textRect.width);

                                if (hDist > -50 && hDist < 250 && vDist < 40) {
                                    const dist = Math.abs(hDist) + vDist;
                                    if (dist < bestDist) {
                                        bestDist = dist;
                                        bestLabel = text.substring(0, 100);
                                    }
                                }
                            }
                        }

                        results[name] = bestLabel || 'NEEDS_REVIEW';
                    }
                });

                return results;
            });

            for (const [name, label] of Object.entries(globalFields)) {
                if (!allTextFields[name]) {
                    allTextFields[name] = label;
                }
            }

            if (Object.keys(globalFields).length > 0) {
                log(`  Found ${Object.keys(globalFields).length} global fields`);
            }
        }

        // Build the final mapping structure
        log('');
        log('=== BUILDING FINAL MAPPING ===');

        const masterMapping = {
            formInfo: {
                name: 'Real Estate Contract (Residential)',
                formId: '60014',
                totalPages: 18,
                mappedAt: new Date().toISOString()
            },
            pages: {},
            globalFields: {}
        };

        // Organize by page
        for (let pageNum = 1; pageNum <= 18; pageNum++) {
            const pageKey = `page${pageNum}`;
            const pagePrefix = `p${String(pageNum).padStart(2, '0')}`;

            masterMapping.pages[pageKey] = {
                pageNumber: pageNum,
                checkboxes: {},
                textFields: {}
            };

            // Add checkboxes for this page
            for (const [name, label] of Object.entries(allCheckboxes)) {
                if (name.startsWith(pagePrefix + 'cb')) {
                    masterMapping.pages[pageKey].checkboxes[name] = label;
                }
            }

            // Add text fields for this page
            for (const [name, label] of Object.entries(allTextFields)) {
                if (name.startsWith(pagePrefix + 'tf')) {
                    masterMapping.pages[pageKey].textFields[name] = label;
                }
            }
        }

        // Add global fields
        for (const [name, label] of Object.entries(allTextFields)) {
            if (name.startsWith('Global_Info')) {
                masterMapping.globalFields[name] = label;
            }
        }

        // Save
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
        console.error(error);

        // Emergency save
        const emergencySave = {
            checkboxes: allCheckboxes,
            textFields: allTextFields,
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

mapPageByPage().catch(console.error);
