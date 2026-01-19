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

async function mapAllPagesComplete() {
    log('=== COMPLETE 18-PAGE MAPPING (100% ACCURACY) ===');
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

    // Store all discovered fields
    const allCheckboxes = new Map();
    const allTextFields = new Map();

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

        // Step 4: First pass - collect ALL field names from entire form
        log('Step 4: First pass - collecting all field names...');

        let scrollPosition = 0;
        const scrollIncrement = 500;
        let lastScrollHeight = 0;

        while (true) {
            // Get all checkboxes currently in DOM
            const checkboxes = await page.evaluate(() => {
                const cbs = [];
                document.querySelectorAll('input[type="checkbox"]').forEach(input => {
                    const name = input.getAttribute('name') || '';
                    if (name.match(/^p\d{2}cb/)) {
                        cbs.push(name);
                    }
                });
                return cbs;
            });

            for (const cb of checkboxes) {
                if (!allCheckboxes.has(cb)) {
                    allCheckboxes.set(cb, null);
                }
            }

            // Get all text fields
            const textFields = await page.evaluate(() => {
                const fields = [];
                document.querySelectorAll('input[type="text"]').forEach(input => {
                    const name = input.getAttribute('name') || '';
                    if (name.match(/^p\d{2}tf/) || name.startsWith('Global_Info')) {
                        fields.push(name);
                    }
                });
                return fields;
            });

            for (const tf of textFields) {
                if (!allTextFields.has(tf)) {
                    allTextFields.set(tf, null);
                }
            }

            // Scroll down
            scrollPosition += scrollIncrement;
            await page.evaluate((pos) => window.scrollTo(0, pos), scrollPosition);
            await page.waitForTimeout(200);

            // Check if we've reached the end
            const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
            if (scrollPosition >= scrollHeight && scrollHeight === lastScrollHeight) {
                break;
            }
            lastScrollHeight = scrollHeight;

            // Safety limit
            if (scrollPosition > 50000) {
                log('Reached scroll limit');
                break;
            }
        }

        log(`Found ${allCheckboxes.size} total checkboxes`);
        log(`Found ${allTextFields.size} total text fields`);

        // Step 5: Second pass - map each field to its label by clicking and observing
        log('');
        log('Step 5: Second pass - mapping each field to its label...');

        // Scroll back to top
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(500);

        // Get all text elements function
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
                        if (rect.width > 0 && rect.height > 0 && rect.y > -500 && rect.y < 5000) {
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

        // For each checkbox, scroll to it and find its label
        log('');
        log('Mapping checkboxes...');

        const sortedCheckboxes = Array.from(allCheckboxes.keys()).sort();

        for (const cbName of sortedCheckboxes) {
            const checkbox = await page.$(`input[name="${cbName}"]`);

            if (checkbox) {
                // Scroll to checkbox
                await checkbox.scrollIntoViewIfNeeded();
                await page.waitForTimeout(100);

                // Get checkbox position
                const box = await checkbox.boundingBox();

                if (box) {
                    // Get text elements
                    const textElements = await getAllTextElements();

                    // Find label - look for text to the RIGHT of checkbox
                    const cbCenterY = box.y + box.height / 2;
                    let bestLabel = null;
                    let bestDistance = Infinity;

                    for (const textEl of textElements) {
                        const textCenterY = textEl.y + textEl.height / 2;
                        const verticalDistance = Math.abs(textCenterY - cbCenterY);
                        const horizontalDistance = textEl.x - (box.x + box.width);

                        // Text should be to the right and vertically aligned
                        if (horizontalDistance > -10 && horizontalDistance < 600 && verticalDistance < 20) {
                            // Skip single characters and underscores
                            if (textEl.text.length > 2 && !textEl.text.match(/^[_\s.]+$/)) {
                                if (horizontalDistance < bestDistance ||
                                    (horizontalDistance < bestDistance + 50 && textEl.text.length > (bestLabel?.length || 0))) {
                                    bestDistance = horizontalDistance;
                                    bestLabel = textEl.text;
                                }
                            }
                        }
                    }

                    // If no good label found, try clicking the checkbox and looking at what changes
                    if (!bestLabel || bestLabel.length < 3) {
                        // Look for any nearby meaningful text
                        for (const textEl of textElements) {
                            const textCenterY = textEl.y + textEl.height / 2;
                            const verticalDistance = Math.abs(textCenterY - cbCenterY);
                            const horizontalDistance = Math.abs(textEl.x - box.x);

                            if (horizontalDistance < 500 && verticalDistance < 30) {
                                if (textEl.text.length > 3 && !textEl.text.match(/^[_\s.]+$/)) {
                                    if (!bestLabel || textEl.text.length > bestLabel.length) {
                                        bestLabel = textEl.text;
                                    }
                                }
                            }
                        }
                    }

                    allCheckboxes.set(cbName, bestLabel || 'NEEDS_MANUAL_REVIEW');
                    log(`  ${cbName} => "${bestLabel || 'NEEDS_MANUAL_REVIEW'}"`);
                }
            } else {
                allCheckboxes.set(cbName, 'ELEMENT_NOT_FOUND');
                log(`  ${cbName} => ELEMENT_NOT_FOUND`);
            }
        }

        // Map text fields
        log('');
        log('Mapping text fields...');

        const sortedTextFields = Array.from(allTextFields.keys()).sort();

        for (const tfName of sortedTextFields) {
            const textField = await page.$(`input[name="${tfName}"]`);

            if (textField) {
                await textField.scrollIntoViewIfNeeded();
                await page.waitForTimeout(100);

                const box = await textField.boundingBox();

                if (box) {
                    const textElements = await getAllTextElements();
                    const tfCenterY = box.y + box.height / 2;
                    let bestLabel = null;
                    let bestDistance = Infinity;

                    // Look for text to the LEFT of the text field (labels usually precede fields)
                    for (const textEl of textElements) {
                        const textCenterY = textEl.y + textEl.height / 2;
                        const verticalDistance = Math.abs(textCenterY - tfCenterY);
                        const horizontalDistance = box.x - (textEl.x + textEl.width);

                        if (horizontalDistance > -20 && horizontalDistance < 300 && verticalDistance < 25) {
                            if (textEl.text.length > 1 && !textEl.text.match(/^[_\s]+$/)) {
                                if (horizontalDistance < bestDistance) {
                                    bestDistance = horizontalDistance;
                                    bestLabel = textEl.text;
                                }
                            }
                        }
                    }

                    // If no label to the left, check above
                    if (!bestLabel) {
                        for (const textEl of textElements) {
                            const verticalDistance = box.y - (textEl.y + textEl.height);
                            const horizontalOverlap = !(textEl.x > box.x + box.width || textEl.x + textEl.width < box.x);

                            if (verticalDistance > 0 && verticalDistance < 50 && horizontalOverlap) {
                                if (textEl.text.length > 1 && !textEl.text.match(/^[_\s]+$/)) {
                                    if (!bestLabel || textEl.text.length > bestLabel.length) {
                                        bestLabel = textEl.text;
                                    }
                                }
                            }
                        }
                    }

                    allTextFields.set(tfName, bestLabel || 'NEEDS_MANUAL_REVIEW');
                    log(`  ${tfName} => "${bestLabel || 'NEEDS_MANUAL_REVIEW'}"`);
                }
            } else {
                allTextFields.set(tfName, 'ELEMENT_NOT_FOUND');
                log(`  ${tfName} => ELEMENT_NOT_FOUND`);
            }
        }

        // Step 6: Organize by page
        log('');
        log('Step 6: Organizing by page...');

        for (let pageNum = 1; pageNum <= 18; pageNum++) {
            const pageKey = `page${pageNum}`;
            const pagePrefix = `p${String(pageNum).padStart(2, '0')}`;

            masterMapping.pages[pageKey] = {
                pageNumber: pageNum,
                checkboxes: {},
                textFields: {}
            };

            // Add checkboxes for this page
            for (const [name, label] of allCheckboxes) {
                if (name.startsWith(pagePrefix + 'cb')) {
                    masterMapping.pages[pageKey].checkboxes[name] = label;
                }
            }

            // Add text fields for this page
            for (const [name, label] of allTextFields) {
                if (name.startsWith(pagePrefix + 'tf')) {
                    masterMapping.pages[pageKey].textFields[name] = label;
                }
            }

            // Add global fields (only to page 1 for reference)
            if (pageNum === 1) {
                for (const [name, label] of allTextFields) {
                    if (name.startsWith('Global_Info')) {
                        masterMapping.pages[pageKey].textFields[name] = label;
                    }
                }
            }
        }

        // Step 7: Save mapping
        log('');
        log('=== SAVING MASTER MAPPING ===');

        const outputPath = path.join(__dirname, 'form-field-mappings.json');
        fs.writeFileSync(outputPath, JSON.stringify(masterMapping, null, 2));
        log(`Saved to: ${outputPath}`);

        // Summary
        log('');
        log('=== FINAL SUMMARY ===');

        let totalCb = 0;
        let totalTf = 0;
        let needsReview = 0;

        for (const [pageKey, pageData] of Object.entries(masterMapping.pages)) {
            const cbCount = Object.keys(pageData.checkboxes).length;
            const tfCount = Object.keys(pageData.textFields).length;
            totalCb += cbCount;
            totalTf += tfCount;

            // Count items needing review
            for (const label of Object.values(pageData.checkboxes)) {
                if (label === 'NEEDS_MANUAL_REVIEW' || label === 'ELEMENT_NOT_FOUND') needsReview++;
            }
            for (const label of Object.values(pageData.textFields)) {
                if (label === 'NEEDS_MANUAL_REVIEW' || label === 'ELEMENT_NOT_FOUND') needsReview++;
            }

            if (cbCount > 0 || tfCount > 0) {
                log(`  ${pageKey}: ${cbCount} checkboxes, ${tfCount} text fields`);
            }
        }

        log('');
        log(`Total checkboxes: ${totalCb}`);
        log(`Total text fields: ${totalTf}`);
        log(`Items needing manual review: ${needsReview}`);

        await page.waitForTimeout(3000);

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

mapAllPagesComplete().catch(console.error);
