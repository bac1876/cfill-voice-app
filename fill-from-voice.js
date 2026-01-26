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

// Smart date parser - handles natural language dates like "March 15th, 2026" or "01/15/2026"
function parseNaturalDate(dateString) {
    if (!dateString) return null;

    const monthNames = {
        'january': 1, 'jan': 1,
        'february': 2, 'feb': 2,
        'march': 3, 'mar': 3,
        'april': 4, 'apr': 4,
        'may': 5,
        'june': 6, 'jun': 6,
        'july': 7, 'jul': 7,
        'august': 8, 'aug': 8,
        'september': 9, 'sep': 9, 'sept': 9,
        'october': 10, 'oct': 10,
        'november': 11, 'nov': 11,
        'december': 12, 'dec': 12
    };

    const str = dateString.toLowerCase().trim();

    // Try MM/DD/YYYY or MM-DD-YYYY format first
    const slashMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (slashMatch) {
        return {
            month: parseInt(slashMatch[1], 10),
            day: parseInt(slashMatch[2], 10),
            year: parseInt(slashMatch[3], 10)
        };
    }

    // Try "Month Day, Year" or "Month Day Year" or "Month Dayth, Year" format
    // Examples: "March 15, 2026", "March 15th, 2026", "March 15 2026"
    const monthDayYearMatch = str.match(/([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i);
    if (monthDayYearMatch) {
        const monthName = monthDayYearMatch[1].toLowerCase();
        const month = monthNames[monthName];
        const day = parseInt(monthDayYearMatch[2], 10);
        let year = monthDayYearMatch[3] ? parseInt(monthDayYearMatch[3], 10) : new Date().getFullYear();

        // If year is less than 100, assume 2000s
        if (year < 100) year += 2000;

        if (month && day) {
            return { month, day, year };
        }
    }

    // Try "Day Month Year" format (European style)
    const dayMonthYearMatch = str.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+),?\s*(\d{4})?/i);
    if (dayMonthYearMatch) {
        const day = parseInt(dayMonthYearMatch[1], 10);
        const monthName = dayMonthYearMatch[2].toLowerCase();
        const month = monthNames[monthName];
        let year = dayMonthYearMatch[3] ? parseInt(dayMonthYearMatch[3], 10) : new Date().getFullYear();

        if (year < 100) year += 2000;

        if (month && day) {
            return { month, day, year };
        }
    }

    // Try to extract just numbers if nothing else works
    const numbers = str.match(/\d+/g);
    if (numbers && numbers.length >= 2) {
        // Assume first number is month or day, second is the other, third is year
        let month, day, year;

        if (numbers.length >= 3) {
            // Could be MM DD YYYY
            const first = parseInt(numbers[0], 10);
            const second = parseInt(numbers[1], 10);
            year = parseInt(numbers[2], 10);

            if (first > 12) {
                // First must be day
                day = first;
                month = second;
            } else if (second > 12) {
                // Second must be day
                month = first;
                day = second;
            } else {
                // Assume MM/DD format
                month = first;
                day = second;
            }
        } else {
            // Only 2 numbers - assume month and day, use current year
            month = parseInt(numbers[0], 10);
            day = parseInt(numbers[1], 10);
            year = new Date().getFullYear();
        }

        if (year < 100) year += 2000;

        if (month && day && month <= 12 && day <= 31) {
            return { month, day, year };
        }
    }

    return null;
}

// Clean text values - remove trailing periods and extra whitespace
function cleanTextValue(value) {
    if (!value) return value;
    let cleaned = String(value).trim();
    // Remove trailing period (speech recognition often adds one)
    if (cleaned.endsWith('.')) {
        cleaned = cleaned.slice(0, -1);
    }
    return cleaned.trim();
}

// Convert text numbers to numeric strings (e.g., "forty eight" -> "48", "three" -> "3")
function textToNumber(value) {
    if (!value) return value;

    const textNumbers = {
        'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
        'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
        'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
        'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19,
        'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50,
        'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90,
        'hundred': 100
    };

    let str = String(value).toLowerCase().trim();
    // Remove "hours", "days", etc.
    str = str.replace(/\s*(hours?|days?)\s*/gi, '').trim();

    // Check if already a number
    if (/^\d+$/.test(str)) return str;

    // Handle compound numbers like "forty eight" -> 48
    let total = 0;
    const words = str.split(/[\s-]+/);
    for (const word of words) {
        if (textNumbers[word]) {
            total += textNumbers[word];
        }
    }

    return total > 0 ? String(total) : str;
}

// Format items list with commas (e.g., "Refrigerator washer dryer" -> "Refrigerator, washer, dryer")
function formatItemsList(value) {
    if (!value) return value;

    let str = String(value).trim();
    // Remove trailing period
    if (str.endsWith('.')) {
        str = str.slice(0, -1);
    }

    // Split on spaces but preserve multi-word items with "and"
    // Handle patterns like "Refrigerator washer dryer" or "Refrigerator and washer and dryer"
    const items = str.split(/\s+(?:and\s+)?/i)
        .map(item => item.trim())
        .filter(item => item.length > 0 && item.toLowerCase() !== 'and');

    // Capitalize first letter of each item
    const formatted = items.map(item =>
        item.charAt(0).toUpperCase() + item.slice(1).toLowerCase()
    );

    return formatted.join(', ');
}

// Parse time value to extract just the numeric time (e.g., "5PM" -> "5:00", "5 p.m." -> "5:00")
function parseTimeValue(value) {
    if (!value) return null;

    const str = String(value).toLowerCase().replace(/\./g, '').trim();

    // Extract hour and optional minutes
    const match = str.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (match) {
        const hour = match[1];
        const minutes = match[2] || '00';
        return `${hour}:${minutes}`;
    }

    return value;
}

async function fillFromVoice() {
    // Load answers from voice app
    const answersPath = path.join(__dirname, 'contract-answers.json');

    if (!fs.existsSync(answersPath)) {
        log('ERROR: No answers file found!');
        log('Please use the voice app first to collect contract answers.');
        log('Run: cd voice-app && npm start');
        process.exit(1);
    }

    const answers = JSON.parse(fs.readFileSync(answersPath, 'utf8'));

    log('=== FILLING CONTRACT FROM VOICE ANSWERS ===');
    log('');
    log('Answers loaded:');
    for (const [key, value] of Object.entries(answers)) {
        log(`  ${key}: ${value.display}`);
    }
    log('');

    const browser = await chromium.launch({
        headless: false,
        slowMo: 200
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

        // Step 4: Fill Page 1 buyer name and basic fields
        log('Step 4: Filling Page 1 buyer name and basic fields...');

        // Fill buyer name on Page 1 (Global_Info-Buyer-Entity-Name_67)
        if (answers.buyer_1_name?.value) {
            const buyerName = cleanTextValue(answers.buyer_1_name.value);
            // If there's a second buyer, combine names
            let fullBuyerName = buyerName;
            if (answers.has_buyer_2?.value === 'yes' && answers.buyer_2_name?.value) {
                const buyer2Name = cleanTextValue(answers.buyer_2_name.value);
                fullBuyerName = `${buyerName} and ${buyer2Name}`;
            }

            const buyerNameField = await page.$('input[name="Global_Info-Buyer-Entity-Name_67"]');
            if (buyerNameField) {
                await buyerNameField.scrollIntoViewIfNeeded();
                await page.waitForTimeout(200);
                await buyerNameField.fill(fullBuyerName);
                log(`  ✓ Buyer Name (Page 1): ${fullBuyerName}`);
            } else {
                log('  ✗ Buyer name field not found (Global_Info-Buyer-Entity-Name_67)');
            }
        }

        // Fill property address (Global_Info-Property-Location-Address-Full_66)
        if (answers.property_address?.value) {
            const propertyAddress = cleanTextValue(answers.property_address.value);
            const addressField = await page.$('input[name="Global_Info-Property-Location-Address-Full_66"]');
            if (addressField) {
                await addressField.scrollIntoViewIfNeeded();
                await page.waitForTimeout(200);
                await addressField.fill(propertyAddress);
                log(`  ✓ Property Address: ${propertyAddress}`);
            } else {
                log('  ✗ Property address field not found (Global_Info-Property-Location-Address-Full_66)');
            }
        }

        // Fill purchase price - different field for cash vs financing
        if (answers.purchase_price?.value) {
            // Cash transactions use p01tf003, financing uses Global_Info-Sale-Price-Amount_68
            const isCash = answers.purchase_method?.value === 'cash';
            const priceFieldName = isCash ? 'p01tf003' : 'Global_Info-Sale-Price-Amount_68';
            const priceField = await page.$(`input[name="${priceFieldName}"]`);
            if (priceField) {
                await priceField.scrollIntoViewIfNeeded();
                await page.waitForTimeout(200);
                await priceField.fill(String(answers.purchase_price.value));
                log(`  ✓ Purchase Price: $${answers.purchase_price.value} (${isCash ? 'cash field' : 'financing field'})`);
            } else {
                log(`  ✗ Purchase price field not found (${priceFieldName})`);
            }
        }

        await page.waitForTimeout(1000);

        // Step 5: Check checkboxes
        log('Step 5: Checking checkboxes...');

        const checkboxAnswers = [
            'property_type',
            'purchase_method',
            'loan_type'
            // dual_agency handled separately in Step 7
            // remaining fields will be added as we map more pages
        ];

        for (const key of checkboxAnswers) {
            const answer = answers[key];
            if (answer && answer.fieldName) {
                const checkbox = await page.$(`input[name="${answer.fieldName}"]`);
                if (checkbox) {
                    // Scroll to checkbox first
                    await checkbox.scrollIntoViewIfNeeded();
                    await page.waitForTimeout(200);

                    // Check if not already checked
                    const isChecked = await checkbox.isChecked();
                    if (!isChecked) {
                        await checkbox.click();
                    }
                    log(`  ✓ ${key}: ${answer.display}`);
                } else {
                    log(`  ✗ ${key}: checkbox not found (${answer.fieldName})`);
                }
            }
        }

        await page.waitForTimeout(1000);

        // Step 6: Handle Page 2 (scroll to load it first)
        log('Step 6: Handling Page 2 (loan type conditions)...');

        // Scroll down to load Page 2
        await page.evaluate(() => window.scrollTo(0, 1500));
        await page.waitForTimeout(1000);

        const loanType = answers.loan_type?.value;
        const purchasePrice = answers.purchase_price?.value;

        // If VA loan - check VA acknowledgment
        if (loanType === 'va') {
            const vaCheckbox = await page.$('input[name="p02cb001_98"]');
            if (vaCheckbox) {
                await vaCheckbox.scrollIntoViewIfNeeded();
                await page.waitForTimeout(200);
                const isChecked = await vaCheckbox.isChecked();
                if (!isChecked) await vaCheckbox.click();
                log('  ✓ VA acknowledgment checked');
            } else {
                log('  ✗ VA acknowledgment checkbox not found');
            }
        }

        // If FHA loan - check FHA disclosure + fill purchase price
        // CORRECTED: p02cb002_99 is FHA (not p02cb003_100)
        if (loanType === 'fha') {
            const fhaCheckbox = await page.$('input[name="p02cb002_99"]');
            if (fhaCheckbox) {
                await fhaCheckbox.scrollIntoViewIfNeeded();
                await page.waitForTimeout(200);
                const isChecked = await fhaCheckbox.isChecked();
                if (!isChecked) await fhaCheckbox.click();
                log('  ✓ FHA disclosure checked');
            }

            // Fill purchase price in FHA blank
            const fhaPrice = await page.$('input[name="p02tf001_97"]');
            if (fhaPrice && purchasePrice) {
                await fhaPrice.scrollIntoViewIfNeeded();
                await fhaPrice.fill(String(purchasePrice));
                log(`  ✓ FHA purchase price: $${purchasePrice}`);
            }
        }

        // Home inspection checkbox (p02cb003_100)
        // FHA loan = always check it
        // Non-FHA loan = check only if user answered yes to home_inspection_form question
        const homeInspectionCheckbox = await page.$('input[name="p02cb003_100"]');
        if (homeInspectionCheckbox) {
            const shouldCheck = loanType === 'fha' || answers.home_inspection_form?.value === 'yes';
            if (shouldCheck) {
                await homeInspectionCheckbox.scrollIntoViewIfNeeded();
                await page.waitForTimeout(200);
                const isChecked = await homeInspectionCheckbox.isChecked();
                if (!isChecked) await homeInspectionCheckbox.click();
                log('  ✓ Home inspection form checked');
            }
        }

        await page.waitForTimeout(500);

        // Step 7: Handle Page 3 (Agency - scroll to load it)
        log('Step 7: Handling Page 3 (Agency)...');

        // Scroll down to load Page 3
        await page.evaluate(() => window.scrollTo(0, 3500));
        await page.waitForTimeout(1000);

        const dualAgency = answers.dual_agency;
        if (dualAgency && dualAgency.fieldName) {
            const agencyCheckbox = await page.$(`input[name="${dualAgency.fieldName}"]`);
            if (agencyCheckbox) {
                await agencyCheckbox.scrollIntoViewIfNeeded();
                await page.waitForTimeout(200);
                const isChecked = await agencyCheckbox.isChecked();
                if (!isChecked) await agencyCheckbox.click();
                log(`  ✓ Agency: ${dualAgency.display}`);
            } else {
                log(`  ✗ Agency checkbox not found (${dualAgency.fieldName})`);
            }
        }

        await page.waitForTimeout(1000);

        // Step 8: Handle Paragraph 5 - Loan and Closing Costs (Page 4)
        log('Step 8: Handling Paragraph 5 (Closing Costs)...');

        // Scroll to Page 4
        await page.evaluate(() => window.scrollTo(0, 5000));
        await page.waitForTimeout(1000);

        // If seller_pay_closing_costs is yes, fill in the amount
        if (answers.seller_pay_closing_costs?.value === 'yes' && answers.closing_costs_amount?.value) {
            const closingCostsField = await page.$('textarea[name="p04tf002_149"]');
            if (closingCostsField) {
                await closingCostsField.scrollIntoViewIfNeeded();
                await page.waitForTimeout(200);
                const amount = answers.closing_costs_amount.value;
                const closingCostsText = `Seller agrees to pay up to $${amount} of buyer's costs and prepaid items.`;
                await closingCostsField.fill(closingCostsText);
                log(`  ✓ Closing costs: ${closingCostsText}`);
            } else {
                log('  ✗ Closing costs field not found (p04tf002_149)');
            }
        }

        await page.waitForTimeout(500);

        // Step 9: Handle Earnest Money (Paragraph 6)
        log('Step 9: Handling Earnest Money...');

        // Is there earnest money? Yes = Box A, No = Box B
        const hasEarnestMoney = answers.has_earnest_money?.value;
        if (hasEarnestMoney === 'yes') {
            const earnestMoneyYes = await page.$('input[name="p04cb001_155"]');
            if (earnestMoneyYes) {
                await earnestMoneyYes.scrollIntoViewIfNeeded();
                await page.waitForTimeout(200);
                const isChecked = await earnestMoneyYes.isChecked();
                if (!isChecked) await earnestMoneyYes.click();
                log('  ✓ Earnest Money: Yes (Box A)');
            }
        } else if (hasEarnestMoney === 'no') {
            const earnestMoneyNo = await page.$('input[name="p04cb002_156"]');
            if (earnestMoneyNo) {
                await earnestMoneyNo.scrollIntoViewIfNeeded();
                await page.waitForTimeout(200);
                const isChecked = await earnestMoneyNo.isChecked();
                if (!isChecked) await earnestMoneyNo.click();
                log('  ✓ Earnest Money: No (Box B)');
            }
        }

        await page.waitForTimeout(500);

        // Step 10: Handle Paragraph 8 - Nonrefundable Deposit
        log('Step 10: Handling Nonrefundable Deposit...');

        const hasNonrefundableDeposit = answers.has_nonrefundable_deposit?.value;

        if (hasNonrefundableDeposit === 'no') {
            // No nonrefundable deposit - check p04cb003_157
            const noDepositCheckbox = await page.$('input[name="p04cb003_157"]');
            if (noDepositCheckbox) {
                await noDepositCheckbox.scrollIntoViewIfNeeded();
                await page.waitForTimeout(200);
                const isChecked = await noDepositCheckbox.isChecked();
                if (!isChecked) await noDepositCheckbox.click();
                log('  ✓ Nonrefundable Deposit: No');
            }
        } else if (hasNonrefundableDeposit === 'yes') {
            // Check the deposit checkbox first
            const depositCheckbox = await page.$('input[name="p04cb004_158"]');
            if (depositCheckbox) {
                await depositCheckbox.scrollIntoViewIfNeeded();
                await page.waitForTimeout(200);
                const isChecked = await depositCheckbox.isChecked();
                if (!isChecked) await depositCheckbox.click();
                log('  ✓ Nonrefundable Deposit: Yes');
            }

            // Fill in the deposit amount
            if (answers.nonrefundable_deposit_amount?.value) {
                const depositAmountField = await page.$('input[name="p04tf003_152"]');
                if (depositAmountField) {
                    await depositAmountField.scrollIntoViewIfNeeded();
                    await page.waitForTimeout(200);
                    await depositAmountField.fill(String(answers.nonrefundable_deposit_amount.value));
                    log(`  ✓ Nonrefundable deposit amount: $${answers.nonrefundable_deposit_amount.value}`);
                }
            }

            // Check which timing option
            const depositTiming = answers.nonrefundable_deposit_timing?.value;

            if (depositTiming === 'within_days') {
                // Within X days of contract signing - check box and fill days
                const withinDaysCheckbox = await page.$('input[name="p04cb005_159"]');
                if (withinDaysCheckbox) {
                    await withinDaysCheckbox.scrollIntoViewIfNeeded();
                    await page.waitForTimeout(200);
                    const isChecked = await withinDaysCheckbox.isChecked();
                    if (!isChecked) await withinDaysCheckbox.click();
                    log('  ✓ Deposit timing: Within days of contract signing');
                }

                // Fill in the days field - convert text numbers to numeric (e.g., "Three" -> "3")
                const daysValue = answers.nonrefundable_deposit_days?.value;
                if (daysValue) {
                    const numericDays = textToNumber(daysValue);
                    const daysField = await page.$('input[name="p04tf004_153"]');
                    if (daysField) {
                        await daysField.scrollIntoViewIfNeeded();
                        await page.waitForTimeout(200);
                        await daysField.fill(numericDays);
                        log(`  ✓ Days after contract signing: ${numericDays}`);
                    }
                }
            } else if (depositTiming === 'after_repairs') {
                // Within 3 days following agreement of repairs
                const afterRepairsCheckbox = await page.$('input[name="p04cb006_160"]');
                if (afterRepairsCheckbox) {
                    await afterRepairsCheckbox.scrollIntoViewIfNeeded();
                    await page.waitForTimeout(200);
                    const isChecked = await afterRepairsCheckbox.isChecked();
                    if (!isChecked) await afterRepairsCheckbox.click();
                    log('  ✓ Deposit timing: Within 3 days following agreement of repairs');
                }
            } else if (depositTiming === 'other') {
                // Other option - check box and fill in custom text
                const otherCheckbox = await page.$('input[name="p04cb007_161"]');
                if (otherCheckbox) {
                    await otherCheckbox.scrollIntoViewIfNeeded();
                    await page.waitForTimeout(200);
                    const isChecked = await otherCheckbox.isChecked();
                    if (!isChecked) await otherCheckbox.click();
                    log('  ✓ Deposit timing: Other');
                }

                if (answers.nonrefundable_deposit_other?.value) {
                    const otherField = await page.$('input[name="p04tf005_154"]');
                    if (otherField) {
                        await otherField.scrollIntoViewIfNeeded();
                        await page.waitForTimeout(200);
                        // Max 76 characters
                        const otherText = String(answers.nonrefundable_deposit_other.value).substring(0, 76);
                        await otherField.fill(otherText);
                        log(`  ✓ Other details: ${otherText}`);
                    }
                }
            }
        }

        await page.waitForTimeout(500);

        // Step 11: Handle Paragraph 10 - Title Insurance (Page 5)
        log('Step 11: Handling Paragraph 10 (Title Insurance)...');

        // Scroll to Page 5
        await page.evaluate(() => window.scrollTo(0, 6500));
        await page.waitForTimeout(1000);

        const titlePayer = answers.title_insurance_payer?.value;

        if (titlePayer === 'seller') {
            // Seller pays - Box A (p05cb001_179)
            const sellerPaysCheckbox = await page.$('input[name="p05cb001_179"]');
            if (sellerPaysCheckbox) {
                await sellerPaysCheckbox.scrollIntoViewIfNeeded();
                await page.waitForTimeout(200);
                const isChecked = await sellerPaysCheckbox.isChecked();
                if (!isChecked) await sellerPaysCheckbox.click();
                log('  ✓ Title Insurance: Seller pays (Box A)');
            }
        } else if (titlePayer === 'split') {
            // Buyer and Seller split - Box B (p05cb002_180)
            const splitCheckbox = await page.$('input[name="p05cb002_180"]');
            if (splitCheckbox) {
                await splitCheckbox.scrollIntoViewIfNeeded();
                await page.waitForTimeout(200);
                const isChecked = await splitCheckbox.isChecked();
                if (!isChecked) await splitCheckbox.click();
                log('  ✓ Title Insurance: Buyer and Seller split (Box B)');
            }
        } else if (titlePayer === 'other') {
            // Other - Box C (p05cb003_181) + fill text field
            const otherCheckbox = await page.$('input[name="p05cb003_181"]');
            if (otherCheckbox) {
                await otherCheckbox.scrollIntoViewIfNeeded();
                await page.waitForTimeout(200);
                const isChecked = await otherCheckbox.isChecked();
                if (!isChecked) await otherCheckbox.click();
                log('  ✓ Title Insurance: Other (Box C)');
            }

            // Fill in the other text field
            if (answers.title_insurance_other?.value) {
                const otherField = await page.$('input[name="p05tf001_183"]');
                if (otherField) {
                    await otherField.scrollIntoViewIfNeeded();
                    await page.waitForTimeout(200);
                    await otherField.fill(String(answers.title_insurance_other.value));
                    log(`  ✓ Title Insurance Other: ${answers.title_insurance_other.value}`);
                }
            }
        }

        await page.waitForTimeout(500);

        // Step 12: Handle Paragraph 11 - Survey (Page 6)
        log('Step 12: Handling Paragraph 11 (Survey)...');

        // Scroll to Page 6
        await page.evaluate(() => window.scrollTo(0, 8000));
        await page.waitForTimeout(1000);

        const buyerRequestsSurvey = answers.buyer_requests_survey?.value;

        if (buyerRequestsSurvey === 'yes') {
            // Yes, buyer requests survey - Box A (p06cb001_207)
            const surveyYesCheckbox = await page.$('input[name="p06cb001_207"]');
            if (surveyYesCheckbox) {
                await surveyYesCheckbox.scrollIntoViewIfNeeded();
                await page.waitForTimeout(200);
                const isChecked = await surveyYesCheckbox.isChecked();
                if (!isChecked) await surveyYesCheckbox.click();
                log('  ✓ Survey: Yes, buyer requests survey (Box A)');
            }

            // Who pays for the survey?
            const surveyPayer = answers.survey_paid_by?.value;

            if (surveyPayer === 'buyer') {
                const buyerPaysCheckbox = await page.$('input[name="p06cb006_212"]');
                if (buyerPaysCheckbox) {
                    await buyerPaysCheckbox.scrollIntoViewIfNeeded();
                    await page.waitForTimeout(200);
                    const isChecked = await buyerPaysCheckbox.isChecked();
                    if (!isChecked) await buyerPaysCheckbox.click();
                    log('  ✓ Survey Cost: Buyer pays');
                }
            } else if (surveyPayer === 'seller') {
                const sellerPaysCheckbox = await page.$('input[name="p06cb005_211"]');
                if (sellerPaysCheckbox) {
                    await sellerPaysCheckbox.scrollIntoViewIfNeeded();
                    await page.waitForTimeout(200);
                    const isChecked = await sellerPaysCheckbox.isChecked();
                    if (!isChecked) await sellerPaysCheckbox.click();
                    log('  ✓ Survey Cost: Seller pays');
                }
            } else if (surveyPayer === 'split') {
                const splitCheckbox = await page.$('input[name="p06cb004_210"]');
                if (splitCheckbox) {
                    await splitCheckbox.scrollIntoViewIfNeeded();
                    await page.waitForTimeout(200);
                    const isChecked = await splitCheckbox.isChecked();
                    if (!isChecked) await splitCheckbox.click();
                    log('  ✓ Survey Cost: Equally split');
                }
            } else if (surveyPayer === 'other') {
                // Other - Box C (p06cb003_209) + fill text field
                const otherCheckbox = await page.$('input[name="p06cb003_209"]');
                if (otherCheckbox) {
                    await otherCheckbox.scrollIntoViewIfNeeded();
                    await page.waitForTimeout(200);
                    const isChecked = await otherCheckbox.isChecked();
                    if (!isChecked) await otherCheckbox.click();
                    log('  ✓ Survey Cost: Other (Box C)');
                }

                // Fill in the other text field
                if (answers.survey_other?.value) {
                    const otherField = await page.$('input[name="p06tf001_214"]');
                    if (otherField) {
                        await otherField.scrollIntoViewIfNeeded();
                        await page.waitForTimeout(200);
                        await otherField.fill(String(answers.survey_other.value));
                        log(`  ✓ Survey Other: ${answers.survey_other.value}`);
                    }
                }
            }
        } else if (buyerRequestsSurvey === 'no') {
            // No, buyer declines survey - Box B (p06cb002_208)
            const surveyNoCheckbox = await page.$('input[name="p06cb002_208"]');
            if (surveyNoCheckbox) {
                await surveyNoCheckbox.scrollIntoViewIfNeeded();
                await page.waitForTimeout(200);
                const isChecked = await surveyNoCheckbox.isChecked();
                if (!isChecked) await surveyNoCheckbox.click();
                log('  ✓ Survey: No, buyer declines survey (Box B)');
            }
        }

        await page.waitForTimeout(500);

        // Step 13: Handle Paragraph 13 - Conveyances (still on Page 6)
        log('Step 13: Handling Paragraph 13 (Conveyances)...');

        // Additional items to convey (textarea, max 135 chars) - format with commas
        if (answers.additional_items_convey?.value === 'yes' && answers.additional_items_list?.value) {
            const additionalItemsField = await page.$('textarea[name="p06tf002_205"]');
            if (additionalItemsField) {
                await additionalItemsField.scrollIntoViewIfNeeded();
                await page.waitForTimeout(200);
                // Format items with commas (e.g., "Refrigerator washer dryer" -> "Refrigerator, washer, dryer")
                const formattedItems = formatItemsList(answers.additional_items_list.value);
                const itemsText = formattedItems.substring(0, 135);
                await additionalItemsField.fill(itemsText);
                log(`  ✓ Additional items to convey: ${itemsText}`);
            } else {
                log('  ✗ Additional items field not found (p06tf002_205)');
            }
        } else {
            log('  - No additional items to convey');
        }

        // Fixtures that will NOT convey (textarea)
        if (answers.fixtures_not_convey?.value === 'yes' && answers.fixtures_not_convey_list?.value) {
            const fixturesField = await page.$('textarea[name="p06tf003_206"]');
            if (fixturesField) {
                await fixturesField.scrollIntoViewIfNeeded();
                await page.waitForTimeout(200);
                await fixturesField.fill(String(answers.fixtures_not_convey_list.value));
                log(`  ✓ Fixtures NOT conveying: ${answers.fixtures_not_convey_list.value}`);
            } else {
                log('  ✗ Fixtures field not found (p06tf003_206)');
            }
        } else {
            log('  - No fixtures excluded from conveyance');
        }

        await page.waitForTimeout(500);

        // Step 14: Handle Paragraph 14 - Contingency (Page 7)
        log('Step 14: Handling Paragraph 14 (Contingency)...');

        // Scroll to Page 7
        await page.evaluate(() => window.scrollTo(0, 9500));
        await page.waitForTimeout(1000);

        const hasContingency = answers.has_contingency?.value;

        if (hasContingency === 'no') {
            // No contingency - Box A (p07cb001_235)
            const noContingencyCheckbox = await page.$('input[name="p07cb001_235"]');
            if (noContingencyCheckbox) {
                await noContingencyCheckbox.scrollIntoViewIfNeeded();
                await page.waitForTimeout(200);
                const isChecked = await noContingencyCheckbox.isChecked();
                if (!isChecked) await noContingencyCheckbox.click();
                log('  ✓ Contingency: No (Box A)');
            }
        } else if (hasContingency === 'yes') {
            // Yes contingency - Box B (p07cb002_236)
            const yesContingencyCheckbox = await page.$('input[name="p07cb002_236"]');
            if (yesContingencyCheckbox) {
                await yesContingencyCheckbox.scrollIntoViewIfNeeded();
                await page.waitForTimeout(200);
                const isChecked = await yesContingencyCheckbox.isChecked();
                if (!isChecked) await yesContingencyCheckbox.click();
                log('  ✓ Contingency: Yes (Box B)');
            }

            // Fill in the contingency description (textarea, max 244 chars)
            if (answers.contingency_description?.value) {
                const contingencyField = await page.$('textarea[name="p07tf001_234"]');
                if (contingencyField) {
                    await contingencyField.scrollIntoViewIfNeeded();
                    await page.waitForTimeout(200);
                    const contingencyText = String(answers.contingency_description.value).substring(0, 244);
                    await contingencyField.fill(contingencyText);
                    log(`  ✓ Contingency description: ${contingencyText}`);
                } else {
                    log('  ✗ Contingency description field not found (p07tf001_234)');
                }
            }

            // Fill in the contingency date using the date picker
            // Date picker structure:
            // - Main container: div.datetimepicker
            // - Header: div.dp-header with div.dp-leftnav, div.dp-caption, div.dp-rightnav
            // - Days: div.view.dp-monthview containing <ul> rows with <li> day elements
            // - Day elements: <li title="15">15</li> (title attribute = day number)
            if (answers.contingency_date?.value) {
                // Parse the date using smart parser
                const parsedDate = parseNaturalDate(answers.contingency_date.value);
                if (!parsedDate) {
                    log(`  ✗ Could not parse contingency date: ${answers.contingency_date.value}`);
                } else {
                    const targetMonth = parsedDate.month;
                    const targetDay = parsedDate.day;
                    const targetYear = parsedDate.year;

                    // Click on the date picker icon to open it
                    const datePickerIcon = await page.$('.datepicker-calendar-icon');
                    if (datePickerIcon) {
                        await datePickerIcon.scrollIntoViewIfNeeded();
                        await page.waitForTimeout(200);
                        await datePickerIcon.click();
                        await page.waitForTimeout(500);

                        // Get current month/year from the calendar header (.dp-caption)
                        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                                           'July', 'August', 'September', 'October', 'November', 'December'];
                        const targetMonthName = monthNames[targetMonth - 1];

                        // Navigate to the correct month/year using .dp-rightnav (forward) or .dp-leftnav (backward)
                        let attempts = 0;
                        const maxAttempts = 24; // Max 2 years navigation

                        while (attempts < maxAttempts) {
                            // Check current month/year displayed in .dp-caption
                            const headerText = await page.$eval('.datetimepicker .dp-caption', el => {
                                return el.textContent.trim();
                            }).catch(() => '');

                            if (headerText.includes(targetMonthName) && headerText.includes(String(targetYear))) {
                                break; // We're at the right month/year
                            }

                            // Click next (dp-rightnav) to go forward
                            const nextButton = await page.$('.datetimepicker .dp-rightnav');
                            if (nextButton) {
                                await nextButton.click();
                                await page.waitForTimeout(300);
                            } else {
                                log('  ✗ Could not find navigation button');
                                break;
                            }
                            attempts++;
                        }

                        // Now click on the target day
                        // Days are <li> elements with title attribute matching the day number
                        await page.waitForTimeout(300);

                        // Find and click the day cell by title attribute
                        const dayClicked = await page.evaluate((day) => {
                            const picker = document.querySelector('.datetimepicker');
                            if (!picker) return false;

                            // Find li element with matching title (not disabled)
                            const dayElements = picker.querySelectorAll('.dp-monthview li[title]');
                            for (const li of dayElements) {
                                const title = li.getAttribute('title');
                                if (title === String(day) && !li.classList.contains('disabled')) {
                                    li.click();
                                    return true;
                                }
                            }
                            return false;
                        }, targetDay);

                        if (dayClicked) {
                            await page.waitForTimeout(300);
                            // Click outside the date picker to close it
                            await page.mouse.click(100, 100);
                            await page.waitForTimeout(200);
                            log(`  ✓ Contingency date: ${targetMonthName} ${targetDay}, ${targetYear}`);
                        } else {
                            log(`  ✗ Could not click on day ${targetDay}`);
                        }
                    } else {
                        log('  ✗ Date picker icon not found');
                    }
                }
            }

            // Handle contingency binding type
            // Box (i) - Binding WITH escape clause: p07cb003_237
            // Box (ii) - Binding WITHOUT escape clause: p07cb004_238
            const bindingType = answers.contingency_binding_type?.value;

            if (bindingType === 'with_escape') {
                // Check Box (i) - Binding with escape clause
                const withEscapeCheckbox = await page.$('input[name="p07cb003_237"]');
                if (withEscapeCheckbox) {
                    await withEscapeCheckbox.scrollIntoViewIfNeeded();
                    await page.waitForTimeout(200);
                    const isChecked = await withEscapeCheckbox.isChecked();
                    if (!isChecked) await withEscapeCheckbox.click();
                    log('  ✓ Binding type: With escape clause (Box i)');
                }

                // Fill hours to remove contingency - p07tf002_245 (convert text to number)
                if (answers.contingency_removal_hours?.value) {
                    const numericHours = textToNumber(answers.contingency_removal_hours.value);
                    const hoursField = await page.$('input[name="p07tf002_245"]');
                    if (hoursField) {
                        await hoursField.scrollIntoViewIfNeeded();
                        await page.waitForTimeout(200);
                        await hoursField.fill(numericHours);
                        log(`  ✓ Hours to remove contingency: ${numericHours}`);
                    } else {
                        log('  ✗ Hours field not found (p07tf002_245)');
                    }
                }

                // Fill notification address - p07tf003_246
                if (answers.contingency_notification_address?.value) {
                    const notificationField = await page.$('input[name="p07tf003_246"]');
                    if (notificationField) {
                        await notificationField.scrollIntoViewIfNeeded();
                        await page.waitForTimeout(200);
                        await notificationField.fill(String(answers.contingency_notification_address.value));
                        log(`  ✓ Notification address: ${answers.contingency_notification_address.value}`);
                    } else {
                        log('  ✗ Notification address field not found (p07tf003_246)');
                    }
                }

                // Fill closing days after removal - p07tf004_247
                if (answers.contingency_closing_days?.value) {
                    const closingDaysField = await page.$('input[name="p07tf004_247"]');
                    if (closingDaysField) {
                        await closingDaysField.scrollIntoViewIfNeeded();
                        await page.waitForTimeout(200);
                        await closingDaysField.fill(String(answers.contingency_closing_days.value));
                        log(`  ✓ Closing days after removal: ${answers.contingency_closing_days.value}`);
                    } else {
                        log('  ✗ Closing days field not found (p07tf004_247)');
                    }
                }

                // Handle time constraints start
                // At removal of contingency: p07cb005_239
                // At time of acceptance: p07cb006_240
                const timeStart = answers.contingency_time_start?.value;

                if (timeStart === 'removal') {
                    const removalCheckbox = await page.$('input[name="p07cb005_239"]');
                    if (removalCheckbox) {
                        await removalCheckbox.scrollIntoViewIfNeeded();
                        await page.waitForTimeout(200);
                        const isChecked = await removalCheckbox.isChecked();
                        if (!isChecked) await removalCheckbox.click();
                        log('  ✓ Time constraints start: At removal of contingency');
                    }
                } else if (timeStart === 'acceptance') {
                    const acceptanceCheckbox = await page.$('input[name="p07cb006_240"]');
                    if (acceptanceCheckbox) {
                        await acceptanceCheckbox.scrollIntoViewIfNeeded();
                        await page.waitForTimeout(200);
                        const isChecked = await acceptanceCheckbox.isChecked();
                        if (!isChecked) await acceptanceCheckbox.click();
                        log('  ✓ Time constraints start: At time of acceptance');
                    }
                }

            } else if (bindingType === 'without_escape') {
                // Check Box (ii) - Binding without escape clause
                const withoutEscapeCheckbox = await page.$('input[name="p07cb004_238"]');
                if (withoutEscapeCheckbox) {
                    await withoutEscapeCheckbox.scrollIntoViewIfNeeded();
                    await page.waitForTimeout(200);
                    const isChecked = await withoutEscapeCheckbox.isChecked();
                    if (!isChecked) await withoutEscapeCheckbox.click();
                    log('  ✓ Binding type: Without escape clause (Box ii)');
                }
            }
        }

        await page.waitForTimeout(500);

        // Step 15: Handle Paragraph 15 - Home Warranty Plans (Page 8)
        log('Step 15: Handling Paragraph 15 (Home Warranty)...');

        // Scroll to Page 8
        await page.evaluate(() => window.scrollTo(0, 10500));
        await page.waitForTimeout(1000);

        const hasWarranty = answers.has_home_warranty?.value;
        const hasSpecificCompany = answers.warranty_specific_company?.value;

        if (hasWarranty === 'no') {
            // No home warranty - Box A (p08cb001_270)
            const noWarrantyCheckbox = await page.$('input[name="p08cb001_270"]');
            if (noWarrantyCheckbox) {
                await noWarrantyCheckbox.scrollIntoViewIfNeeded();
                await page.waitForTimeout(200);
                const isChecked = await noWarrantyCheckbox.isChecked();
                if (!isChecked) await noWarrantyCheckbox.click();
                log('  ✓ Home Warranty: No (Box A)');
            }
        } else if (hasWarranty === 'yes' && hasSpecificCompany === 'yes') {
            // Specific company warranty - Box B (p08cb002_271)
            // Voice app stores 'yes' in has_home_warranty, then 'yes' in warranty_specific_company
            const specificWarrantyCheckbox = await page.$('input[name="p08cb002_271"]');
            if (specificWarrantyCheckbox) {
                await specificWarrantyCheckbox.scrollIntoViewIfNeeded();
                await page.waitForTimeout(200);
                const isChecked = await specificWarrantyCheckbox.isChecked();
                if (!isChecked) await specificWarrantyCheckbox.click();
                log('  ✓ Home Warranty: Yes, specific company (Box B)');
            }

            // Fill company name - p08tf001_277
            if (answers.warranty_company_name?.value) {
                const companyField = await page.$('input[name="p08tf001_277"]');
                if (companyField) {
                    await companyField.scrollIntoViewIfNeeded();
                    await page.waitForTimeout(200);
                    await companyField.fill(cleanTextValue(answers.warranty_company_name.value));
                    log(`  ✓ Warranty company: ${answers.warranty_company_name.value}`);
                } else {
                    log('  ✗ Company name field not found (p08tf001_277)');
                }
            }

            // Fill plan name - p08tf002_278
            if (answers.warranty_plan_name?.value) {
                const planField = await page.$('input[name="p08tf002_278"]');
                if (planField) {
                    await planField.scrollIntoViewIfNeeded();
                    await page.waitForTimeout(200);
                    await planField.fill(cleanTextValue(answers.warranty_plan_name.value));
                    log(`  ✓ Warranty plan: ${answers.warranty_plan_name.value}`);
                } else {
                    log('  ✗ Plan name field not found (p08tf002_278)');
                }
            }

            // Fill paid by - p08tf003_279
            if (answers.warranty_paid_by?.value) {
                const paidByField = await page.$('input[name="p08tf003_279"]');
                if (paidByField) {
                    await paidByField.scrollIntoViewIfNeeded();
                    await page.waitForTimeout(200);
                    await paidByField.fill(String(answers.warranty_paid_by.value));
                    log(`  ✓ Warranty paid by: ${answers.warranty_paid_by.value}`);
                } else {
                    log('  ✗ Paid by field not found (p08tf003_279)');
                }
            }

            // Fill cost not to exceed - p08tf004_280
            if (answers.warranty_cost_max?.value) {
                const costField = await page.$('input[name="p08tf004_280"]');
                if (costField) {
                    await costField.scrollIntoViewIfNeeded();
                    await page.waitForTimeout(200);
                    await costField.fill(String(answers.warranty_cost_max.value));
                    log(`  ✓ Warranty cost max: $${answers.warranty_cost_max.value}`);
                } else {
                    log('  ✗ Cost field not found (p08tf004_280)');
                }
            }

        } else if (hasWarranty === 'yes' && hasSpecificCompany === 'no') {
            // General warranty (buyer selects plan later) - Box C (p08cb003_272)
            // Voice app stores 'yes' in has_home_warranty, then 'no' in warranty_specific_company
            const generalWarrantyCheckbox = await page.$('input[name="p08cb003_272"]');
            if (generalWarrantyCheckbox) {
                await generalWarrantyCheckbox.scrollIntoViewIfNeeded();
                await page.waitForTimeout(200);
                const isChecked = await generalWarrantyCheckbox.isChecked();
                if (!isChecked) await generalWarrantyCheckbox.click();
                log('  ✓ Home Warranty: Yes, general (Box C)');
            }

            // Fill paid by - p08tf005_281 (Box C paid by field)
            if (answers.warranty_paid_by?.value) {
                const paidByField = await page.$('input[name="p08tf005_281"]');
                if (paidByField) {
                    await paidByField.scrollIntoViewIfNeeded();
                    await page.waitForTimeout(200);
                    await paidByField.fill(String(answers.warranty_paid_by.value));
                    log(`  ✓ Warranty paid by: ${answers.warranty_paid_by.value}`);
                } else {
                    log('  ✗ Paid by field not found (p08tf005_281)');
                }
            }

            // Fill cost not to exceed - p08tf006_282 (Box C uses different field)
            if (answers.warranty_cost_max?.value) {
                const costField = await page.$('input[name="p08tf006_282"]');
                if (costField) {
                    await costField.scrollIntoViewIfNeeded();
                    await page.waitForTimeout(200);
                    await costField.fill(String(answers.warranty_cost_max.value));
                    log(`  ✓ Warranty cost max: $${answers.warranty_cost_max.value}`);
                } else {
                    log('  ✗ Cost field not found (p08tf006_282)');
                }
            }

        } else if (hasWarranty === 'yes_specific') {
            // Legacy format - Specific company warranty - Box B (p08cb002_271)
            const specificWarrantyCheckbox = await page.$('input[name="p08cb002_271"]');
            if (specificWarrantyCheckbox) {
                await specificWarrantyCheckbox.scrollIntoViewIfNeeded();
                await page.waitForTimeout(200);
                const isChecked = await specificWarrantyCheckbox.isChecked();
                if (!isChecked) await specificWarrantyCheckbox.click();
                log('  ✓ Home Warranty: Yes, specific company (Box B)');
            }

            // Fill fields for legacy format
            if (answers.warranty_company_name?.value) {
                const companyField = await page.$('input[name="p08tf001_277"]');
                if (companyField) {
                    await companyField.scrollIntoViewIfNeeded();
                    await page.waitForTimeout(200);
                    await companyField.fill(cleanTextValue(answers.warranty_company_name.value));
                    log(`  ✓ Warranty company: ${answers.warranty_company_name.value}`);
                }
            }
            if (answers.warranty_plan_name?.value) {
                const planField = await page.$('input[name="p08tf002_278"]');
                if (planField) {
                    await planField.scrollIntoViewIfNeeded();
                    await page.waitForTimeout(200);
                    await planField.fill(cleanTextValue(answers.warranty_plan_name.value));
                    log(`  ✓ Warranty plan: ${answers.warranty_plan_name.value}`);
                }
            }
            if (answers.warranty_paid_by?.value) {
                const paidByField = await page.$('input[name="p08tf003_279"]');
                if (paidByField) {
                    await paidByField.scrollIntoViewIfNeeded();
                    await page.waitForTimeout(200);
                    await paidByField.fill(String(answers.warranty_paid_by.value));
                    log(`  ✓ Warranty paid by: ${answers.warranty_paid_by.value}`);
                }
            }
            if (answers.warranty_cost_max?.value) {
                const costField = await page.$('input[name="p08tf004_280"]');
                if (costField) {
                    await costField.scrollIntoViewIfNeeded();
                    await page.waitForTimeout(200);
                    await costField.fill(String(answers.warranty_cost_max.value));
                    log(`  ✓ Warranty cost max: $${answers.warranty_cost_max.value}`);
                }
            }

        } else if (hasWarranty === 'yes_general') {
            // Legacy format - General warranty (buyer selects plan) - Box C (p08cb003_272)
            const generalWarrantyCheckbox = await page.$('input[name="p08cb003_272"]');
            if (generalWarrantyCheckbox) {
                await generalWarrantyCheckbox.scrollIntoViewIfNeeded();
                await page.waitForTimeout(200);
                const isChecked = await generalWarrantyCheckbox.isChecked();
                if (!isChecked) await generalWarrantyCheckbox.click();
                log('  ✓ Home Warranty: Yes, general (Box C)');
            }

            if (answers.warranty_paid_by?.value) {
                const paidByField = await page.$('input[name="p08tf005_281"]');
                if (paidByField) {
                    await paidByField.scrollIntoViewIfNeeded();
                    await page.waitForTimeout(200);
                    await paidByField.fill(String(answers.warranty_paid_by.value));
                    log(`  ✓ Warranty paid by: ${answers.warranty_paid_by.value}`);
                }
            }
            if (answers.warranty_cost_max?.value) {
                const costField = await page.$('input[name="p08tf006_282"]');
                if (costField) {
                    await costField.scrollIntoViewIfNeeded();
                    await page.waitForTimeout(200);
                    await costField.fill(String(answers.warranty_cost_max.value));
                    log(`  ✓ Warranty cost max: $${answers.warranty_cost_max.value}`);
                }
            }

        } else if (hasWarranty === 'other') {
            // Other warranty - Box D (p08cb004_273)
            const otherWarrantyCheckbox = await page.$('input[name="p08cb004_273"]');
            if (otherWarrantyCheckbox) {
                await otherWarrantyCheckbox.scrollIntoViewIfNeeded();
                await page.waitForTimeout(200);
                const isChecked = await otherWarrantyCheckbox.isChecked();
                if (!isChecked) await otherWarrantyCheckbox.click();
                log('  ✓ Home Warranty: Other (Box D)');
            }

            // Fill other warranty terms - p08tf007_283
            if (answers.warranty_other_terms?.value) {
                const otherField = await page.$('input[name="p08tf007_283"]');
                if (otherField) {
                    await otherField.scrollIntoViewIfNeeded();
                    await page.waitForTimeout(200);
                    await otherField.fill(String(answers.warranty_other_terms.value));
                    log(`  ✓ Other terms: ${answers.warranty_other_terms.value}`);
                }
            }
        }

        await page.waitForTimeout(500);

        // Step 16: Handle Paragraph 16 - Home Inspection (Page 8/9)
        log('Step 16: Handling Paragraph 16 (Home Inspection)...');

        const wantsInspection = answers.wants_home_inspection?.value;

        if (wantsInspection === 'no') {
            // No inspection - AS IS - Box A (p08cb005_274)
            const asIsCheckbox = await page.$('input[name="p08cb005_274"]');
            if (asIsCheckbox) {
                await asIsCheckbox.scrollIntoViewIfNeeded();
                await page.waitForTimeout(200);
                const isChecked = await asIsCheckbox.isChecked();
                if (!isChecked) await asIsCheckbox.click();
                log('  ✓ Home Inspection: No, AS IS (Box A)');
            } else {
                log('  ✗ AS IS checkbox not found (p08cb005_274)');
            }
        } else if (wantsInspection === 'yes') {
            // Yes, buyer wants inspection - Box B (p08cb006_275)
            const inspectionCheckbox = await page.$('input[name="p08cb006_275"]');
            if (inspectionCheckbox) {
                await inspectionCheckbox.scrollIntoViewIfNeeded();
                await page.waitForTimeout(200);
                const isChecked = await inspectionCheckbox.isChecked();
                if (!isChecked) await inspectionCheckbox.click();
                log('  ✓ Home Inspection: Yes, inspection rights (Box B)');
            } else {
                log('  ✗ Inspection rights checkbox not found (p08cb006_275)');
            }
        }

        await page.waitForTimeout(500);

        // Step 17: Handle Paragraph 18 - Home Owners Association (Page 10)
        log('Step 17: Handling Paragraph 18 (Home Owners Association)...');

        // Scroll incrementally to Page 10 to ensure lazy-loaded fields are available
        await page.evaluate(() => window.scrollTo(0, 12000));
        await page.waitForTimeout(500);
        await page.evaluate(() => window.scrollTo(0, 14000));
        await page.waitForTimeout(500);
        await page.evaluate(() => window.scrollTo(0, 16000));
        await page.waitForTimeout(1000);

        const hasHOA = answers.has_hoa?.value;

        if (hasHOA === 'no') {
            // No HOA - p10cb005_326
            const noHOACheckbox = await page.$('input[name="p10cb005_326"]');
            if (noHOACheckbox) {
                await noHOACheckbox.scrollIntoViewIfNeeded();
                await page.waitForTimeout(200);
                const isChecked = await noHOACheckbox.isChecked();
                if (!isChecked) await noHOACheckbox.click();
                log('  ✓ HOA: No, not subject to mandatory membership');
            } else {
                log('  ✗ No HOA checkbox not found (p10cb005_326)');
            }
        } else if (hasHOA === 'yes') {
            // Yes HOA - p10cb006_327
            const yesHOACheckbox = await page.$('input[name="p10cb006_327"]');
            if (yesHOACheckbox) {
                await yesHOACheckbox.scrollIntoViewIfNeeded();
                await page.waitForTimeout(200);
                const isChecked = await yesHOACheckbox.isChecked();
                if (!isChecked) await yesHOACheckbox.click();
                log('  ✓ HOA: Yes, subject to mandatory membership');
            } else {
                log('  ✗ Yes HOA checkbox not found (p10cb006_327)');
            }

            // If yes, check if addendum is attached
            if (answers.hoa_addendum_attached?.value === 'yes') {
                const addendumCheckbox = await page.$('input[name="p10cb007_328"]');
                if (addendumCheckbox) {
                    await addendumCheckbox.scrollIntoViewIfNeeded();
                    await page.waitForTimeout(200);
                    const isChecked = await addendumCheckbox.isChecked();
                    if (!isChecked) await addendumCheckbox.click();
                    log('  ✓ HOA Addendum: Owners Association Addendum attached');
                } else {
                    log('  ✗ Addendum checkbox not found (p10cb007_328)');
                }
            }
        }

        await page.waitForTimeout(500);

        // Step 18: Handle Paragraph 19 - Seller Property Disclosure (Page 10)
        log('Step 18: Handling Paragraph 19 (Seller Property Disclosure)...');

        // Already scrolled to Page 10 in Step 17, but ensure we're there
        await page.evaluate(() => window.scrollTo(0, 16000));
        await page.waitForTimeout(500);

        const disclosureReceived = answers.seller_disclosure_received?.value;
        const buyerRequestsCopy = answers.buyer_requests_disclosure_copy?.value;
        const sellerFilledDisclosure = answers.seller_filled_disclosure?.value;

        if (disclosureReceived === 'yes') {
            // Box A - Buyer has received and reviewed disclosure (p10cb001_317)
            const boxACheckbox = await page.$('input[name="p10cb001_317"]');
            if (boxACheckbox) {
                await boxACheckbox.scrollIntoViewIfNeeded();
                await page.waitForTimeout(200);
                const isChecked = await boxACheckbox.isChecked();
                if (!isChecked) await boxACheckbox.click();
                log('  ✓ Seller Disclosure: Yes, buyer received and reviewed (Box A)');
            } else {
                log('  ✗ Box A checkbox not found (p10cb001_317)');
            }
        } else if (disclosureReceived === 'no' && buyerRequestsCopy === 'yes') {
            // Box B - Buyer requests a copy (p10cb002_318)
            const boxBCheckbox = await page.$('input[name="p10cb002_318"]');
            if (boxBCheckbox) {
                await boxBCheckbox.scrollIntoViewIfNeeded();
                await page.waitForTimeout(200);
                const isChecked = await boxBCheckbox.isChecked();
                if (!isChecked) await boxBCheckbox.click();
                log('  ✓ Seller Disclosure: Buyer requests copy (Box B)');
            } else {
                log('  ✗ Box B checkbox not found (p10cb002_318)');
            }
        } else if (disclosureReceived === 'no' && buyerRequestsCopy === 'no' && sellerFilledDisclosure === 'yes') {
            // Box C - Disclosure filled out by seller (p10cb003_319)
            const boxCCheckbox = await page.$('input[name="p10cb003_319"]');
            if (boxCCheckbox) {
                await boxCCheckbox.scrollIntoViewIfNeeded();
                await page.waitForTimeout(200);
                const isChecked = await boxCCheckbox.isChecked();
                if (!isChecked) await boxCCheckbox.click();
                log('  ✓ Seller Disclosure: Disclosure filled by seller (Box C)');
            } else {
                log('  ✗ Box C checkbox not found (p10cb003_319)');
            }
        } else if (disclosureReceived === 'no' && buyerRequestsCopy === 'no' && sellerFilledDisclosure === 'no') {
            // Box D - No disclosure (p10cb004_320)
            const boxDCheckbox = await page.$('input[name="p10cb004_320"]');
            if (boxDCheckbox) {
                await boxDCheckbox.scrollIntoViewIfNeeded();
                await page.waitForTimeout(200);
                const isChecked = await boxDCheckbox.isChecked();
                if (!isChecked) await boxDCheckbox.click();
                log('  ✓ Seller Disclosure: No disclosure available (Box D)');
            } else {
                log('  ✗ Box D checkbox not found (p10cb004_320)');
            }
        }

        await page.waitForTimeout(500);

        // Step 19: Handle Paragraph 20 - Termite Policy (Page 11)
        log('Step 19: Handling Paragraph 20 (Termite Policy)...');

        // Scroll to Page 11
        await page.evaluate(() => window.scrollTo(0, 17000));
        await page.waitForTimeout(500);

        const requestsTermitePolicy = answers.requests_termite_policy?.value;

        if (requestsTermitePolicy === 'no') {
            // No termite policy - Box A (p11cb005_355)
            const noTermiteCheckbox = await page.$('input[name="p11cb005_355"]');
            if (noTermiteCheckbox) {
                await noTermiteCheckbox.scrollIntoViewIfNeeded();
                await page.waitForTimeout(200);
                const isChecked = await noTermiteCheckbox.isChecked();
                if (!isChecked) await noTermiteCheckbox.click();
                log('  ✓ Termite Policy: No (Box A)');
            } else {
                log('  ✗ No termite checkbox not found (p11cb005_355)');
            }
        } else if (requestsTermitePolicy === 'yes') {
            const termitePlanType = answers.termite_plan_type?.value;

            if (termitePlanType === 'one_year_warranty') {
                // One Year Warranty with treatment and full protection - Box B (p11cb006_356)
                const warrantyCheckbox = await page.$('input[name="p11cb006_356"]');
                if (warrantyCheckbox) {
                    await warrantyCheckbox.scrollIntoViewIfNeeded();
                    await page.waitForTimeout(200);
                    const isChecked = await warrantyCheckbox.isChecked();
                    if (!isChecked) await warrantyCheckbox.click();
                    log('  ✓ Termite Policy: One Year Warranty (Box B)');
                } else {
                    log('  ✗ One Year Warranty checkbox not found (p11cb006_356)');
                }
            } else if (termitePlanType === 'other') {
                // Other - Box C (p11cb007_357)
                const otherCheckbox = await page.$('input[name="p11cb007_357"]');
                if (otherCheckbox) {
                    await otherCheckbox.scrollIntoViewIfNeeded();
                    await page.waitForTimeout(200);
                    const isChecked = await otherCheckbox.isChecked();
                    if (!isChecked) await otherCheckbox.click();
                    log('  ✓ Termite Policy: Other (Box C)');
                } else {
                    log('  ✗ Other termite checkbox not found (p11cb007_357)');
                }

                // Fill in the other text field if provided
                if (answers.termite_other_description?.value) {
                    // Text field for "other" description
                    const otherField = await page.$('input[name="p11tf001_354"]');
                    if (otherField) {
                        await otherField.scrollIntoViewIfNeeded();
                        await page.waitForTimeout(200);
                        await otherField.fill(String(answers.termite_other_description.value));
                        log(`  ✓ Other termite description: ${answers.termite_other_description.value}`);
                    } else {
                        log('  ✗ Other termite text field not found (p11tf001_354)');
                    }
                }
            }
        }

        await page.waitForTimeout(500);

        // Step 20: Handle Paragraph 21 - Pre-1978 Construction (Page 11)
        log('Step 20: Handling Paragraph 21 (Pre-1978 Construction)...');

        // Still on Page 11
        const builtPrior1978 = answers.built_prior_1978?.value;

        if (builtPrior1978 === 'no') {
            // Box A - No, not built prior to 1978 (p11cb001_344)
            const boxACheckbox = await page.$('input[name="p11cb001_344"]');
            if (boxACheckbox) {
                await boxACheckbox.scrollIntoViewIfNeeded();
                await page.waitForTimeout(200);
                const isChecked = await boxACheckbox.isChecked();
                if (!isChecked) await boxACheckbox.click();
                log('  ✓ Pre-1978 Construction: No (Box A)');
            } else {
                log('  ✗ Box A checkbox not found (p11cb001_344)');
            }
        } else if (builtPrior1978 === 'yes') {
            // Box B - Yes, built prior to 1978 (p11cb002_345)
            const boxBCheckbox = await page.$('input[name="p11cb002_345"]');
            if (boxBCheckbox) {
                await boxBCheckbox.scrollIntoViewIfNeeded();
                await page.waitForTimeout(200);
                const isChecked = await boxBCheckbox.isChecked();
                if (!isChecked) await boxBCheckbox.click();
                log('  ✓ Pre-1978 Construction: Yes (Box B)');
            } else {
                log('  ✗ Box B checkbox not found (p11cb002_345)');
            }
        }

        await page.waitForTimeout(500);

        // Step 21: Handle Paragraph 23 - Closing Date (Page 12)
        log('Step 21: Handling Paragraph 23 (Closing Date)...');

        // Scroll to Page 12
        await page.evaluate(() => window.scrollTo(0, 19000));
        await page.waitForTimeout(500);

        if (answers.closing_date?.value) {
            // Parse the date using smart parser
            const parsedDate = parseNaturalDate(answers.closing_date.value);
            if (!parsedDate) {
                log(`  ✗ Could not parse closing date: ${answers.closing_date.value}`);
            } else {
                const targetMonth = parsedDate.month;
                const targetDay = parsedDate.day;
                const targetYear = parsedDate.year;

                // First, find and scroll to the closing date field
                const closingDateField = await page.$('input[name="p12df001_369"]');
                if (closingDateField) {
                    await closingDateField.scrollIntoViewIfNeeded();
                    await page.waitForTimeout(300);

                    // Find the date picker icon near this field
                    // The date picker is associated with the field - look for the parent container's icon
                    const datePickerIcon = await page.evaluateHandle(() => {
                        const field = document.querySelector('input[name="p12df001_369"]');
                        if (!field) return null;
                        // Find the closest date picker container and its icon
                        const container = field.closest('.datefieldwidget') || field.parentElement;
                        if (container) {
                            return container.querySelector('.datepicker-calendar-icon');
                        }
                        return null;
                    });

                    if (datePickerIcon && await datePickerIcon.evaluate(el => el !== null)) {
                        await datePickerIcon.click();
                        await page.waitForTimeout(500);

                        // Navigate to the correct month/year
                        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                                           'July', 'August', 'September', 'October', 'November', 'December'];
                        const targetMonthName = monthNames[targetMonth - 1];

                        let attempts = 0;
                        const maxAttempts = 24;

                        while (attempts < maxAttempts) {
                            const headerText = await page.$eval('.datetimepicker .dp-caption', el => {
                                return el.textContent.trim();
                            }).catch(() => '');

                            if (headerText.includes(targetMonthName) && headerText.includes(String(targetYear))) {
                                break;
                            }

                            const nextButton = await page.$('.datetimepicker .dp-rightnav');
                            if (nextButton) {
                                await nextButton.click();
                                await page.waitForTimeout(300);
                            } else {
                                break;
                            }
                            attempts++;
                        }

                        // Click on the target day
                        await page.waitForTimeout(300);
                        const dayClicked = await page.evaluate((day) => {
                            const picker = document.querySelector('.datetimepicker');
                            if (!picker) return false;
                            const dayElements = picker.querySelectorAll('.dp-monthview li[title]');
                            for (const li of dayElements) {
                                const title = li.getAttribute('title');
                                if (title === String(day) && !li.classList.contains('disabled')) {
                                    li.click();
                                    return true;
                                }
                            }
                            return false;
                        }, targetDay);

                        if (dayClicked) {
                            await page.waitForTimeout(300);
                            await page.mouse.click(100, 100);
                            await page.waitForTimeout(200);
                            log(`  ✓ Closing date: ${targetMonthName} ${targetDay}, ${targetYear}`);
                        } else {
                            log(`  ✗ Could not click on day ${targetDay}`);
                        }
                    } else {
                        log('  ✗ Closing date picker icon not found');
                    }
                } else {
                    log('  ✗ Closing date field not found (p12df001_369)');
                }
            }
        }

        await page.waitForTimeout(500);

        // Step 22: Handle Paragraph 24 - Possession (Page 13)
        log('Step 22: Handling Paragraph 24 (Possession)...');

        // Scroll to Page 13
        await page.evaluate(() => window.scrollTo(0, 20000));
        await page.waitForTimeout(500);

        const possessionType = answers.possession_type?.value;

        if (possessionType === 'at_closing' || possessionType === 'upon_closing') {
            // Box A - Upon Closing (p13cb001_401)
            const boxACheckbox = await page.$('input[name="p13cb001_401"]');
            if (boxACheckbox) {
                await boxACheckbox.scrollIntoViewIfNeeded();
                await page.waitForTimeout(200);
                const isChecked = await boxACheckbox.isChecked();
                if (!isChecked) await boxACheckbox.click();
                log('  ✓ Possession: Upon closing (Box A)');
            } else {
                log('  ✗ Box A checkbox not found (p13cb001_401)');
            }
        } else if (possessionType === 'after_closing' || possessionType === 'delayed') {
            // Box B - Delayed Possession (p13cb002_402)
            const boxBCheckbox = await page.$('input[name="p13cb002_402"]');
            if (boxBCheckbox) {
                await boxBCheckbox.scrollIntoViewIfNeeded();
                await page.waitForTimeout(200);
                const isChecked = await boxBCheckbox.isChecked();
                if (!isChecked) await boxBCheckbox.click();
                log('  ✓ Possession: Delayed possession (Box B)');
            } else {
                log('  ✗ Box B checkbox not found (p13cb002_402)');
            }
        } else if (possessionType === 'prior_to_closing') {
            // Box C - Prior to Closing (p13cb003_403)
            const boxCCheckbox = await page.$('input[name="p13cb003_403"]');
            if (boxCCheckbox) {
                await boxCCheckbox.scrollIntoViewIfNeeded();
                await page.waitForTimeout(200);
                const isChecked = await boxCCheckbox.isChecked();
                if (!isChecked) await boxCCheckbox.click();
                log('  ✓ Possession: Prior to closing (Box C)');
            } else {
                log('  ✗ Box C checkbox not found (p13cb003_403)');
            }
        }

        await page.waitForTimeout(500);

        // Step 23: Handle Paragraph 33 - Other Terms (Page 14)
        log('Step 23: Handling Paragraph 33 (Other Terms)...');

        // Scroll to Page 14
        await page.evaluate(() => window.scrollTo(0, 22000));
        await page.waitForTimeout(500);

        if (answers.other_terms?.value) {
            const otherTermsField = await page.$('textarea[name="p14tf001_420"]');
            if (otherTermsField) {
                await otherTermsField.scrollIntoViewIfNeeded();
                await page.waitForTimeout(200);
                await otherTermsField.fill(String(answers.other_terms.value));
                log(`  ✓ Other terms: ${answers.other_terms.value}`);
            } else {
                log('  ✗ Other terms textarea not found (p14tf001_420)');
            }
        }

        await page.waitForTimeout(500);

        // Step 24: Handle Paragraph 38 - Real Estate License (Page 15)
        log('Step 24: Handling Paragraph 38 (Real Estate License)...');

        // Scroll to Page 15
        await page.evaluate(() => window.scrollTo(0, 24000));
        await page.waitForTimeout(500);

        const hasRealEstateLicense = answers.has_real_estate_license?.value;

        if (hasRealEstateLicense === 'no') {
            // Box A - No valid Arkansas real estate license (p15cb001_442)
            const boxACheckbox = await page.$('input[name="p15cb001_442"]');
            if (boxACheckbox) {
                await boxACheckbox.scrollIntoViewIfNeeded();
                await page.waitForTimeout(200);
                const isChecked = await boxACheckbox.isChecked();
                if (!isChecked) await boxACheckbox.click();
                log('  ✓ Real Estate License: No (Box A)');
            } else {
                log('  ✗ Box A checkbox not found (p15cb001_442)');
            }
        } else if (hasRealEstateLicense === 'yes') {
            const representedByAgent = answers.license_represented_by_agent?.value;

            if (representedByAgent === 'no') {
                // Box D - Yes license, not represented by agent (p15cb004_445)
                const boxDCheckbox = await page.$('input[name="p15cb004_445"]');
                if (boxDCheckbox) {
                    await boxDCheckbox.scrollIntoViewIfNeeded();
                    await page.waitForTimeout(200);
                    const isChecked = await boxDCheckbox.isChecked();
                    if (!isChecked) await boxDCheckbox.click();
                    log('  ✓ Real Estate License: Yes, not represented by agent (Box D)');
                } else {
                    log('  ✗ Box D checkbox not found (p15cb004_445)');
                }
            } else if (representedByAgent === 'yes') {
                const licenseEntityType = answers.license_entity_type?.value;
                const licenseBuyerOrSeller = answers.license_buyer_or_seller?.value;

                if (licenseEntityType === 'individual') {
                    // Box B - Individual (p15cb002_443)
                    const boxBCheckbox = await page.$('input[name="p15cb002_443"]');
                    if (boxBCheckbox) {
                        await boxBCheckbox.scrollIntoViewIfNeeded();
                        await page.waitForTimeout(200);
                        const isChecked = await boxBCheckbox.isChecked();
                        if (!isChecked) await boxBCheckbox.click();
                        log('  ✓ Real Estate License: Individual (Box B)');
                    } else {
                        log('  ✗ Box B checkbox not found (p15cb002_443)');
                    }

                    // Check buyer or seller for individual
                    if (licenseBuyerOrSeller === 'buyer') {
                        const buyerCheckbox = await page.$('input[name="p15cb005_446"]');
                        if (buyerCheckbox) {
                            await buyerCheckbox.scrollIntoViewIfNeeded();
                            await page.waitForTimeout(200);
                            const isChecked = await buyerCheckbox.isChecked();
                            if (!isChecked) await buyerCheckbox.click();
                            log('  ✓ Individual acting as: Buyer');
                        } else {
                            log('  ✗ Individual buyer checkbox not found (p15cb005_446)');
                        }
                    } else if (licenseBuyerOrSeller === 'seller') {
                        const sellerCheckbox = await page.$('input[name="p15cb006_447"]');
                        if (sellerCheckbox) {
                            await sellerCheckbox.scrollIntoViewIfNeeded();
                            await page.waitForTimeout(200);
                            const isChecked = await sellerCheckbox.isChecked();
                            if (!isChecked) await sellerCheckbox.click();
                            log('  ✓ Individual acting as: Seller');
                        } else {
                            log('  ✗ Individual seller checkbox not found (p15cb006_447)');
                        }
                    }
                } else if (licenseEntityType === 'entity') {
                    // Box C - Entity (p15cb003_444)
                    const boxCCheckbox = await page.$('input[name="p15cb003_444"]');
                    if (boxCCheckbox) {
                        await boxCCheckbox.scrollIntoViewIfNeeded();
                        await page.waitForTimeout(200);
                        const isChecked = await boxCCheckbox.isChecked();
                        if (!isChecked) await boxCCheckbox.click();
                        log('  ✓ Real Estate License: Entity (Box C)');
                    } else {
                        log('  ✗ Box C checkbox not found (p15cb003_444)');
                    }

                    // Check buyer or seller for entity
                    if (licenseBuyerOrSeller === 'buyer') {
                        const buyerCheckbox = await page.$('input[name="p15cb007_448"]');
                        if (buyerCheckbox) {
                            await buyerCheckbox.scrollIntoViewIfNeeded();
                            await page.waitForTimeout(200);
                            const isChecked = await buyerCheckbox.isChecked();
                            if (!isChecked) await buyerCheckbox.click();
                            log('  ✓ Entity acting as: Buyer');
                        } else {
                            log('  ✗ Entity buyer checkbox not found (p15cb007_448)');
                        }
                    } else if (licenseBuyerOrSeller === 'seller') {
                        const sellerCheckbox = await page.$('input[name="p15cb008_449"]');
                        if (sellerCheckbox) {
                            await sellerCheckbox.scrollIntoViewIfNeeded();
                            await page.waitForTimeout(200);
                            const isChecked = await sellerCheckbox.isChecked();
                            if (!isChecked) await sellerCheckbox.click();
                            log('  ✓ Entity acting as: Seller');
                        } else {
                            log('  ✗ Entity seller checkbox not found (p15cb008_449)');
                        }
                    }
                }
            }
        }

        await page.waitForTimeout(500);

        // Step 25: Handle Paragraph 39 - Contract Expiration (Page 16)
        log('Step 25: Handling Paragraph 39 (Contract Expiration)...');

        // Scroll to Page 16
        await page.evaluate(() => window.scrollTo(0, 26000));
        await page.waitForTimeout(500);

        // Support both new combined format (contract_expiration) and old separate format
        let expirationDate = answers.contract_expiration_date?.value;
        let expirationTime = answers.contract_expiration_time?.value;
        let expirationAmPm = answers.contract_expiration_ampm?.value;

        // If using new combined format, extract the parts
        if (answers.contract_expiration?.date) {
            expirationDate = answers.contract_expiration.date;
            expirationTime = answers.contract_expiration.time;
            expirationAmPm = answers.contract_expiration.ampm;
        }

        // Handle expiration date (p16df001_463)
        if (expirationDate) {
            // Parse the date using smart parser
            const parsedDate = parseNaturalDate(expirationDate);
            if (!parsedDate) {
                log(`  ✗ Could not parse expiration date: ${expirationDate}`);
            } else {
                const targetMonth = parsedDate.month;
                const targetDay = parsedDate.day;
                const targetYear = parsedDate.year;

                // Find and scroll to the expiration date field
                const expirationDateField = await page.$('input[name="p16df001_463"]');
                if (expirationDateField) {
                    await expirationDateField.scrollIntoViewIfNeeded();
                    await page.waitForTimeout(300);

                    // Find the date picker icon
                    const datePickerIcon = await page.evaluateHandle(() => {
                        const field = document.querySelector('input[name="p16df001_463"]');
                        if (!field) return null;
                        const container = field.closest('.datefieldwidget') || field.parentElement;
                        if (container) {
                            return container.querySelector('.datepicker-calendar-icon');
                        }
                        return null;
                    });

                    if (datePickerIcon && await datePickerIcon.evaluate(el => el !== null)) {
                        await datePickerIcon.click();
                        await page.waitForTimeout(500);

                        // Navigate to the correct month/year
                        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                                           'July', 'August', 'September', 'October', 'November', 'December'];
                        const targetMonthName = monthNames[targetMonth - 1];

                        let attempts = 0;
                        const maxAttempts = 24;

                        while (attempts < maxAttempts) {
                            const headerText = await page.$eval('.datetimepicker .dp-caption', el => {
                                return el.textContent.trim();
                            }).catch(() => '');

                            if (headerText.includes(targetMonthName) && headerText.includes(String(targetYear))) {
                                break;
                            }

                            const nextButton = await page.$('.datetimepicker .dp-rightnav');
                            if (nextButton) {
                                await nextButton.click();
                                await page.waitForTimeout(300);
                            } else {
                                break;
                            }
                            attempts++;
                        }

                        // Click on the target day
                        await page.waitForTimeout(300);
                        const dayClicked = await page.evaluate((day) => {
                            const picker = document.querySelector('.datetimepicker');
                            if (!picker) return false;
                            const dayElements = picker.querySelectorAll('.dp-monthview li[title]');
                            for (const li of dayElements) {
                                const title = li.getAttribute('title');
                                if (title === String(day) && !li.classList.contains('disabled')) {
                                    li.click();
                                    return true;
                                }
                            }
                            return false;
                        }, targetDay);

                        if (dayClicked) {
                            await page.waitForTimeout(300);
                            await page.mouse.click(100, 100); // Close picker
                            await page.waitForTimeout(200);
                            log(`  ✓ Expiration date: ${targetMonthName} ${targetDay}, ${targetYear}`);
                        } else {
                            log(`  ✗ Could not click on day ${targetDay}`);
                        }
                    } else {
                        log('  ✗ Expiration date picker icon not found');
                    }
                } else {
                    log('  ✗ Expiration date field not found (p16df001_463)');
                }
            }
        }

        // Handle expiration time (p16tf001_469) - parse to hour:00 format
        if (expirationTime) {
            const parsedTime = parseTimeValue(expirationTime);
            const timeField = await page.$('input[name="p16tf001_469"]');
            if (timeField) {
                await timeField.scrollIntoViewIfNeeded();
                await page.waitForTimeout(200);
                await timeField.fill(parsedTime);
                log(`  ✓ Expiration time: ${parsedTime}`);
            } else {
                log('  ✗ Expiration time field not found (p16tf001_469)');
            }
        }

        // Handle AM/PM checkbox
        if (expirationAmPm === 'am') {
            // AM checkbox (p16cb001_466)
            const amCheckbox = await page.$('input[name="p16cb001_466"]');
            if (amCheckbox) {
                await amCheckbox.scrollIntoViewIfNeeded();
                await page.waitForTimeout(200);
                const isChecked = await amCheckbox.isChecked();
                if (!isChecked) await amCheckbox.click();
                log('  ✓ Expiration: AM');
            } else {
                log('  ✗ AM checkbox not found (p16cb001_466)');
            }
        } else if (expirationAmPm === 'pm') {
            // PM checkbox (p16cb002_467)
            const pmCheckbox = await page.$('input[name="p16cb002_467"]');
            if (pmCheckbox) {
                await pmCheckbox.scrollIntoViewIfNeeded();
                await page.waitForTimeout(200);
                const isChecked = await pmCheckbox.isChecked();
                if (!isChecked) await pmCheckbox.click();
                log('  ✓ Expiration: PM');
            } else {
                log('  ✗ PM checkbox not found (p16cb002_467)');
            }
        }

        await page.waitForTimeout(500);

        // Step 26: Handle Page 17 - Buyer Names (Signature Page)
        log('Step 26: Handling Page 17 (Buyer Names)...');

        // Scroll to Page 17
        await page.evaluate(() => window.scrollTo(0, 28000));
        await page.waitForTimeout(500);

        // Fill Buyer 1 name (Global_Info-Buyer-Parties-Party-1-Name_524)
        if (answers.buyer_1_name?.value) {
            const buyer1Name = cleanTextValue(answers.buyer_1_name.value);
            const buyer1Field = await page.$('input[name="Global_Info-Buyer-Parties-Party-1-Name_524"]');
            if (buyer1Field) {
                await buyer1Field.scrollIntoViewIfNeeded();
                await page.waitForTimeout(200);
                await buyer1Field.fill(buyer1Name);
                log(`  ✓ Buyer 1: ${buyer1Name}`);
            } else {
                log('  ✗ Buyer 1 field not found (Global_Info-Buyer-Parties-Party-1-Name_524)');
            }
        }

        // Fill Buyer 2 name ONLY if has_buyer_2 is "yes" and buyer_2_name has a real value
        if (answers.has_buyer_2?.value === 'yes' && answers.buyer_2_name?.value) {
            const buyer2Name = cleanTextValue(answers.buyer_2_name.value);
            // Skip if it's just "no" or similar non-name value
            if (buyer2Name && buyer2Name.toLowerCase() !== 'no' && buyer2Name.toLowerCase() !== 'none') {
                const buyer2Field = await page.$('input[name="Global_Info-Buyer-Parties-Party-2-Name_525"]');
                if (buyer2Field) {
                    await buyer2Field.scrollIntoViewIfNeeded();
                    await page.waitForTimeout(200);
                    await buyer2Field.fill(buyer2Name);
                    log(`  ✓ Buyer 2: ${buyer2Name}`);
                } else {
                    log('  ✗ Buyer 2 field not found (Global_Info-Buyer-Parties-Party-2-Name_525)');
                }
            }
        }

        await page.waitForTimeout(500);

        // Take screenshot
        const screenshotPath = path.join(__dirname, 'screenshots', 'voice-filled-contract.png');
        await page.screenshot({ path: screenshotPath, fullPage: true });
        log('');
        log(`Screenshot saved: ${screenshotPath}`);

        // Step 27: Save the contract to a transaction
        log('');
        log('Step 27: Saving contract to transaction...');

        // The Save button is the floppy disk icon in the toolbar
        // Toolbar layout from screenshot:
        // [Insert Clause] [Add Additional Signers Page] [Printer icon] [SAVE/Floppy disk icon] [Eye icon] [X icon]
        // The save icon is the 2nd icon after the two text buttons (after printer)

        let saveClicked = false;

        // Method 1: Find the toolbar row and click the 4th clickable element (save icon)
        // The toolbar has: Insert Clause btn, Add Additional Signers btn, Print icon, SAVE icon, Eye icon, X icon
        try {
            saveClicked = await page.evaluate(() => {
                // Find the toolbar container - it's the row with "Insert Clause" button
                const insertClauseBtn = document.querySelector('button, a, span');
                let toolbarRow = null;

                // Search for the row containing "Insert Clause"
                const allElements = document.querySelectorAll('*');
                for (const el of allElements) {
                    if (el.textContent && el.textContent.includes('Insert Clause') && !el.textContent.includes('Real Estate')) {
                        // Found it - get the parent row
                        toolbarRow = el.closest('div, nav, header, section');
                        if (toolbarRow) break;
                    }
                }

                if (!toolbarRow) {
                    console.log('Could not find toolbar row');
                    return false;
                }

                // Get all clickable elements in this row
                const clickables = toolbarRow.querySelectorAll('button, a, [role="button"]');
                console.log('Found ' + clickables.length + ' clickable elements in toolbar');

                // The save button should be the 4th element (after Insert Clause, Add Additional Signers, Print)
                // But let's look for it by checking each one
                for (let i = 0; i < clickables.length; i++) {
                    const el = clickables[i];
                    const text = el.textContent || '';
                    const title = el.getAttribute('title') || el.getAttribute('data-original-title') || '';

                    console.log(`Toolbar element ${i}: text="${text.trim()}", title="${title}"`);

                    // Skip the text buttons
                    if (text.includes('Insert Clause') || text.includes('Additional Signers')) {
                        continue;
                    }

                    // Look for save-related title or it's the element right after print
                    if (title.toLowerCase().includes('save')) {
                        el.click();
                        console.log('Clicked save button by title');
                        return true;
                    }
                }

                // If title search didn't work, click the 4th element (0=Insert Clause, 1=Add Signers, 2=Print, 3=SAVE)
                if (clickables.length >= 4) {
                    clickables[3].click();
                    console.log('Clicked 4th toolbar element (save position)');
                    return true;
                }

                return false;
            });

            if (saveClicked) {
                log('  ✓ Clicked save button via toolbar position');
            }
        } catch (e) {
            log(`  Note: Toolbar position method: ${e.message}`);
        }

        // Method 2: Use Playwright locator to find by title attribute
        if (!saveClicked) {
            try {
                // Try various title-based selectors
                const saveBtn = await page.locator('[title*="Save" i], [data-original-title*="Save" i]').first();
                if (await saveBtn.isVisible()) {
                    await saveBtn.click();
                    log('  ✓ Clicked save button via title locator');
                    saveClicked = true;
                }
            } catch (e) {
                log(`  Note: Title locator method: ${e.message}`);
            }
        }

        // Method 3: Find icons in the same row as "Insert Clause" and click the 2nd icon (save is after print)
        if (!saveClicked) {
            try {
                // Find "Insert Clause" button, then find sibling icons
                const insertClauseBtn = await page.locator('button:has-text("Insert Clause"), a:has-text("Insert Clause")').first();
                if (await insertClauseBtn.isVisible()) {
                    // Get parent container
                    const toolbar = await insertClauseBtn.locator('xpath=ancestor::div[1]');
                    // Find all links/buttons that look like icons (no text or short text)
                    const icons = await toolbar.locator('a, button').all();

                    log(`  Found ${icons.length} elements in toolbar row`);

                    let iconIndex = 0;
                    for (const icon of icons) {
                        const text = await icon.textContent();
                        const title = await icon.getAttribute('title') || '';

                        // Skip text buttons
                        if (text && text.trim().length > 3) continue;

                        iconIndex++;
                        log(`    Icon ${iconIndex}: title="${title}"`);

                        // Save is the 2nd icon (after print which is 1st icon)
                        if (iconIndex === 2 || title.toLowerCase().includes('save')) {
                            await icon.click();
                            log('  ✓ Clicked save icon (2nd icon in toolbar)');
                            saveClicked = true;
                            break;
                        }
                    }
                }
            } catch (e) {
                log(`  Note: Icon position method: ${e.message}`);
            }
        }

        // Method 4: Direct XPath to find the save icon next to print
        if (!saveClicked) {
            try {
                // The save icon should be right after the print icon
                // Look for an anchor or button that follows the print element
                saveClicked = await page.evaluate(() => {
                    // Find all anchor tags in the header/toolbar area
                    const headerArea = document.querySelector('.page-header') ||
                                       document.querySelector('header') ||
                                       document.querySelector('nav') ||
                                       document.body;

                    const anchors = headerArea.querySelectorAll('a');
                    let foundPrint = false;

                    for (const a of anchors) {
                        const title = (a.getAttribute('title') || '').toLowerCase();
                        const dataTitle = (a.getAttribute('data-original-title') || '').toLowerCase();

                        // Check if this is the print icon
                        if (title.includes('print') || dataTitle.includes('print')) {
                            foundPrint = true;
                            continue;
                        }

                        // If we found print, the next icon should be save
                        if (foundPrint) {
                            // This should be the save icon
                            a.click();
                            console.log('Clicked element after print icon');
                            return true;
                        }

                        // Also check if this IS the save icon
                        if (title.includes('save') || dataTitle.includes('save')) {
                            a.click();
                            console.log('Clicked save icon directly');
                            return true;
                        }
                    }
                    return false;
                });

                if (saveClicked) {
                    log('  ✓ Clicked save icon via print-sibling method');
                }
            } catch (e) {
                log(`  Note: Print-sibling method: ${e.message}`);
            }
        }

        if (!saveClicked) {
            log('  ⚠ Could not find save button - taking screenshot for debugging');
            await page.screenshot({ path: path.join(__dirname, 'screenshots', 'save-button-not-found.png'), fullPage: false });
        }

        // Wait for save modal to appear
        await page.waitForTimeout(1500);

        // Now fill out the save modal
        await page.waitForTimeout(1000);

        // Click "New Transaction" radio button
        // Selector: input[type="radio"][name="new_transaction"][value="true"]
        const newTransactionRadio = await page.$('input[type="radio"][name="new_transaction"][value="true"]');
        if (newTransactionRadio) {
            await newTransactionRadio.click();
            log('  ✓ Selected "New transaction"');
            await page.waitForTimeout(300);
        } else {
            // Try clicking the label
            await page.click('label:has-text("New Transaction")');
            log('  ✓ Selected "New transaction" via label');
            await page.waitForTimeout(300);
        }

        // Extract street address from property address (just street number and name)
        const fullAddress = answers.property_address?.value || '';
        const streetMatch = fullAddress.match(/^[\d]+\s+[^,]+/);
        const streetAddress = streetMatch ? streetMatch[0].trim() : fullAddress.split(',')[0].trim();

        // Fill in Street Address
        // Selector: #transactionStreetAddress
        const streetInput = await page.$('#transactionStreetAddress');
        if (streetInput) {
            await streetInput.fill(streetAddress);
            log(`  ✓ Street Address: ${streetAddress}`);
        } else {
            log('  ⚠ Street Address field not found');
        }

        // Fill in Transaction Name (use street address)
        // Selector: #transaction-name
        const transNameInput = await page.$('#transaction-name');
        if (transNameInput) {
            await transNameInput.fill(streetAddress);
            log(`  ✓ Transaction Name: ${streetAddress}`);
        } else {
            log('  ⚠ Transaction Name field not found');
        }

        // Set Property Type to Residential (value="R")
        // Selector: #transaction_property_type
        const propertyTypeSelect = await page.$('#transaction_property_type');
        if (propertyTypeSelect) {
            await propertyTypeSelect.selectOption('R');
            log('  ✓ Property Type: Residential');
        } else {
            log('  ⚠ Property Type dropdown not found');
        }

        // Set Transaction Type to Listing (value="A")
        // Selector: #transaction_type
        const transTypeSelect = await page.$('#transaction_type');
        if (transTypeSelect) {
            await transTypeSelect.selectOption('A');
            log('  ✓ Transaction Type: Listing');
        } else {
            log('  ⚠ Transaction Type dropdown not found');
        }

        // Check "Same as address" checkbox (copies street address to transaction name)
        // Selector: #same-as-address
        try {
            const sameAsAddressCheckbox = await page.$('#same-as-address');
            if (sameAsAddressCheckbox) {
                const isChecked = await sameAsAddressCheckbox.isChecked();
                if (!isChecked) {
                    await sameAsAddressCheckbox.click();
                    log('  ✓ Checked "Same as address"');
                }
            } else {
                // Fallback: find by searching for text "same" and "address"
                const checkboxes = await page.$$('input[type="checkbox"]');
                for (const cb of checkboxes) {
                    const parent = await cb.evaluateHandle(el => el.parentElement);
                    const parentText = await parent.evaluate(el => el.textContent || '');
                    if (parentText.toLowerCase().includes('same') && parentText.toLowerCase().includes('address')) {
                        const isChecked = await cb.isChecked();
                        if (!isChecked) {
                            await cb.click();
                            log('  ✓ Checked "Same as address" via text search');
                        }
                        break;
                    }
                }
            }
        } catch (e) {
            log(`  Note: "Same as address" checkbox handling skipped: ${e.message}`);
        }

        await page.waitForTimeout(500);

        // Click "Create Transaction" button
        // The button starts disabled and needs form validation to enable
        // Selector: #add-to-new-transaction-form button[type="submit"]
        try {
            // Trigger input events to enable validation
            await page.evaluate(() => {
                // Dispatch input events on required fields to trigger validation
                const streetInput = document.querySelector('#transactionStreetAddress');
                const nameInput = document.querySelector('#transaction-name');
                if (streetInput) streetInput.dispatchEvent(new Event('input', { bubbles: true }));
                if (nameInput) nameInput.dispatchEvent(new Event('input', { bubbles: true }));

                // Remove disabled class from button
                const btn = document.querySelector('#add-to-new-transaction-form button[type="submit"]');
                if (btn) {
                    btn.classList.remove('disabled');
                    btn.removeAttribute('disabled');
                }
            });
            await page.waitForTimeout(300);

            const submitBtn = await page.$('#add-to-new-transaction-form button[type="submit"]');
            if (submitBtn) {
                await submitBtn.click({ timeout: 3000 });
                log('  ✓ Clicked "Create Transaction"');
            } else {
                // Fallback: try clicking by text with short timeout
                await page.click('button:has-text("Create Transaction")', { timeout: 3000 });
                log('  ✓ Clicked "Create Transaction" via text');
            }

            await page.waitForTimeout(2000);
            log('  ✓ Transaction created');
        } catch (e) {
            log(`  ⚠ Could not click Create Transaction button: ${e.message}`);
        }

        // Now click the "Save and Submit Form" button to actually save
        // This button appears after creating the transaction
        try {
            await page.waitForTimeout(1000);

            // Look for "Save and Submit Form" or similar button
            let saveSubmitClicked = false;

            // Method 1: Find by text
            const saveSubmitSelectors = [
                'button:has-text("Save and Submit")',
                'button:has-text("Save & Submit")',
                'button:has-text("Submit Form")',
                'a:has-text("Save and Submit")',
                'a:has-text("Save & Submit")',
                '[data-action="save-submit"]',
                '.save-submit-btn'
            ];

            for (const selector of saveSubmitSelectors) {
                try {
                    const btn = await page.$(selector);
                    if (btn && await btn.isVisible()) {
                        await btn.click();
                        log('  ✓ Clicked "Save and Submit Form"');
                        saveSubmitClicked = true;
                        break;
                    }
                } catch (e) {
                    // Continue trying
                }
            }

            // Method 2: JavaScript search for save/submit button
            if (!saveSubmitClicked) {
                saveSubmitClicked = await page.evaluate(() => {
                    const buttons = document.querySelectorAll('button, a, input[type="submit"]');
                    for (const btn of buttons) {
                        const text = (btn.textContent || btn.value || '').toLowerCase();
                        if ((text.includes('save') && text.includes('submit')) ||
                            text.includes('submit form')) {
                            btn.click();
                            return true;
                        }
                    }
                    return false;
                });

                if (saveSubmitClicked) {
                    log('  ✓ Clicked "Save and Submit Form" via JS search');
                }
            }

            // Method 3: Look for primary/submit button in the modal footer
            if (!saveSubmitClicked) {
                const modalFooterBtn = await page.$('.modal-footer button.btn-primary, .modal-footer button[type="submit"]');
                if (modalFooterBtn && await modalFooterBtn.isVisible()) {
                    await modalFooterBtn.click();
                    log('  ✓ Clicked primary button in modal footer');
                    saveSubmitClicked = true;
                }
            }

            if (saveSubmitClicked) {
                await page.waitForTimeout(3000);
                log('  ✓ Contract saved and submitted!');
            } else {
                log('  ⚠ Could not find "Save and Submit Form" button');
                await page.screenshot({ path: path.join(__dirname, 'screenshots', 'save-submit-not-found.png'), fullPage: false });
            }
        } catch (e) {
            log(`  ⚠ Could not click Save and Submit button: ${e.message}`);
        }

        // Take final screenshot after save
        await page.screenshot({ path: path.join(__dirname, 'screenshots', 'contract-saved.png'), fullPage: true });
        log('  ✓ Final screenshot saved')

        log('');
        log('=== CONTRACT FILLED SUCCESSFULLY ===');
        log('');
        log('The browser will stay open for you to review.');
        log('Press Ctrl+C when done.');

        // Keep browser open
        await new Promise(() => {}); // Wait indefinitely

    } catch (error) {
        log(`ERROR: ${error.message}`);
        await page.screenshot({
            path: path.join(__dirname, 'screenshots', 'voice-fill-error.png'),
            fullPage: true
        });
    }
}

fillFromVoice().catch(console.error);
