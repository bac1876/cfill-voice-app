const fs = require('fs');
const path = require('path');

// Load current mapping
const mappingPath = path.join(__dirname, 'form-field-mappings.json');
const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));

console.log('=== FIXING KNOWN MAPPINGS ===');
console.log('');

// Page 1 VERIFIED checkboxes from our testing
const page1Fixes = {
    'p01cb001_71': 'Single family detached home with land',
    'p01cb002_72': 'One-to-four attached dwelling with land',
    'p01cb003_73': 'Manufactured / Mobile Home with land',
    'p01cb004_74': 'Builder Owned older than 1 year',
    'p01cb005_75': 'Condominium / Town Home',
    'p01cb006_76': '3A - PURCHASE PURSUANT TO NEW FINANCING',
    'p01cb007_77': '3B - PURCHASE PURSUANT TO LOAN ASSUMPTION',
    'p01cb008_78': '3C - PURCHASE PURSUANT TO CASH',
    'p01cb009_79': 'CONVENTIONAL',
    'p01cb010_80': 'VA',
    'p01cb011_81': 'FHA',
    'p01cb012_82': 'USDA-RD',
    'p01cb013_83': 'OTHER FINANCING',
    'p01cb014_84': 'Direct (under USDA-RD)',
    'p01cb015_85': 'Lender (under USDA-RD)'
};

// Page 1 text fields
const page1TextFixes = {
    'p01tf001_69': 'Date field (top)',
    'p01tf003_70': 'Additional notes/sum'
};

// Global fields - based on field names
const globalFixes = {
    'Global_Info-Property-Location-Address-Full_66': 'Property Address',
    'Global_Info-Buyer-Entity-Name_67': 'Buyer Name(s)',
    'Global_Info-Sale-Price-Amount_68': 'Purchase Price ($)',
    'Global_Info-Buyer-Parties-Party-1-Name_524': 'Buyer 1 Signature',
    'Global_Info-Buyer-Parties-Party-2-Name_525': 'Buyer 2 Signature',
    'Global_Info-Seller-Parties-Party-1-Name_526': 'Seller 1 Signature',
    'Global_Info-Seller-Parties-Party-2-Name_527': 'Seller 2 Signature',
    'Global_Info-Buyer-Parties-Party-3-Name_hdn_41': 'Buyer 3 Name (hidden)',
    'Global_Info-Buyer-Parties-Party-4-Name_hdn_42': 'Buyer 4 Name (hidden)',
    'Global_Info-Buyer-Parties-Party-5-Name_hdn_43': 'Buyer 5 Name (hidden)',
    'Global_Info-Buyer-Parties-Party-6-Name_hdn_44': 'Buyer 6 Name (hidden)',
    'Global_Info-Buyer-Parties-Party-7-Name_hdn_45': 'Buyer 7 Name (hidden)',
    'Global_Info-Buyer-Parties-Party-8-Name_hdn_46': 'Buyer 8 Name (hidden)',
    'Global_Info-Seller-Parties-Party-3-Name_hdn_47': 'Seller 3 Name (hidden)',
    'Global_Info-Seller-Parties-Party-4-Name_hdn_48': 'Seller 4 Name (hidden)',
    'Global_Info-Seller-Parties-Party-5-Name_hdn_49': 'Seller 5 Name (hidden)',
    'Global_Info-Seller-Parties-Party-6-Name_hdn_50': 'Seller 6 Name (hidden)',
    'Global_Info-Seller-Parties-Party-7-Name_hdn_51': 'Seller 7 Name (hidden)',
    'Global_Info-Seller-Parties-Party-8-Name_hdn_52': 'Seller 8 Name (hidden)',
    'Global_Info-Buyer-Broker-Entity-Name_573': 'Buyer Broker Company Name',
    'Global_Info-Buyer-Broker-BrokerAgent-Name_574': 'Buyer Principal/Executive Broker Signature',
    'Global_Info-Buyer-Broker-BrokerAgent-Contact-EMail_575': 'Buyer Broker Email',
    'Global_Info-Buyer-Broker-Agents-Agent-Name_576': 'Selling Agent Signature',
    'Global_Info-Buyer-Broker-Agents-Agent-Contact-EMail_577': 'Selling Agent Email',
    'Global_Info-Buyer-Broker-Agents-Agent-Contact-Phone-Cell_578': 'Selling Agent Cell Phone',
    'Global_Info-Buyer-Broker-BrokerAgent-ID-Full_579': 'Buyer Broker AREC License #',
    'Global_Info-Buyer-Broker-Agents-Agent-ID-Full_580': 'Selling Agent AREC License #',
    'Global_Info-Seller-Broker-Entity-Name_603': 'Seller Broker Company Name',
    'Global_Info-Seller-Broker-BrokerAgent-Name_604': 'Seller Principal/Executive Broker Signature',
    'Global_Info-Seller-Broker-BrokerAgent-Contact-EMail_605': 'Seller Broker Email',
    'Global_Info-Seller-Broker-Agents-Agent-Name_606': 'Listing Agent Signature',
    'Global_Info-Seller-Broker-Agents-Agent-Contact-EMail_607': 'Listing Agent Email',
    'Global_Info-Seller-Broker-Agents-Agent-Contact-Phone-Cell_608': 'Listing Agent Cell Phone',
    'Global_Info-Seller-Broker-BrokerAgent-ID-Full_609': 'Seller Broker AREC License #',
    'Global_Info-Seller-Broker-Agents-Agent-ID-Full_610': 'Listing Agent AREC License #'
};

// Page 2 - Loan related
const page2Fixes = {
    'p02cb001_98': 'LOAN APPROVAL deadline checkbox',
    'p02cb002_99': 'Insert Clause checkbox',
    'p02cb003_100': 'Buyer has received HUD/FHA Form HUD-92564-CN',
    'p02tf001_97': 'Loan approval days field'
};

// Page 3 - Agency checkboxes
const page3Fixes = {
    'p03cb001_120': 'AGENCY: LISTING company represents Seller',
    'p03cb002_121': 'Agency: Transactions Brokerage',
    'p03cb003_122': 'Agency: Designated Agent for Seller',
    'p03cb004_123': 'Agency: Designated Agent for Buyer',
    'p03cb005_124': 'Agency: Other disclosure'
};

// Page 4 - Earnest Money
const page4Fixes = {
    'p04cb001_155': 'Earnest Money: Yes, see Addendum',
    'p04cb002_156': 'Earnest Money: No, not applicable',
    'p04cb003_157': 'Earnest Money: Not applicable (explain)',
    'p04cb004_158': 'Deposit Option i (earnest money to closing agent)',
    'p04cb005_159': 'Deposit Option ii (earnest money to seller)',
    'p04cb006_160': 'Deposit Option iii (other)',
    'p04cb007_161': 'Deposit Option iv',
    'p04tf001_151': 'Earnest money amount ($)',
    'p04tf003_152': 'Deposit due date',
    'p04tf004_153': 'Deposit amount ($)',
    'p04tf005_154': 'Deposit holder name'
};

// Page 5 - Title Insurance
const page5Fixes = {
    'p05cb001_179': 'Title Insurance: Seller pays',
    'p05cb002_180': 'Title Insurance: Buyer pays',
    'p05cb003_181': 'Title Insurance: Other arrangement',
    'p05tf001_183': 'Title company name'
};

// Page 6 - Survey
const page6Fixes = {
    'p06cb001_207': 'Survey: New survey required',
    'p06cb002_208': 'Survey: Buyer declines survey',
    'p06cb003_209': 'Survey: Other arrangement',
    'p06cb004_210': 'Survey Cost: Equally split',
    'p06cb005_211': 'Survey Cost: Seller pays',
    'p06cb006_212': 'Survey Cost: Buyer pays',
    'p06tf001_214': 'Survey deadline days'
};

// Page 7 - Contingencies
const page7Fixes = {
    'p07cb001_235': 'OTHER CONTINGENCY checkbox',
    'p07cb002_236': 'This Real Estate Contract is contingent upon',
    'p07cb003_237': 'Contingency: Sale of Buyer property',
    'p07cb004_238': 'Contingency: Appraisal contingency',
    'p07cb005_239': 'Buyer removes contingency',
    'p07cb006_240': 'At time of Real Estate Contract acceptance',
    'p07tf002_245': 'Contingency property address',
    'p07tf003_246': 'Contingency deadline date',
    'p07tf004_247': 'Contingency event description'
};

// Page 8 - Home Warranty
const page8Fixes = {
    'p08cb001_270': 'No Home Warranty provided',
    'p08cb002_271': 'Home Warranty: Plan provided by company',
    'p08cb003_272': 'Home Warranty: Plan paid for by party',
    'p08cb004_273': 'Home Warranty: Cost limit',
    'p08cb005_274': 'Home Warranty: Subject to conditions',
    'p08cb006_275': 'Home Warranty: Part of Real Estate Contract',
    'p08tf001_277': 'Home Warranty company name',
    'p08tf002_278': 'Home Warranty plan type',
    'p08tf003_279': 'Home Warranty provider details',
    'p08tf004_280': 'Home Warranty additional details',
    'p08tf005_281': 'Home Warranty cost amount ($)',
    'p08tf006_282': 'Home Warranty notes',
    'p08tf007_283': 'Home Warranty section notes'
};

// Page 10 - Property Disclosure & HOA
const page10Fixes = {
    'p10cb001_317': 'SELLER PROPERTY DISCLOSURE: Provided',
    'p10cb002_318': 'Property Disclosure: Buyer received',
    'p10cb003_319': 'Property Disclosure: Previously received',
    'p10cb004_320': 'Property Disclosure: Buyer waives',
    'p10cb005_326': 'HOA: Property NOT subject to mandatory membership',
    'p10cb006_327': 'HOA: Property IS subject to mandatory membership',
    'p10cb007_328': 'HOA: See Owners Association Addendum attached'
};

// Page 11 - Termite & Lead Paint
const page11Fixes = {
    'p11cb001_344': 'Lead Paint: Assessment/Inspection checkbox',
    'p11cb002_345': 'Lead Paint: Buyer waives right',
    'p11cb005_355': 'Termite: No treatment required',
    'p11cb006_356': 'Termite: Letter required',
    'p11cb007_357': 'Lead Paint: Other/Additional',
    'p11tf001_354': 'Termite inspection company'
};

// Page 13 - Possession
const page13Fixes = {
    'p13cb001_401': 'Possession: Upon Closing',
    'p13cb002_402': 'Possession: Delayed (see Addendum)',
    'p13cb003_403': 'Possession: Prior to Closing (see Addendum)'
};

// Page 15 - Licensee Disclosure
const page15Fixes = {
    'p15cb001_442': 'LICENSEE DISCLOSURE section',
    'p15cb002_443': 'Licensee Disclosure: Not Applicable',
    'p15cb003_444': 'Licensee Disclosure: Agent has interest',
    'p15cb004_445': 'Licensee Disclosure: Agent is principal',
    'p15cb005_446': 'Licensee Disclosure: Agent relationship',
    'p15cb006_447': 'Licensee Disclosure: Other',
    'p15cb007_448': 'Licensee Disclosure: Additional',
    'p15cb008_449': 'Licensee Disclosure: Confirmation'
};

// Page 16 - Contract Expiration
const page16Fixes = {
    'p16cb001_466': 'Contract expiration option 1',
    'p16cb002_467': 'Contract expiration option 2',
    'p16tf001_469': 'Contract expiration date/time'
};

// Page 17 - Acceptance
const page17Fixes = {
    'p17cb001_479': 'Seller Response: ACCEPTED',
    'p17cb002_480': 'Seller Response: COUNTER-OFFERED',
    'p17cb003_516': 'Seller Response: BACKUP CONTRACT',
    'p17cb004_512': 'Seller Response: Contract copy provided',
    'p17cb005_500': 'Seller Response: REJECTED',
    'p17tf001_482': 'Seller Initials field',
    'p17tf002_514': 'Counter offer terms',
    'p17tf003_518': 'Backup contract terms'
};

// Apply all fixes
console.log('Applying Page 1 fixes...');
for (const [name, label] of Object.entries(page1Fixes)) {
    if (mapping.pages.page1.checkboxes[name]) {
        mapping.pages.page1.checkboxes[name] = label;
    }
}
for (const [name, label] of Object.entries(page1TextFixes)) {
    if (mapping.pages.page1.textFields[name]) {
        mapping.pages.page1.textFields[name] = label;
    }
}

console.log('Applying Global field fixes...');
for (const [name, label] of Object.entries(globalFixes)) {
    if (mapping.globalFields[name] !== undefined) {
        mapping.globalFields[name] = label;
    }
}

console.log('Applying Page 2 fixes...');
for (const [name, label] of Object.entries(page2Fixes)) {
    if (mapping.pages.page2.checkboxes[name]) {
        mapping.pages.page2.checkboxes[name] = label;
    }
    if (mapping.pages.page2.textFields[name]) {
        mapping.pages.page2.textFields[name] = label;
    }
}

console.log('Applying Page 3 fixes...');
for (const [name, label] of Object.entries(page3Fixes)) {
    if (mapping.pages.page3.checkboxes[name]) {
        mapping.pages.page3.checkboxes[name] = label;
    }
}

console.log('Applying Page 4 fixes...');
for (const [name, label] of Object.entries(page4Fixes)) {
    if (mapping.pages.page4.checkboxes[name]) {
        mapping.pages.page4.checkboxes[name] = label;
    }
    if (mapping.pages.page4.textFields[name]) {
        mapping.pages.page4.textFields[name] = label;
    }
}

console.log('Applying Page 5 fixes...');
for (const [name, label] of Object.entries(page5Fixes)) {
    if (mapping.pages.page5.checkboxes[name]) {
        mapping.pages.page5.checkboxes[name] = label;
    }
    if (mapping.pages.page5.textFields[name]) {
        mapping.pages.page5.textFields[name] = label;
    }
}

console.log('Applying Page 6 fixes...');
for (const [name, label] of Object.entries(page6Fixes)) {
    if (mapping.pages.page6.checkboxes[name]) {
        mapping.pages.page6.checkboxes[name] = label;
    }
    if (mapping.pages.page6.textFields[name]) {
        mapping.pages.page6.textFields[name] = label;
    }
}

console.log('Applying Page 7 fixes...');
for (const [name, label] of Object.entries(page7Fixes)) {
    if (mapping.pages.page7.checkboxes[name]) {
        mapping.pages.page7.checkboxes[name] = label;
    }
    if (mapping.pages.page7.textFields[name]) {
        mapping.pages.page7.textFields[name] = label;
    }
}

console.log('Applying Page 8 fixes...');
for (const [name, label] of Object.entries(page8Fixes)) {
    if (mapping.pages.page8.checkboxes[name]) {
        mapping.pages.page8.checkboxes[name] = label;
    }
    if (mapping.pages.page8.textFields[name]) {
        mapping.pages.page8.textFields[name] = label;
    }
}

console.log('Applying Page 10 fixes...');
for (const [name, label] of Object.entries(page10Fixes)) {
    if (mapping.pages.page10.checkboxes[name]) {
        mapping.pages.page10.checkboxes[name] = label;
    }
}

console.log('Applying Page 11 fixes...');
for (const [name, label] of Object.entries(page11Fixes)) {
    if (mapping.pages.page11.checkboxes[name]) {
        mapping.pages.page11.checkboxes[name] = label;
    }
    if (mapping.pages.page11.textFields[name]) {
        mapping.pages.page11.textFields[name] = label;
    }
}

console.log('Applying Page 13 fixes...');
for (const [name, label] of Object.entries(page13Fixes)) {
    if (mapping.pages.page13.checkboxes[name]) {
        mapping.pages.page13.checkboxes[name] = label;
    }
}

console.log('Applying Page 15 fixes...');
for (const [name, label] of Object.entries(page15Fixes)) {
    if (mapping.pages.page15.checkboxes[name]) {
        mapping.pages.page15.checkboxes[name] = label;
    }
}

console.log('Applying Page 16 fixes...');
for (const [name, label] of Object.entries(page16Fixes)) {
    if (mapping.pages.page16.checkboxes[name]) {
        mapping.pages.page16.checkboxes[name] = label;
    }
    if (mapping.pages.page16.textFields[name]) {
        mapping.pages.page16.textFields[name] = label;
    }
}

console.log('Applying Page 17 fixes...');
for (const [name, label] of Object.entries(page17Fixes)) {
    if (mapping.pages.page17.checkboxes[name]) {
        mapping.pages.page17.checkboxes[name] = label;
    }
    if (mapping.pages.page17.textFields[name]) {
        mapping.pages.page17.textFields[name] = label;
    }
}

// Update timestamp
mapping.formInfo.mappedAt = new Date().toISOString();
mapping.formInfo.lastCorrected = new Date().toISOString();

// Save
fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2));
console.log('');
console.log('Saved updated mapping to:', mappingPath);

// Count remaining NEEDS_REVIEW
let needsReview = 0;
for (const pageData of Object.values(mapping.pages)) {
    for (const label of Object.values(pageData.checkboxes)) {
        if (label === 'NEEDS_REVIEW') needsReview++;
    }
    for (const label of Object.values(pageData.textFields)) {
        if (label === 'NEEDS_REVIEW') needsReview++;
    }
}
for (const label of Object.values(mapping.globalFields)) {
    if (label === 'NEEDS_REVIEW') needsReview++;
}

console.log('');
console.log('Items still needing review:', needsReview);
console.log('');
console.log('Done!');
