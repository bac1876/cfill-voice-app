# Form Simplicity Contract Filler - Workflow Documentation

## Overview
This document describes the automated workflow for filling and saving the Arkansas Real Estate Contract (Residential) in Form Simplicity.

## Credentials
- **URL**: `https://ara.formsimplicity.com`
- **Username**: `11621010`
- **Password**: `lbbc2245`

## Complete Workflow

### Step 1: Login
```javascript
await page.goto('https://ara.formsimplicity.com', { waitUntil: 'networkidle' });
await page.fill('input[type="text"]', USERNAME);
await page.fill('input[type="password"]', PASSWORD);
await page.click('button[type="submit"]');
await page.waitForURL('**/users/started', { timeout: 30000 });
```

### Step 2: Navigate to Forms Library
```javascript
await page.goto('https://ara.formsimplicity.com/formslibrary/formslibrary', { waitUntil: 'networkidle' });
```

### Step 3: Open Real Estate Contract Residential
```javascript
// Click on the contract NAME (not checkbox) to open it
await page.click('a[data-form-id="60014"]');
// Wait for form to load - URL changes to /users/renderpdf
await page.waitForTimeout(5000);
```

### Step 4: Fill Form Fields
The form uses XFA-style field names. Key fields discovered:

| Field Selector | Purpose |
|----------------|---------|
| `input[name="Global_Info-Property-Location-Address-Full_66"]` | Property Address |
| `input[name="Global_Info-Buyer-Entity-Name_67"]` | Buyer Name |
| `input[name="Global_Info-Sale-Price-Amount_68"]` | Sale Price |
| `textarea[name="Global_Info-Property-Legal-Description-Full_35"]` | Legal Description |

```javascript
// Fill property address
await page.fill('input[name="Global_Info-Property-Location-Address-Full_66"]', '1234 Maple Creek Drive, Rogers, AR 72758');

// Fill buyer name
await page.fill('input[name="Global_Info-Buyer-Entity-Name_67"]', 'John Michael Smith and Sarah Jane Smith');

// Fill sale price (number only, no formatting)
await page.fill('input[name="Global_Info-Sale-Price-Amount_68"]', '375000');

// Fill legal description
await page.fill('textarea[name="Global_Info-Property-Legal-Description-Full_35"]', 'Lot 15, Block 3, Maple Creek Subdivision...');
```

### Step 5: Save the Contract

#### 5a. Click Save Form
```javascript
await page.click('a:has-text("Save Form")');
await page.waitForTimeout(2000);
```

#### 5b. Select "New transaction"
```javascript
await page.click('label:has-text("New transaction")');
await page.waitForTimeout(1000);
```

#### 5c. Fill Street Address
```javascript
await page.waitForSelector('input[name="address"]:not([disabled])', { timeout: 5000 });
await page.fill('input[name="address"]', '1234 Maple Creek Drive');
```

#### 5d. Check "Same as property address"
```javascript
await page.click('label:has-text("Same as")');
```

#### 5e. Select Property Type: Residential (using JavaScript)
```javascript
await page.evaluate(() => {
    const select = document.querySelector('select.property-type-select');
    if (select) {
        select.value = 'R';  // R = Residential
        select.dispatchEvent(new Event('change', { bubbles: true }));
    }
});
```

#### 5f. Select Transaction Type: Purchase (using JavaScript)
```javascript
await page.evaluate(() => {
    const select = document.querySelector('select.transaction-type-select');
    if (select) {
        select.value = 'P';  // P = Purchase
        select.dispatchEvent(new Event('change', { bubbles: true }));
    }
});
```

#### 5g. Click Save & Submit Form
```javascript
await page.evaluate(() => {
    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
        if (btn.textContent.includes('Save & Submit') && btn.offsetParent !== null) {
            btn.click();
            return true;
        }
    }
    return false;
});
```

## Dropdown Values Reference

### Property Type (`select.property-type-select`)
| Value | Description |
|-------|-------------|
| `R` | Residential |
| `C` | Commercial |
| `L` | Land |

### Transaction Type (`select.transaction-type-select`)
| Value | Description |
|-------|-------------|
| `P` | Purchase |
| `L` | Listing |
| `G` | Listing & Purchase |

## Form Field Naming Convention

Fields follow this pattern:
- `Global_Info-[Category]-[Subcategory]-[Field]_[ID]`
- Page-specific fields: `p[page]tf[field]_[ID]` (text field) or `p[page]cb[field]_[ID]` (checkbox)

### Known Page 1 Fields
| Field Name | Type | Purpose |
|------------|------|---------|
| `Global_Info-Property-Location-Address-Full_66` | input | Full property address |
| `Global_Info-Buyer-Entity-Name_67` | input | Buyer name(s) |
| `Global_Info-Sale-Price-Amount_68` | input | Purchase price |
| `Global_Info-Property-Legal-Description-Full_35` | textarea | Legal description |
| `p01tf001_69` | input | Additional field |
| `p01tf002_36` | textarea | Additional field |
| `p01cb001_71` - `p01cb015_85` | checkbox | Various checkboxes |

## Success Indicators

After successful save:
1. Save dialog closes automatically
2. Form serial number changes (e.g., from `086940-...` to `001441-...`)
3. Form remains on `/users/renderpdf` page with saved data
4. Transaction appears in "My Transactions" section

## Working Script Location
`fill-and-save-contract-v3.js` - Complete working script that:
- Logs in
- Opens the contract
- Fills test data
- Saves to new transaction with Property Type: Residential, Transaction Type: Purchase
