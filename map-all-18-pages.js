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

async function mapAll18Pages() {
    log('=== MAPPING ALL 18 PAGES ===');
    log('Will scroll through entire form and map every checkbox and text field');
    log('');

    const browser = await chromium.launch({
        headless: false,
        slowMo: 50
    });

    const context = await browser.newContext({
        viewport: { width: 1400, height: 900 }
    });

    const page = await context.newPage();

    // Master mapping object
    const masterMapping = {
        formInfo: {
            name: 'Real Estate Contract (Residential)',
            formId: '60014',
            totalPages: 18,
            mappedAt: new Date().toISOString()
        },
        pages: {}
    };

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

        // Step 4: Get all text elements for label mapping
        log('Step 4: Extracting all text elements...');

        const getAllTextElements = async () => {
            return await page.evaluate(() => {
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
                    if (text && text.length > 0 && text.length < 500) {
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
        };

        // Function to find label for a field
        const findLabel = (fieldBox, textElements) => {
            const cbCenterY = fieldBox.y + fieldBox.height / 2;
            let nearestText = null;
            let nearestDistance = Infinity;

            for (const textEl of textElements) {
                const textCenterY = textEl.y + textEl.height / 2;
                const verticalDistance = Math.abs(textCenterY - cbCenterY);
                const horizontalDistance = textEl.x - fieldBox.x;

                // Text to the right, within reasonable distance
                if (horizontalDistance > 0 && horizontalDistance < 600 && verticalDistance < 30) {
                    if (horizontalDistance < nearestDistance) {
                        nearestDistance = horizontalDistance;
                        nearestText = textEl.text;
                    }
                }
            }

            // If nothing found to the right, look for text slightly before (for some layouts)
            if (!nearestText) {
                for (const textEl of textElements) {
                    const textCenterY = textEl.y + textEl.height / 2;
                    const verticalDistance = Math.abs(textCenterY - cbCenterY);
                    const horizontalDistance = Math.abs(textEl.x - fieldBox.x);

                    if (horizontalDistance < 300 && verticalDistance < 20) {
                        const distance = Math.sqrt(horizontalDistance * horizontalDistance + verticalDistance * verticalDistance);
                        if (distance < nearestDistance) {
                            nearestDistance = distance;
                            nearestText = textEl.text;
                        }
                    }
                }
            }

            return nearestText || 'LABEL_NOT_FOUND';
        };

        // Function to get current page number
        const getCurrentPage = async () => {
            const pageText = await page.evaluate(() => {
                const text = document.body.innerText;
                const matches = text.match(/Page (\d+) of 18/g);
                if (matches && matches.length > 0) {
                    // Get all visible page indicators
                    const pageNums = matches.map(m => parseInt(m.match(/Page (\d+)/)[1]));
                    // Return the highest visible page number (as we scroll down)
                    return Math.max(...pageNums);
                }
                return null;
            });
            return pageText;
        };

        // Step 5: Scroll through and map each page
        log('Step 5: Scrolling through all 18 pages...');
        log('');

        let lastPage = 0;
        let scrollPosition = 0;
        const scrollIncrement = 800;
        let noNewPageCount = 0;
        const mappedPages = new Set();

        while (mappedPages.size < 18 && noNewPageCount < 20) {
            // Get current text elements
            const textElements = await getAllTextElements();

            // Get current page
            const currentPage = await getCurrentPage();

            if (currentPage && !mappedPages.has(currentPage)) {
                log(`=== PAGE ${currentPage} ===`);
                mappedPages.add(currentPage);
                noNewPageCount = 0;

                // Initialize page mapping
                const pageKey = `page${currentPage}`;
                masterMapping.pages[pageKey] = {
                    pageNumber: currentPage,
                    checkboxes: {},
                    textFields: {}
                };

                // Get all checkboxes for this page
                const pagePrefix = `p${String(currentPage).padStart(2, '0')}`;

                // Find checkboxes
                const checkboxes = await page.evaluate((prefix) => {
                    const cbs = [];
                    document.querySelectorAll('input[type="checkbox"]').forEach(input => {
                        const name = input.getAttribute('name') || '';
                        if (name.startsWith(prefix + 'cb')) {
                            const rect = input.getBoundingClientRect();
                            if (rect.y > 0 && rect.y < window.innerHeight + 500) {
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
                }, pagePrefix);

                log(`  Found ${checkboxes.length} checkboxes`);

                for (const cb of checkboxes) {
                    const label = findLabel(cb, textElements);
                    masterMapping.pages[pageKey].checkboxes[cb.name] = label;
                    log(`    ${cb.name} => "${label}"`);
                }

                // Find text fields
                const textFields = await page.evaluate((prefix) => {
                    const fields = [];
                    document.querySelectorAll('input[type="text"]').forEach(input => {
                        const name = input.getAttribute('name') || '';
                        // Match page-specific fields or global fields
                        if (name.startsWith(prefix + 'tf') ||
                            (name.startsWith('Global_') && !name.includes('xfa'))) {
                            const rect = input.getBoundingClientRect();
                            if (rect.y > 0 && rect.y < window.innerHeight + 500) {
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
                }, pagePrefix);

                log(`  Found ${textFields.length} text fields`);

                for (const tf of textFields) {
                    const label = findLabel(tf, textElements);
                    masterMapping.pages[pageKey].textFields[tf.name] = label;
                    log(`    ${tf.name} => "${label}"`);
                }

                log('');
            } else {
                noNewPageCount++;
            }

            // Scroll down
            scrollPosition += scrollIncrement;
            await page.evaluate((pos) => window.scrollTo(0, pos), scrollPosition);
            await page.waitForTimeout(300);

            // Check if we've scrolled past the end
            const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
            if (scrollPosition > scrollHeight) {
                log('Reached end of document');
                break;
            }
        }

        // Step 6: Save mapping
        log('');
        log('=== SAVING MASTER MAPPING ===');

        const outputPath = path.join(__dirname, 'form-field-mappings.json');
        fs.writeFileSync(outputPath, JSON.stringify(masterMapping, null, 2));
        log(`Saved to: ${outputPath}`);

        // Summary
        log('');
        log('=== SUMMARY ===');
        log(`Total pages mapped: ${Object.keys(masterMapping.pages).length}`);

        let totalCheckboxes = 0;
        let totalTextFields = 0;

        for (const [pageKey, pageData] of Object.entries(masterMapping.pages)) {
            const cbCount = Object.keys(pageData.checkboxes).length;
            const tfCount = Object.keys(pageData.textFields).length;
            totalCheckboxes += cbCount;
            totalTextFields += tfCount;
            log(`  ${pageKey}: ${cbCount} checkboxes, ${tfCount} text fields`);
        }

        log('');
        log(`Total checkboxes: ${totalCheckboxes}`);
        log(`Total text fields: ${totalTextFields}`);

        await page.waitForTimeout(5000);

    } catch (error) {
        log(`ERROR: ${error.message}`);
        console.error(error);

        // Save partial mapping
        const outputPath = path.join(__dirname, 'form-field-mappings-partial.json');
        fs.writeFileSync(outputPath, JSON.stringify(masterMapping, null, 2));
        log(`Partial mapping saved to: ${outputPath}`);
    } finally {
        await browser.close();
        log('Done!');
    }
}

mapAll18Pages().catch(console.error);
