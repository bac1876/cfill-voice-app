const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Credentials
const USERNAME = '11621010';
const PASSWORD = 'lbbc2245';
const LOGIN_URL = 'https://ara.formsimplicity.com';

// Items that need review (checkboxes only - we'll click and screenshot)
const NEEDS_REVIEW_CHECKBOXES = [
    'p01cb006_76',  // Page 1 - should be 3A New Financing
    'p02cb002_99',  // Page 2
    'p03cb002_121', 'p03cb003_122', 'p03cb004_123', 'p03cb005_124', // Page 3
    'p04cb005_159', // Page 4
    'p05cb002_180', // Page 5
    'p07cb001_235', // Page 7
    'p08cb003_272', 'p08cb004_273', 'p08cb006_275', // Page 8
    'p10cb001_317', 'p10cb003_319', 'p10cb006_327', // Page 10
    'p15cb002_443', 'p15cb003_444', 'p15cb004_445', 'p15cb005_446', 'p15cb006_447', 'p15cb007_448', 'p15cb008_449', // Page 15
    'p16cb001_466', 'p16cb002_467', // Page 16
    'p17cb003_516' // Page 17
];

function log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
}

async function resolveNeedsReview() {
    log('=== RESOLVING NEEDS_REVIEW ITEMS ===');
    log(`Total items to resolve: ${NEEDS_REVIEW_CHECKBOXES.length}`);

    const browser = await chromium.launch({
        headless: false,
        slowMo: 100
    });

    const context = await browser.newContext({
        viewport: { width: 1400, height: 900 }
    });

    const page = await context.newPage();
    const screenshotsDir = path.join(__dirname, 'screenshots', 'needs-review');

    // Create directory if doesn't exist
    if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    const resolvedLabels = {};

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
        log('Opening form...');
        await page.click('a[data-form-id="60014"]');
        await page.waitForTimeout(5000);

        // Process each checkbox
        log('');
        log('Processing checkboxes...');

        for (let i = 0; i < NEEDS_REVIEW_CHECKBOXES.length; i++) {
            const cbName = NEEDS_REVIEW_CHECKBOXES[i];
            log(`[${i+1}/${NEEDS_REVIEW_CHECKBOXES.length}] ${cbName}`);

            try {
                const checkbox = await page.$(`input[name="${cbName}"]`);

                if (checkbox) {
                    // Scroll to checkbox
                    await checkbox.scrollIntoViewIfNeeded();
                    await page.waitForTimeout(300);

                    // Get position
                    const box = await checkbox.boundingBox();

                    // Click to check it
                    await checkbox.click();
                    await page.waitForTimeout(300);

                    // Take screenshot showing this checkbox checked
                    const screenshotPath = path.join(screenshotsDir, `${cbName}.png`);
                    await page.screenshot({ path: screenshotPath });

                    // Get all nearby text
                    const nearbyText = await page.evaluate((cbBox) => {
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
                            if (text && text.length > 2 && text.length < 200) {
                                const range = document.createRange();
                                range.selectNode(node);
                                const rect = range.getBoundingClientRect();

                                // Within 200px vertically and 600px horizontally
                                if (Math.abs(rect.y - cbBox.y) < 100 &&
                                    rect.x > cbBox.x - 50 && rect.x < cbBox.x + 600) {
                                    texts.push({
                                        text: text,
                                        dist: Math.abs(rect.x - cbBox.x) + Math.abs(rect.y - cbBox.y)
                                    });
                                }
                            }
                        }

                        // Sort by distance and return top 3
                        texts.sort((a, b) => a.dist - b.dist);
                        return texts.slice(0, 3).map(t => t.text);
                    }, box);

                    log(`  Nearby text: ${nearbyText.join(' | ')}`);
                    resolvedLabels[cbName] = nearbyText;

                    // Uncheck
                    await checkbox.click();
                    await page.waitForTimeout(200);
                } else {
                    log(`  NOT FOUND`);
                    resolvedLabels[cbName] = ['ELEMENT_NOT_FOUND'];
                }
            } catch (err) {
                log(`  ERROR: ${err.message}`);
                resolvedLabels[cbName] = [`ERROR: ${err.message}`];
            }
        }

        // Save resolved labels
        const outputPath = path.join(__dirname, 'resolved-labels.json');
        fs.writeFileSync(outputPath, JSON.stringify(resolvedLabels, null, 2));
        log('');
        log(`Resolved labels saved to: ${outputPath}`);

        await page.waitForTimeout(3000);

    } catch (error) {
        log(`ERROR: ${error.message}`);
    } finally {
        await browser.close();
        log('Done!');
    }
}

resolveNeedsReview().catch(console.error);
