const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Credentials
const USERNAME = '11621010';
const PASSWORD = 'lbbc2245';
const LOGIN_URL = 'https://ara.formsimplicity.com';

// Items that need review
const NEEDS_REVIEW = [
    'p01cb006_76',
    'p02cb002_99',
    'p03cb002_121', 'p03cb003_122', 'p03cb004_123', 'p03cb005_124',
    'p04cb005_159',
    'p05cb002_180',
    'p07cb001_235',
    'p08cb003_272', 'p08cb004_273', 'p08cb006_275',
    'p10cb001_317', 'p10cb003_319', 'p10cb006_327',
    'p15cb002_443', 'p15cb003_444', 'p15cb004_445', 'p15cb005_446', 'p15cb006_447', 'p15cb007_448', 'p15cb008_449',
    'p16cb001_466', 'p16cb002_467',
    'p17cb003_516'
];

function log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
}

async function resolveWithScroll() {
    log('=== RESOLVE WITH SCROLL ===');

    const browser = await chromium.launch({
        headless: false,
        slowMo: 50
    });

    const context = await browser.newContext({
        viewport: { width: 1400, height: 900 }
    });

    const page = await context.newPage();
    const resolved = {};

    try {
        // Login
        log('Logging in...');
        await page.goto(LOGIN_URL, { waitUntil: 'networkidle' });
        await page.fill('input[type="text"]', USERNAME);
        await page.fill('input[type="password"]', PASSWORD);
        await page.click('button[type="submit"]');
        await page.waitForURL('**/users/started', { timeout: 30000 });
        await page.waitForTimeout(2000);

        // Navigate to form
        await page.goto('https://ara.formsimplicity.com/formslibrary/formslibrary', { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);

        log('Opening form...');
        await page.click('a[data-form-id="60014"]');
        await page.waitForTimeout(5000);

        // First, scroll through entire form to load all pages
        log('Loading all pages by scrolling...');
        let scrollPos = 0;
        while (scrollPos < 50000) {
            scrollPos += 500;
            await page.evaluate((pos) => window.scrollTo(0, pos), scrollPos);
            await page.waitForTimeout(100);

            const atBottom = await page.evaluate(() => {
                return window.scrollY + window.innerHeight >= document.body.scrollHeight - 100;
            });
            if (atBottom) break;
        }

        log('All pages loaded. Scrolling back to top...');
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(500);

        // Now process each NEEDS_REVIEW item
        log('');
        log('Processing items...');

        for (let i = 0; i < NEEDS_REVIEW.length; i++) {
            const name = NEEDS_REVIEW[i];
            log(`[${i+1}/${NEEDS_REVIEW.length}] ${name}`);

            try {
                const element = await page.$(`input[name="${name}"]`);

                if (element) {
                    await element.scrollIntoViewIfNeeded();
                    await page.waitForTimeout(200);

                    const box = await element.boundingBox();

                    // Get text elements near this checkbox
                    const nearbyTexts = await page.evaluate((elBox) => {
                        const results = [];
                        const walker = document.createTreeWalker(
                            document.body,
                            NodeFilter.SHOW_TEXT,
                            null,
                            false
                        );

                        let node;
                        while (node = walker.nextNode()) {
                            const text = node.textContent.trim();
                            if (text && text.length > 2 && text.length < 300 && !text.match(/^[_\s.]+$/)) {
                                const range = document.createRange();
                                range.selectNode(node);
                                const rect = range.getBoundingClientRect();

                                const vDist = Math.abs(rect.y - elBox.y);
                                const hDist = rect.x - elBox.x;

                                // Text to the right, within 50px vertically
                                if (hDist > -30 && hDist < 700 && vDist < 50) {
                                    results.push({
                                        text: text.substring(0, 150),
                                        hDist: hDist,
                                        vDist: vDist
                                    });
                                }
                            }
                        }

                        // Sort by closest to checkbox
                        results.sort((a, b) => (a.hDist + a.vDist) - (b.hDist + b.vDist));
                        return results.slice(0, 5);
                    }, box);

                    // Pick best label (skip A., B., C., etc)
                    let bestLabel = null;
                    for (const t of nearbyTexts) {
                        if (!t.text.match(/^[A-Z]\.?$/) && t.text.length > 3) {
                            bestLabel = t.text;
                            break;
                        }
                    }

                    resolved[name] = bestLabel || nearbyTexts[0]?.text || 'STILL_UNKNOWN';
                    log(`  => ${resolved[name].substring(0, 60)}`);
                } else {
                    resolved[name] = 'ELEMENT_NOT_FOUND';
                    log(`  => NOT FOUND`);
                }
            } catch (err) {
                resolved[name] = `ERROR: ${err.message}`;
                log(`  => ERROR: ${err.message}`);
            }
        }

        // Save
        const outputPath = path.join(__dirname, 'resolved-labels.json');
        fs.writeFileSync(outputPath, JSON.stringify(resolved, null, 2));
        log('');
        log(`Saved to: ${outputPath}`);

        // Now update the main mapping file
        log('');
        log('Updating main mapping file...');

        const mappingPath = path.join(__dirname, 'form-field-mappings.json');
        const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));

        for (const [name, label] of Object.entries(resolved)) {
            if (label !== 'ELEMENT_NOT_FOUND' && !label.startsWith('ERROR')) {
                // Find which page this belongs to
                const pageMatch = name.match(/^p(\d{2})/);
                if (pageMatch) {
                    const pageNum = parseInt(pageMatch[1]);
                    const pageKey = `page${pageNum}`;

                    if (mapping.pages[pageKey] && mapping.pages[pageKey].checkboxes[name]) {
                        mapping.pages[pageKey].checkboxes[name] = label;
                    }
                }
            }
        }

        fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2));
        log('Main mapping file updated!');

        await page.waitForTimeout(3000);

    } catch (error) {
        log(`ERROR: ${error.message}`);
    } finally {
        await browser.close();
        log('Done!');
    }
}

resolveWithScroll().catch(console.error);
