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

async function mapFullScroll() {
    log('=== FULL SCROLL MAPPING ===');
    log('Scrolling through entire form, capturing all fields as they appear');

    const browser = await chromium.launch({
        headless: false,
        slowMo: 30
    });

    const context = await browser.newContext({
        viewport: { width: 1400, height: 900 }
    });

    const page = await context.newPage();

    // Store all mappings - use Set to avoid duplicates
    const allCheckboxes = {};
    const allTextFields = {};
    let currentPage = 0;

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

        // Scroll from top to bottom, capturing everything
        log('Starting full scroll mapping...');
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(500);

        let scrollPos = 0;
        const scrollStep = 250;  // Smaller steps to capture more
        let stuckCount = 0;
        let lastScrollY = -1;

        while (stuckCount < 10) {
            // Check current page number
            const pageInfo = await page.evaluate(() => {
                const walker = document.createTreeWalker(
                    document.body,
                    NodeFilter.SHOW_TEXT,
                    null,
                    false
                );

                let node;
                while (node = walker.nextNode()) {
                    const text = node.textContent.trim();
                    const match = text.match(/^Page (\d+) of 18$/);
                    if (match) {
                        const range = document.createRange();
                        range.selectNode(node);
                        const rect = range.getBoundingClientRect();
                        // Check if visible in viewport
                        if (rect.y >= 0 && rect.y < window.innerHeight) {
                            return parseInt(match[1]);
                        }
                    }
                }
                return null;
            });

            if (pageInfo && pageInfo !== currentPage) {
                currentPage = pageInfo;
                log(`Now on Page ${currentPage}`);
            }

            // Extract all visible checkboxes
            const visibleCheckboxes = await page.evaluate(() => {
                const results = {};
                const checkboxes = document.querySelectorAll('input[type="checkbox"]');

                checkboxes.forEach(cb => {
                    const name = cb.getAttribute('name') || '';
                    if (!name.match(/^p\d{2}cb/)) return;

                    const rect = cb.getBoundingClientRect();
                    // Only process if in viewport
                    if (rect.y < 0 || rect.y > window.innerHeight) return;

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
                        if (!text || text.length <= 2 || text.length > 300) continue;
                        if (text.match(/^[_\s.]+$/)) continue;
                        if (text.match(/^[A-Z]\.?$/)) continue;  // Skip A., B., C.

                        const range = document.createRange();
                        range.selectNode(node);
                        const textRect = range.getBoundingClientRect();

                        const vDist = Math.abs(textRect.y - rect.y);
                        const hDist = textRect.x - rect.x;

                        // Text to the right, within 50px vertically
                        if (hDist > -30 && hDist < 600 && vDist < 50) {
                            const dist = Math.abs(hDist) + vDist;
                            if (dist < bestDist && text.length > 3) {
                                bestDist = dist;
                                bestLabel = text.substring(0, 150);
                            }
                        }
                    }

                    results[name] = bestLabel || 'NEEDS_REVIEW';
                });

                return results;
            });

            // Merge into master list (only add if not already there, or if new label is better)
            for (const [name, label] of Object.entries(visibleCheckboxes)) {
                if (!allCheckboxes[name] || allCheckboxes[name] === 'NEEDS_REVIEW') {
                    allCheckboxes[name] = label;
                }
            }

            // Extract all visible text fields
            const visibleTextFields = await page.evaluate(() => {
                const results = {};
                const fields = document.querySelectorAll('input[type="text"]');

                fields.forEach(field => {
                    const name = field.getAttribute('name') || '';
                    if (!name.match(/^p\d{2}tf/) && !name.startsWith('Global_Info')) return;

                    const rect = field.getBoundingClientRect();
                    // Only process if in viewport
                    if (rect.y < 0 || rect.y > window.innerHeight) return;

                    // Find nearby text (to the left primarily)
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
                        if (!text || text.length <= 1 || text.length > 200) continue;
                        if (text.match(/^[_\s]+$/)) continue;

                        const range = document.createRange();
                        range.selectNode(node);
                        const textRect = range.getBoundingClientRect();

                        const vDist = Math.abs(textRect.y - rect.y);

                        // Text to the left
                        const hDistLeft = rect.x - (textRect.x + textRect.width);
                        if (hDistLeft > -30 && hDistLeft < 200 && vDist < 30) {
                            const dist = Math.abs(hDistLeft) + vDist;
                            if (dist < bestDist) {
                                bestDist = dist;
                                bestLabel = text.substring(0, 100);
                            }
                        }

                        // Also check text above
                        const vDistAbove = rect.y - (textRect.y + textRect.height);
                        const hOverlap = !(textRect.x > rect.x + rect.width + 50 || textRect.x + textRect.width < rect.x - 50);
                        if (vDistAbove > 0 && vDistAbove < 40 && hOverlap && !bestLabel) {
                            bestLabel = text.substring(0, 100);
                        }
                    }

                    results[name] = bestLabel || 'NEEDS_REVIEW';
                });

                return results;
            });

            // Merge into master list
            for (const [name, label] of Object.entries(visibleTextFields)) {
                if (!allTextFields[name] || allTextFields[name] === 'NEEDS_REVIEW') {
                    allTextFields[name] = label;
                }
            }

            // Scroll down
            scrollPos += scrollStep;
            await page.evaluate((pos) => window.scrollTo(0, pos), scrollPos);
            await page.waitForTimeout(100);

            // Check if we're stuck
            const currentScrollY = await page.evaluate(() => window.scrollY);
            if (currentScrollY === lastScrollY) {
                stuckCount++;
            } else {
                stuckCount = 0;
            }
            lastScrollY = currentScrollY;

            // Progress indicator
            if (scrollPos % 2000 === 0) {
                log(`  Scroll position: ${scrollPos}, Checkboxes: ${Object.keys(allCheckboxes).length}, Fields: ${Object.keys(allTextFields).length}`);
            }

            // Safety limit
            if (scrollPos > 100000) break;
        }

        log('');
        log(`Total checkboxes found: ${Object.keys(allCheckboxes).length}`);
        log(`Total text fields found: ${Object.keys(allTextFields).length}`);

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

        // List items that need review
        if (needsReview > 0) {
            log('');
            log('Items needing review:');
            for (const [pageKey, pageData] of Object.entries(masterMapping.pages)) {
                for (const [name, label] of Object.entries(pageData.checkboxes)) {
                    if (label === 'NEEDS_REVIEW') log(`  ${name}`);
                }
                for (const [name, label] of Object.entries(pageData.textFields)) {
                    if (label === 'NEEDS_REVIEW') log(`  ${name}`);
                }
            }
        }

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

mapFullScroll().catch(console.error);
