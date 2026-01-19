const { chromium } = require('playwright');

async function inspectPage12() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Login - same as fill-from-voice.js
    console.log('Logging in...');
    await page.goto('https://ara.formsimplicity.com', { waitUntil: 'networkidle' });
    await page.fill('input[type="text"]', '11621010');
    await page.fill('input[type="password"]', 'lbbc2245');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/users/started', { timeout: 30000 });
    console.log('Login successful!');
    await page.waitForTimeout(2000);

    // Navigate to Forms Library
    console.log('Navigating to Forms Library...');
    await page.goto('https://ara.formsimplicity.com/formslibrary/formslibrary', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Open the Real Estate Contract
    console.log('Opening Real Estate Contract...');
    await page.click('a[data-form-id="60014"]');
    await page.waitForTimeout(5000);

    // Scroll to Page 12 area - need to scroll further (contract is 18 pages)
    console.log('\n=== Scrolling to Page 12 (Closing section) ===\n');

    // First, scroll through to load all content
    for (let scroll = 0; scroll <= 30000; scroll += 2000) {
        await page.evaluate((s) => window.scrollTo(0, s), scroll);
        await page.waitForTimeout(200);
    }

    // Now scroll to approximate Page 12 area
    await page.evaluate(() => window.scrollTo(0, 22000));
    await page.waitForTimeout(500);

    // Find all input fields on Page 12 area
    console.log('Looking for fields with pattern p12...');

    const p12Fields = await page.$$eval('input[name^="p12"]', inputs =>
        inputs.map(i => ({
            name: i.getAttribute('name'),
            type: i.getAttribute('type'),
            class: i.getAttribute('class'),
            maxlength: i.getAttribute('maxlength'),
            placeholder: i.getAttribute('placeholder')
        }))
    );

    console.log('\nPage 12 fields found:');
    p12Fields.forEach(f => {
        console.log(`  name="${f.name}" type="${f.type}" maxlength="${f.maxlength}"`);
    });

    // Also look for any date-related fields or date pickers
    console.log('\n\nLooking for any closing-related fields...');

    const closingFields = await page.$$eval('input', inputs =>
        inputs.filter(i => {
            const name = i.getAttribute('name') || '';
            return name.toLowerCase().includes('clos') || name.includes('p12');
        }).map(i => ({
            name: i.getAttribute('name'),
            type: i.getAttribute('type'),
            class: i.getAttribute('class')
        }))
    );

    console.log('Closing-related fields:');
    closingFields.forEach(f => {
        console.log(`  name="${f.name}" type="${f.type}" class="${f.class}"`);
    });

    // Check if there's a date picker similar to paragraph 14
    console.log('\n\nLooking for date picker elements...');

    const datePickers = await page.$$eval('[class*="date"], [class*="picker"], [class*="calendar"]', els =>
        els.slice(0, 10).map(e => ({
            tag: e.tagName,
            class: e.getAttribute('class'),
            id: e.getAttribute('id')
        }))
    );

    console.log('Date picker elements:');
    datePickers.forEach(d => {
        console.log(`  <${d.tag}> class="${d.class}" id="${d.id}"`);
    });

    // Take a screenshot of the closing section
    await page.screenshot({ path: 'screenshots/page12-closing.png', fullPage: false });
    console.log('\nScreenshot saved to screenshots/page12-closing.png');

    console.log('\n=== Inspection Complete ===');
    console.log('Press Ctrl+C to close browser.');

    // Keep browser open
    await new Promise(() => {});
}

inspectPage12().catch(console.error);
