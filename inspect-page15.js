const { chromium } = require('playwright');

async function inspectPage15() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Login
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

    // Scroll to Page 15 area
    console.log('\n=== Scrolling to Page 15 (Paragraph 39 - Contract Expiration) ===\n');

    // First, scroll through to load all content
    for (let scroll = 0; scroll <= 30000; scroll += 2000) {
        await page.evaluate((s) => window.scrollTo(0, s), scroll);
        await page.waitForTimeout(200);
    }

    // Now scroll to Page 15 area
    await page.evaluate(() => window.scrollTo(0, 24000));
    await page.waitForTimeout(500);

    // Find all fields on Page 15 (p15...)
    console.log('Looking for fields with pattern p15...');

    const p15Fields = await page.$$eval('input[name^="p15"], textarea[name^="p15"]', inputs =>
        inputs.map(i => ({
            name: i.getAttribute('name'),
            type: i.getAttribute('type') || i.tagName.toLowerCase(),
            class: i.getAttribute('class'),
            maxlength: i.getAttribute('maxlength'),
            placeholder: i.getAttribute('placeholder'),
            value: i.value
        }))
    );

    console.log('\nPage 15 fields found:');
    p15Fields.forEach(f => {
        console.log(`  name="${f.name}" type="${f.type}" class="${f.class}" maxlength="${f.maxlength}"`);
    });

    // Look for date fields specifically
    console.log('\n\nLooking for date fields on the page...');

    const dateFields = await page.$$eval('input[name*="df"], input[class*="date"]', inputs =>
        inputs.map(i => ({
            name: i.getAttribute('name'),
            type: i.getAttribute('type'),
            class: i.getAttribute('class'),
            id: i.getAttribute('id')
        }))
    );

    console.log('Date fields:');
    dateFields.forEach(f => {
        console.log(`  name="${f.name}" type="${f.type}" class="${f.class}" id="${f.id}"`);
    });

    // Look for time fields
    console.log('\n\nLooking for time fields on the page...');

    const timeFields = await page.$$eval('input[name*="tf"], select[name*="time"], input[type="time"]', inputs =>
        inputs.map(i => ({
            name: i.getAttribute('name'),
            type: i.getAttribute('type') || i.tagName.toLowerCase(),
            class: i.getAttribute('class'),
            id: i.getAttribute('id')
        }))
    );

    console.log('Time-related fields (first 20):');
    timeFields.slice(0, 20).forEach(f => {
        console.log(`  name="${f.name}" type="${f.type}" class="${f.class}"`);
    });

    // Look specifically for paragraph 39 content - search for "expire" text
    console.log('\n\nLooking for expire-related elements...');

    const expireElements = await page.$$eval('*', els =>
        els.filter(el => {
            const text = el.textContent || '';
            const name = el.getAttribute && el.getAttribute('name') || '';
            return (text.toLowerCase().includes('expire') || name.toLowerCase().includes('expire')) &&
                   el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE';
        }).slice(0, 10).map(el => ({
            tag: el.tagName,
            name: el.getAttribute('name'),
            class: el.getAttribute('class'),
            text: (el.textContent || '').substring(0, 100)
        }))
    );

    console.log('Expire-related elements:');
    expireElements.forEach(e => {
        console.log(`  <${e.tag}> name="${e.name}" class="${e.class}"`);
    });

    // Look for any datetime picker widgets
    console.log('\n\nLooking for datetime picker widgets...');

    const datetimeWidgets = await page.$$eval('[class*="datetime"], [class*="timepicker"], [class*="datefieldwidget"]', els =>
        els.map(e => ({
            tag: e.tagName,
            class: e.getAttribute('class'),
            id: e.getAttribute('id'),
            innerHTML: e.innerHTML.substring(0, 200)
        }))
    );

    console.log('Datetime widgets (first 10):');
    datetimeWidgets.slice(0, 10).forEach(w => {
        console.log(`  <${w.tag}> class="${w.class}" id="${w.id}"`);
    });

    // Look for fields that might be AM/PM dropdowns or time selects
    console.log('\n\nLooking for select elements (dropdowns)...');

    const selectFields = await page.$$eval('select', selects =>
        selects.map(s => ({
            name: s.getAttribute('name'),
            class: s.getAttribute('class'),
            options: Array.from(s.options).map(o => o.text).join(', ').substring(0, 100)
        }))
    );

    console.log('Select elements:');
    selectFields.forEach(s => {
        console.log(`  name="${s.name}" class="${s.class}" options="${s.options}"`);
    });

    // Look for p15 specific date/time fields
    console.log('\n\nLooking for p15 date fields specifically...');

    const p15DateFields = await page.$$eval('input[name^="p15df"]', inputs =>
        inputs.map(i => {
            const parent = i.closest('.datefieldwidget') || i.parentElement;
            return {
                name: i.getAttribute('name'),
                type: i.getAttribute('type'),
                class: i.getAttribute('class'),
                parentClass: parent ? parent.getAttribute('class') : null,
                parentHTML: parent ? parent.innerHTML.substring(0, 300) : null
            };
        })
    );

    console.log('P15 date fields:');
    p15DateFields.forEach(f => {
        console.log(`  name="${f.name}" type="${f.type}" class="${f.class}"`);
        console.log(`    parentClass="${f.parentClass}"`);
    });

    // Take a screenshot
    await page.screenshot({ path: 'screenshots/page15-inspection.png', fullPage: false });
    console.log('\nScreenshot saved to screenshots/page15-inspection.png');

    console.log('\n=== Inspection Complete ===');
    console.log('Press Ctrl+C to close browser.');

    // Keep browser open
    await new Promise(() => {});
}

inspectPage15().catch(console.error);
