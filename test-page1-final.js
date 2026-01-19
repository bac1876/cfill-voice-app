const { chromium } = require('playwright');
const path = require('path');

// Credentials
const USERNAME = '11621010';
const PASSWORD = 'lbbc2245';
const LOGIN_URL = 'https://ara.formsimplicity.com';

const screenshotsDir = path.join(__dirname, 'screenshots');

// Test data from Voice Q&A
const PAGE1_DATA = {
    buyerName: 'Brian Curtis and Lisa Curtis',
    propertyType: 'single_family',
    propertyAddress: '123 Main Street, Bentonville, AR 72712',
    purchasePrice: '450000',
    purchaseType: 'new_financing',
    loanType: 'conventional'
};

// VERIFIED CORRECT MAPPINGS
const FIELD_NAMES = {
    buyerName: 'Global_Info-Buyer-Entity-Name_67',
    propertyAddress: 'Global_Info-Property-Location-Address-Full_66',
    purchasePrice: 'Global_Info-Sale-Price-Amount_68'
};

const CHECKBOX_MAPPINGS = {
    propertyType: {
        single_family: 'p01cb001_71',
        one_to_four: 'p01cb002_72',
        manufactured: 'p01cb003_73',
        builder_owned: 'p01cb004_74',
        condo: 'p01cb005_75'
    },
    purchaseType: {
        new_financing: 'p01cb006_76',  // 3A
        loan_assumption: 'p01cb007_77', // 3B
        cash: 'p01cb008_78'             // 3C
    },
    loanType: {
        conventional: 'p01cb009_79',
        va: 'p01cb010_80',
        fha: 'p01cb011_81',
        usda_rd: 'p01cb012_82',
        other: 'p01cb013_83'
    }
};

function log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
}

async function testPage1Final() {
    log('=== PAGE 1 FINAL TEST (VERIFIED MAPPINGS) ===');
    log('');
    log('Test Data:');
    log(`  Buyer: ${PAGE1_DATA.buyerName}`);
    log(`  Property Type: ${PAGE1_DATA.propertyType}`);
    log(`  Address: ${PAGE1_DATA.propertyAddress}`);
    log(`  Price: $${PAGE1_DATA.purchasePrice}`);
    log(`  Purchase Type: ${PAGE1_DATA.purchaseType}`);
    log(`  Loan Type: ${PAGE1_DATA.loanType}`);
    log('');

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

        // Step 4: Fill text fields
        log('Step 4: Filling text fields...');

        // Buyer Name
        const buyerField = await page.$(`input[name="${FIELD_NAMES.buyerName}"]`);
        if (buyerField) {
            await buyerField.fill(PAGE1_DATA.buyerName);
            log(`  ✓ Buyer Name: ${PAGE1_DATA.buyerName}`);
        } else {
            log('  ✗ Buyer Name field not found');
        }

        // Property Address
        const addressField = await page.$(`input[name="${FIELD_NAMES.propertyAddress}"]`);
        if (addressField) {
            await addressField.fill(PAGE1_DATA.propertyAddress);
            log(`  ✓ Property Address: ${PAGE1_DATA.propertyAddress}`);
        } else {
            log('  ✗ Property Address field not found');
        }

        // Purchase Price
        const priceField = await page.$(`input[name="${FIELD_NAMES.purchasePrice}"]`);
        if (priceField) {
            await priceField.fill(PAGE1_DATA.purchasePrice);
            log(`  ✓ Purchase Price: $${PAGE1_DATA.purchasePrice}`);
        } else {
            log('  ✗ Purchase Price field not found');
        }

        await page.waitForTimeout(1000);

        // Step 5: Check checkboxes
        log('Step 5: Checking checkboxes...');

        // Property Type
        const propTypeCheckbox = CHECKBOX_MAPPINGS.propertyType[PAGE1_DATA.propertyType];
        log(`  Property Type: ${PAGE1_DATA.propertyType} -> ${propTypeCheckbox}`);
        const propTypeEl = await page.$(`input[name="${propTypeCheckbox}"]`);
        if (propTypeEl) {
            await propTypeEl.click();
            log('  ✓ Property Type checkbox checked');
        } else {
            log('  ✗ Property Type checkbox not found');
        }

        // Purchase Type (3A, 3B, or 3C)
        const purchaseTypeCheckbox = CHECKBOX_MAPPINGS.purchaseType[PAGE1_DATA.purchaseType];
        log(`  Purchase Type: ${PAGE1_DATA.purchaseType} -> ${purchaseTypeCheckbox}`);
        const purchaseTypeEl = await page.$(`input[name="${purchaseTypeCheckbox}"]`);
        if (purchaseTypeEl) {
            await purchaseTypeEl.click();
            log('  ✓ Purchase Type (3A) checkbox checked');
        } else {
            log('  ✗ Purchase Type checkbox not found');
        }

        // Loan Type (only if new_financing)
        if (PAGE1_DATA.purchaseType === 'new_financing') {
            const loanTypeCheckbox = CHECKBOX_MAPPINGS.loanType[PAGE1_DATA.loanType];
            log(`  Loan Type: ${PAGE1_DATA.loanType} -> ${loanTypeCheckbox}`);
            const loanTypeEl = await page.$(`input[name="${loanTypeCheckbox}"]`);
            if (loanTypeEl) {
                await loanTypeEl.click();
                log('  ✓ Loan Type (CONVENTIONAL) checkbox checked');
            } else {
                log('  ✗ Loan Type checkbox not found');
            }
        }

        await page.waitForTimeout(1000);

        // Take screenshot
        await page.screenshot({ path: path.join(screenshotsDir, 'page1-final-test.png'), fullPage: true });
        log('');
        log('Screenshot saved: page1-final-test.png');

        log('');
        log('=== TEST COMPLETE ===');
        log('');
        log('EXPECTED RESULTS:');
        log('  - Buyer Name: Brian Curtis and Lisa Curtis');
        log('  - Property Type: Single family detached home (checked)');
        log('  - Address: 123 Main Street, Bentonville, AR 72712');
        log('  - Price: 450000');
        log('  - 3A (New Financing): CHECKED');
        log('  - CONVENTIONAL: CHECKED');
        log('');
        log('Browser stays open for 30 seconds to verify...');

        await page.waitForTimeout(30000);

    } catch (error) {
        log(`ERROR: ${error.message}`);
        await page.screenshot({ path: path.join(screenshotsDir, 'page1-final-error.png'), fullPage: true });
    } finally {
        await browser.close();
        log('Done!');
    }
}

testPage1Final().catch(console.error);
