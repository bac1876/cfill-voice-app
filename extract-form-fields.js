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

async function extractFormFields() {
    log('Extracting form fields from Real Estate Contract...');

    const browser = await chromium.launch({
        headless: false,
        slowMo: 300
    });

    const context = await browser.newContext({
        viewport: { width: 1400, height: 900 }
    });

    const page = await context.newPage();

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
        log('Navigating to Forms Library...');
        await page.goto('https://ara.formsimplicity.com/formslibrary/formslibrary', { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);

        // Click on the contract name to open it
        log('Opening Real Estate Contract Residential...');
        await page.click('a[data-form-id="60014"]');
        await page.waitForTimeout(5000);

        log(`URL: ${page.url()}`);

        // Extract all input fields
        log('Extracting input fields...');

        const inputFields = await page.$$eval('input[type="text"]', inputs =>
            inputs.map(input => ({
                name: input.name,
                id: input.id,
                placeholder: input.placeholder,
                value: input.value,
                title: input.title,
                className: input.className,
                visible: input.offsetParent !== null
            }))
        );

        log(`Found ${inputFields.length} text input fields`);

        // Filter visible fields
        const visibleFields = inputFields.filter(f => f.visible && f.name);
        log(`Visible fields with names: ${visibleFields.length}`);

        // Print all visible fields
        visibleFields.forEach((field, i) => {
            log(`Field ${i}: name="${field.name}" title="${field.title}" class="${field.className}"`);
        });

        // Extract all textarea fields
        const textareaFields = await page.$$eval('textarea', tas =>
            tas.map(ta => ({
                name: ta.name,
                id: ta.id,
                placeholder: ta.placeholder,
                title: ta.title,
                className: ta.className,
                visible: ta.offsetParent !== null
            }))
        );

        log(`Found ${textareaFields.length} textarea fields`);
        const visibleTextareas = textareaFields.filter(f => f.visible && f.name);
        visibleTextareas.forEach((field, i) => {
            log(`Textarea ${i}: name="${field.name}" title="${field.title}"`);
        });

        // Extract select fields
        const selectFields = await page.$$eval('select', selects =>
            selects.map(s => ({
                name: s.name,
                id: s.id,
                title: s.title,
                options: Array.from(s.options).map(o => ({ value: o.value, text: o.text })),
                visible: s.offsetParent !== null
            }))
        );

        log(`Found ${selectFields.length} select fields`);
        const visibleSelects = selectFields.filter(f => f.visible && f.name);
        visibleSelects.forEach((field, i) => {
            log(`Select ${i}: name="${field.name}" options=${JSON.stringify(field.options.slice(0, 5))}`);
        });

        // Extract checkbox fields
        const checkboxFields = await page.$$eval('input[type="checkbox"]', cbs =>
            cbs.map(cb => ({
                name: cb.name,
                id: cb.id,
                value: cb.value,
                title: cb.title,
                visible: cb.offsetParent !== null
            }))
        );

        log(`Found ${checkboxFields.length} checkbox fields`);
        const visibleCheckboxes = checkboxFields.filter(f => f.visible && f.name);
        visibleCheckboxes.forEach((field, i) => {
            log(`Checkbox ${i}: name="${field.name}" value="${field.value}" title="${field.title}"`);
        });

        // Save all fields to JSON
        const allFields = {
            inputs: visibleFields,
            textareas: visibleTextareas,
            selects: visibleSelects,
            checkboxes: visibleCheckboxes
        };

        fs.writeFileSync(
            path.join(__dirname, 'form-fields.json'),
            JSON.stringify(allFields, null, 2)
        );
        log('Saved form fields to form-fields.json');

        // Look for Save button
        log('Looking for Save button...');
        const saveBtn = await page.$('a:has-text("Save")');
        if (saveBtn) {
            log('Found Save button');
            const saveHref = await saveBtn.getAttribute('href');
            const saveClass = await saveBtn.getAttribute('class');
            log(`Save button: href="${saveHref}" class="${saveClass}"`);
        }

        // Keep browser open
        log('Extraction complete! Browser stays open for 30 seconds...');
        await page.waitForTimeout(30000);

    } catch (error) {
        log(`ERROR: ${error.message}`);
        console.error(error);
    } finally {
        await browser.close();
        log('Done!');
    }
}

extractFormFields().catch(console.error);
