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
    financingType: 'financing',
    loanType: 'conventional'
};

// Field name mappings
const FIELD_NAMES = {
    buyerName: 'Global_Info-Buyer-Entity-Name_67',
    propertyAddress: 'Global_Info-Property-Location-Address-Full_66',
    purchasePrice: 'Global_Info-Sale-Price-Amount_68'
};

// CORRECTED Checkbox mappings based on diagnostic
const CHECKBOX_NAMES = {
    // Property Type checkboxes
    propertyType: {
        single_family: 'p01cb001_71',
        one_to_four: 'p01cb002_72',
        manufactured: 'p01cb003_73',
        builder_owned: 'p01cb004_74',
        condo: 'p01cb005_75'
    },
    // Financing Type checkboxes - CORRECTED!
    financingType: {
        financing: 'p01cb007_77',  // 3A - New Financing (was p01cb006)
        loan_assumption: 'p01cb006_76',  // 3B - Loan Assumption
        cash: 'p01cb015_85'        // 3C - Cash
    },
    // Loan Type checkboxes - CORRECTED!
    loanType: {
        conventional: 'p01cb008_78',  // CONVENTIONAL (was p01cb007)
        va: 'p01cb009_79',
        fha: 'p01cb010_80',
        usda_rd: 'p01cb011_81',
        usda_direct: 'p01cb012_82',
        usda_lender: 'p01cb013_83',
        other: 'p01cb014_84'
    }
};

function log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
}

async function testPage1VoiceV2() {
    log('=== PAGE 1 VOICE TEST V2 (CORRECTED MAPPING) ===');

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

        // Q1: Buyer Name
        log(`  Buyer Name: ${PAGE1_DATA.buyerName}`);
        const buyerField = await page.$(`input[name="${FIELD_NAMES.buyerName}"]`);
        if (buyerField) {
            await buyerField.fill(PAGE1_DATA.buyerName);
            log('  ✓ Buyer name filled');
        }

        // Q3: Property Address
        log(`  Property Address: ${PAGE1_DATA.propertyAddress}`);
        const addressField = await page.$(`input[name="${FIELD_NAMES.propertyAddress}"]`);
        if (addressField) {
            await addressField.fill(PAGE1_DATA.propertyAddress);
            log('  ✓ Property address filled');
        }

        // Q4: Purchase Price
        log(`  Purchase Price: $${PAGE1_DATA.purchasePrice}`);
        const priceField = await page.$(`input[name="${FIELD_NAMES.purchasePrice}"]`);
        if (priceField) {
            await priceField.fill(PAGE1_DATA.purchasePrice);
            log('  ✓ Purchase price filled');
        }

        await page.waitForTimeout(1000);

        // Step 5: Check checkboxes
        log('Step 5: Checking checkboxes (CORRECTED MAPPING)...');

        // Q2: Property Type checkbox
        const propertyTypeCheckbox = CHECKBOX_NAMES.propertyType[PAGE1_DATA.propertyType];
        log(`  Property Type: ${PAGE1_DATA.propertyType} -> ${propertyTypeCheckbox}`);
        const propTypeEl = await page.$(`input[name="${propertyTypeCheckbox}"]`);
        if (propTypeEl) {
            await propTypeEl.click();
            log('  ✓ Property type checkbox checked');
        }

        // Q5: Financing Type checkbox (CORRECTED: 3A = p01cb007_77)
        const financingCheckbox = CHECKBOX_NAMES.financingType[PAGE1_DATA.financingType];
        log(`  Financing Type (3A): ${PAGE1_DATA.financingType} -> ${financingCheckbox}`);
        const finTypeEl = await page.$(`input[name="${financingCheckbox}"]`);
        if (finTypeEl) {
            await finTypeEl.click();
            log('  ✓ 3A (New Financing) checkbox checked');
        }

        // Q6: Loan Type checkbox (CORRECTED: CONVENTIONAL = p01cb008_78)
        if (PAGE1_DATA.financingType === 'financing') {
            const loanCheckbox = CHECKBOX_NAMES.loanType[PAGE1_DATA.loanType];
            log(`  Loan Type: ${PAGE1_DATA.loanType} -> ${loanCheckbox}`);
            const loanTypeEl = await page.$(`input[name="${loanCheckbox}"]`);
            if (loanTypeEl) {
                await loanTypeEl.click();
                log('  ✓ CONVENTIONAL checkbox checked');
            }
        }

        await page.waitForTimeout(1000);

        // Take screenshot
        await page.screenshot({ path: path.join(screenshotsDir, 'page1-voice-test-v2.png'), fullPage: true });
        log('Screenshot saved: page1-voice-test-v2.png');

        log('');
        log('=== TEST COMPLETE ===');
        log('Expected results:');
        log('  - 3A (New Financing) should be checked');
        log('  - CONVENTIONAL should be checked');
        log('');
        log('Browser stays open for 30 seconds to verify...');

        await page.waitForTimeout(30000);

    } catch (error) {
        log(`ERROR: ${error.message}`);
        await page.screenshot({ path: path.join(screenshotsDir, 'page1-voice-error-v2.png'), fullPage: true });
    } finally {
        await browser.close();
        log('Done!');
    }
}

testPage1VoiceV2().catch(console.error);
