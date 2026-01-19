const { chromium } = require('playwright');
const path = require('path');

// Credentials
const USERNAME = '11621010';
const PASSWORD = 'lbbc2245';
const LOGIN_URL = 'https://ara.formsimplicity.com';

const screenshotsDir = path.join(__dirname, 'screenshots');

// Test data from Voice Q&A
const PAGE1_DATA = {
    // Q1: Who are the buyers?
    buyerName: 'Brian Curtis and Lisa Curtis',

    // Q2: Property type (which checkbox to check)
    propertyType: 'single_family', // Options: single_family, one_to_four, manufactured, builder_owned, condo

    // Q3: Property address
    propertyAddress: '123 Main Street, Bentonville, AR 72712',

    // Q4: Purchase price
    purchasePrice: '450000',

    // Q5: Financing or Cash
    financingType: 'financing', // Options: financing, cash

    // Q6: Loan type (only if financing)
    loanType: 'conventional' // Options: conventional, va, fha, usda_direct, usda_lender, other
};

// Field name mappings
const FIELD_NAMES = {
    buyerName: 'Global_Info-Buyer-Entity-Name_67',
    propertyAddress: 'Global_Info-Property-Location-Address-Full_66',
    purchasePrice: 'Global_Info-Sale-Price-Amount_68'
};

// Checkbox mappings
const CHECKBOX_NAMES = {
    // Property Type checkboxes (Q2)
    propertyType: {
        single_family: 'p01cb001_71',
        one_to_four: 'p01cb002_72',
        manufactured: 'p01cb003_73',
        builder_owned: 'p01cb004_74',
        condo: 'p01cb005_75'
    },
    // Financing Type checkboxes (Q5)
    financingType: {
        financing: 'p01cb006_76', // 3A - New Financing
        cash: 'p01cb015_85'       // 3C - Cash
    },
    // Loan Type checkboxes (Q6)
    loanType: {
        conventional: 'p01cb007_77',
        va: 'p01cb008_78',
        fha: 'p01cb009_79',
        usda_rd: 'p01cb010_80',
        usda_direct: 'p01cb011_81',
        usda_lender: 'p01cb012_82',
        other: 'p01cb013_83'
    }
};

function log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
}

async function testPage1Voice() {
    log('=== PAGE 1 VOICE TEST ===');
    log('Testing with data collected from voice Q&A');

    const browser = await chromium.launch({
        headless: false,
        slowMo: 300
    });

    const context = await browser.newContext({
        viewport: { width: 1400, height: 900 }
    });

    const page = await context.newPage();

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
        log(`URL: ${page.url()}`);

        // Step 4: Fill text fields
        log('Step 4: Filling text fields from voice data...');

        // Q1: Buyer Name
        log(`  Q1 - Buyer Name: ${PAGE1_DATA.buyerName}`);
        const buyerField = await page.$(`input[name="${FIELD_NAMES.buyerName}"]`);
        if (buyerField) {
            await buyerField.fill(PAGE1_DATA.buyerName);
            log('  ✓ Buyer name filled');
        } else {
            log('  ✗ Buyer name field not found');
        }

        // Q3: Property Address
        log(`  Q3 - Property Address: ${PAGE1_DATA.propertyAddress}`);
        const addressField = await page.$(`input[name="${FIELD_NAMES.propertyAddress}"]`);
        if (addressField) {
            await addressField.fill(PAGE1_DATA.propertyAddress);
            log('  ✓ Property address filled');
        } else {
            log('  ✗ Property address field not found');
        }

        // Q4: Purchase Price
        log(`  Q4 - Purchase Price: $${PAGE1_DATA.purchasePrice}`);
        const priceField = await page.$(`input[name="${FIELD_NAMES.purchasePrice}"]`);
        if (priceField) {
            await priceField.fill(PAGE1_DATA.purchasePrice);
            log('  ✓ Purchase price filled');
        } else {
            log('  ✗ Purchase price field not found');
        }

        await page.waitForTimeout(1000);

        // Step 5: Check checkboxes
        log('Step 5: Checking checkboxes from voice data...');

        // Q2: Property Type checkbox
        const propertyTypeCheckbox = CHECKBOX_NAMES.propertyType[PAGE1_DATA.propertyType];
        log(`  Q2 - Property Type: ${PAGE1_DATA.propertyType} -> ${propertyTypeCheckbox}`);
        const propTypeEl = await page.$(`input[name="${propertyTypeCheckbox}"]`);
        if (propTypeEl) {
            await propTypeEl.click();
            log('  ✓ Property type checkbox checked');
        } else {
            log('  ✗ Property type checkbox not found');
        }

        // Q5: Financing Type checkbox
        const financingCheckbox = CHECKBOX_NAMES.financingType[PAGE1_DATA.financingType];
        log(`  Q5 - Financing Type: ${PAGE1_DATA.financingType} -> ${financingCheckbox}`);
        const finTypeEl = await page.$(`input[name="${financingCheckbox}"]`);
        if (finTypeEl) {
            await finTypeEl.click();
            log('  ✓ Financing type checkbox checked');
        } else {
            log('  ✗ Financing type checkbox not found');
        }

        // Q6: Loan Type checkbox (only if financing)
        if (PAGE1_DATA.financingType === 'financing') {
            const loanCheckbox = CHECKBOX_NAMES.loanType[PAGE1_DATA.loanType];
            log(`  Q6 - Loan Type: ${PAGE1_DATA.loanType} -> ${loanCheckbox}`);
            const loanTypeEl = await page.$(`input[name="${loanCheckbox}"]`);
            if (loanTypeEl) {
                await loanTypeEl.click();
                log('  ✓ Loan type checkbox checked');
            } else {
                log('  ✗ Loan type checkbox not found');
            }
        }

        await page.waitForTimeout(1000);

        // Take screenshot of filled Page 1
        await page.screenshot({ path: path.join(screenshotsDir, 'page1-voice-test.png'), fullPage: true });
        log('Screenshot saved: page1-voice-test.png');

        // Summary
        log('');
        log('=== PAGE 1 TEST COMPLETE ===');
        log('Summary:');
        log(`  Buyer: ${PAGE1_DATA.buyerName}`);
        log(`  Property Type: ${PAGE1_DATA.propertyType}`);
        log(`  Address: ${PAGE1_DATA.propertyAddress}`);
        log(`  Price: $${PAGE1_DATA.purchasePrice}`);
        log(`  Financing: ${PAGE1_DATA.financingType}`);
        log(`  Loan Type: ${PAGE1_DATA.loanType}`);
        log('');
        log('Browser stays open for 30 seconds to verify...');

        await page.waitForTimeout(30000);

    } catch (error) {
        log(`ERROR: ${error.message}`);
        await page.screenshot({ path: path.join(screenshotsDir, 'page1-voice-error.png'), fullPage: true });
    } finally {
        await browser.close();
        log('Done!');
    }
}

testPage1Voice().catch(console.error);
