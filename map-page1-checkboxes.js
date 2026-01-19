const { chromium } = require('playwright');

// Credentials
const USERNAME = '11621010';
const PASSWORD = 'lbbc2245';
const LOGIN_URL = 'https://ara.formsimplicity.com';

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

async function mapCheckboxes() {
    log('=== PAGE 1 CHECKBOX MAPPING ===');
    log('Logging in and extracting checkbox labels programmatically...');

    const browser = await chromium.launch({
        headless: false,
        slowMo: 100
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

        // Step 4: Map each checkbox
        log('Step 4: Mapping each checkbox...');
        log('');

        for (const checkboxName of CHECKBOXES) {
            try {
                // Get the checkbox element
                const checkbox = await page.$(`input[name="${checkboxName}"]`);

                if (checkbox) {
                    // Get position of checkbox
                    const box = await checkbox.boundingBox();

                    // Get nearby text using JavaScript
                    const labelInfo = await page.evaluate((name) => {
                        const cb = document.querySelector(`input[name="${name}"]`);
                        if (!cb) return { label: 'NOT FOUND', context: '' };

                        // Get parent element and its text
                        let parent = cb.parentElement;
                        let contextText = '';
                        let labelText = '';

                        // Look for nearby text nodes
                        for (let i = 0; i < 5 && parent; i++) {
                            const text = parent.textContent || '';
                            if (text.length > contextText.length && text.length < 500) {
                                contextText = text.trim().replace(/\s+/g, ' ');
                            }
                            parent = parent.parentElement;
                        }

                        // Get the checkbox's position relative info
                        const rect = cb.getBoundingClientRect();

                        // Look for text immediately after the checkbox
                        let sibling = cb.nextSibling;
                        while (sibling) {
                            if (sibling.nodeType === 3 && sibling.textContent.trim()) {
                                labelText = sibling.textContent.trim();
                                break;
                            }
                            if (sibling.nodeType === 1 && sibling.textContent.trim()) {
                                labelText = sibling.textContent.trim().substring(0, 100);
                                break;
                            }
                            sibling = sibling.nextSibling;
                        }

                        return {
                            label: labelText || 'No direct label',
                            context: contextText.substring(0, 200),
                            y: rect.top
                        };
                    }, checkboxName);

                    // Click checkbox to see what gets checked
                    await checkbox.click();
                    await page.waitForTimeout(300);

                    // Check if it's checked
                    const isChecked = await checkbox.isChecked();

                    mapping[checkboxName] = {
                        label: labelInfo.label,
                        context: labelInfo.context,
                        yPosition: labelInfo.y,
                        checked: isChecked
                    };

                    log(`${checkboxName}:`);
                    log(`  Label: ${labelInfo.label}`);
                    log(`  Y-Position: ${Math.round(labelInfo.y)}px`);
                    log(`  Context: ${labelInfo.context.substring(0, 100)}...`);
                    log('');

                    // Uncheck for next test
                    await checkbox.click();
                    await page.waitForTimeout(200);
                } else {
                    log(`${checkboxName}: NOT FOUND ON PAGE`);
                    mapping[checkboxName] = { label: 'NOT FOUND', context: '', yPosition: 0 };
                }
            } catch (err) {
                log(`${checkboxName}: ERROR - ${err.message}`);
                mapping[checkboxName] = { label: 'ERROR', context: err.message, yPosition: 0 };
            }
        }

        // Output final mapping sorted by Y position
        log('');
        log('=== FINAL MAPPING (sorted by position on form) ===');
        log('');

        const sorted = Object.entries(mapping)
            .sort((a, b) => (a[1].yPosition || 0) - (b[1].yPosition || 0));

        for (const [name, info] of sorted) {
            log(`${name} => ${info.label}`);
        }

        log('');
        log('=== JSON OUTPUT ===');
        console.log(JSON.stringify(mapping, null, 2));

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

mapCheckboxes().catch(console.error);
