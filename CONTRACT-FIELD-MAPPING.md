# Arkansas Real Estate Contract - Field Mapping

This document maps every fillable field in the Arkansas Real Estate Contract (Residential) to its corresponding Form Simplicity field name.

## Field Naming Convention
- `Global_Info-*` = Global fields shared across forms
- `pXXtfYYY_ZZ` = Page XX, text field YYY, internal ID ZZ
- `pXXcbYYY_ZZ` = Page XX, checkbox YYY, internal ID ZZ

---

## PAGE 1 - Parties, Property Type, Address, Purchase Price

### Section 1: PARTIES (Buyer Names)
| Field Description | Form Field Name | Data Type |
|-------------------|-----------------|-----------|
| Buyer Name (Line 1) | `Global_Info-Buyer-Entity-Name_67` | Text |
| Buyer Name (Line 2 - additional) | `p01tf001_69` | Text |

### Section 2: Property Type (Checkboxes)
| Field Description | Form Field Name | Data Type |
|-------------------|-----------------|-----------|
| Single family detached home with land | `p01cb001_71` | Checkbox |
| One-to-four attached dwelling with land | `p01cb002_72` | Checkbox |
| Manufactured / Mobile Home with land | `p01cb003_73` | Checkbox |
| Builder Owned older than 1 year | `p01cb004_74` | Checkbox |
| Condominium / Town Home | `p01cb005_75` | Checkbox |

### Section 2: ADDRESS AND LEGAL DESCRIPTION
| Field Description | Form Field Name | Data Type |
|-------------------|-----------------|-----------|
| Property Address (Full) | `Global_Info-Property-Location-Address-Full_66` | Text |
| Legal Description (Multi-line) | `Global_Info-Property-Legal-Description-Full_35` | Textarea |
| Legal Description (Line 2) | `p01tf002_36` | Textarea |

### Section 3: PURCHASE PRICE
| Field Description | Form Field Name | Data Type |
|-------------------|-----------------|-----------|
| 3A - New Financing Amount | `Global_Info-Sale-Price-Amount_68` | Currency |
| 3A - Purchase Pursuant to New Financing | `p01cb006_76` | Checkbox |
| Loan Type - CONVENTIONAL | `p01cb007_77` | Checkbox |
| Loan Type - VA | `p01cb008_78` | Checkbox |
| Loan Type - FHA | `p01cb009_79` | Checkbox |
| Loan Type - USDA-RD | `p01cb010_80` | Checkbox |
| USDA-RD - Direct | `p01cb011_81` | Checkbox |
| USDA-RD - Lender | `p01cb012_82` | Checkbox |
| OTHER FINANCING checkbox | `p01cb013_83` | Checkbox |
| Other Financing Details | `p01tf003_70` | Textarea |
| 3B - Loan Assumption | `p01cb014_84` | Checkbox |
| 3C - Cash Purchase | `p01cb015_85` | Checkbox |
| 3C - Cash Amount | `p01tf004_*` | Currency |

---

## PAGE 2 - VA/FHA Notice

### FHA Notice Fields
| Field Description | Form Field Name | Data Type |
|-------------------|-----------------|-----------|
| FHA Appraised Value Amount | `p02tf001_*` | Currency |
| Buyer received HUD form checkbox | `p02cb001_*` | Checkbox |

---

## PAGE 3 - Agency

### Section 4: AGENCY (Checkboxes)
| Field Description | Form Field Name | Data Type |
|-------------------|-----------------|-----------|
| 4A - Listing & Selling Firm Represent Seller | `p03cb001_*` | Checkbox |
| 4B - Listing=Seller, Selling=Buyer | `p03cb002_*` | Checkbox |
| 4C - Both Represent Both | `p03cb003_*` | Checkbox |
| 4D - Selling Firm Represents Buyer (No Listing) | `p03cb004_*` | Checkbox |
| 4E - Listing Firm Represents Seller (No Selling) | `p03cb005_*` | Checkbox |

---

## PAGE 4 - Loan Costs, Earnest Money, Non-Refundable Deposit

### Section 5: LOAN AND CLOSING COSTS
| Field Description | Form Field Name | Data Type |
|-------------------|-----------------|-----------|
| Government Loan Fees (Seller Limit) | `p04tf001_*` | Currency |
| Additional Closing Cost Terms (Line 1) | `p04tf002_*` | Text |
| Additional Closing Cost Terms (Line 2) | `p04tf003_*` | Text |

### Section 7: EARNEST MONEY
| Field Description | Form Field Name | Data Type |
|-------------------|-----------------|-----------|
| 7A - Yes, see Earnest Money Addendum | `p04cb001_*` | Checkbox |
| 7B - No | `p04cb002_*` | Checkbox |

### Section 8: NON-REFUNDABLE DEPOSIT
| Field Description | Form Field Name | Data Type |
|-------------------|-----------------|-----------|
| 8A - Deposit Not Applicable | `p04cb003_*` | Checkbox |
| 8B - Deposit Applicable | `p04cb004_*` | Checkbox |
| Deposit Amount | `p04tf004_*` | Currency |
| 8B(i) - Within X days | `p04cb005_*` | Checkbox |
| Days for deposit | `p04tf005_*` | Number |
| 8B(ii) - Within 3 business days | `p04cb006_*` | Checkbox |
| 8B(iii) - Other | `p04cb007_*` | Checkbox |
| Other deposit terms | `p04tf006_*` | Text |

---

## PAGE 5 - Conveyance, Title Requirements

### Section 10: TITLE REQUIREMENTS
| Field Description | Form Field Name | Data Type |
|-------------------|-----------------|-----------|
| 10A - Seller furnishes owner's policy | `p05cb001_*` | Checkbox |
| 10B - Split cost | `p05cb002_*` | Checkbox |
| 10C - Other | `p05cb003_*` | Checkbox |
| Other title terms | `p05tf001_*` | Text |

---

## PAGE 6 - Survey, Prorations, Fixtures

### Section 11: SURVEY
| Field Description | Form Field Name | Data Type |
|-------------------|-----------------|-----------|
| 11A - New Survey | `p06cb001_*` | Checkbox |
| Survey paid by - Buyer | `p06cb002_*` | Checkbox |
| Survey paid by - Seller | `p06cb003_*` | Checkbox |
| Survey paid by - Equally Split | `p06cb004_*` | Checkbox |
| 11B - Buyer declines survey | `p06cb005_*` | Checkbox |
| 11C - Other | `p06cb006_*` | Checkbox |
| Other survey terms | `p06tf001_*` | Text |

### Section 13: FIXTURES AND ATTACHED EQUIPMENT
| Field Description | Form Field Name | Data Type |
|-------------------|-----------------|-----------|
| Additional fixtures included | `p06tf002_*` | Text |
| Items NOT conveying (Line 1) | `p06tf003_*` | Text |
| Items NOT conveying (Line 2) | `p06tf004_*` | Text |

---

## PAGE 7 - Other Contingency

### Section 14: OTHER CONTINGENCY
| Field Description | Form Field Name | Data Type |
|-------------------|-----------------|-----------|
| 14A - No Other Contingency | `p07cb001_*` | Checkbox |
| 14B - Contingent upon | `p07cb002_*` | Checkbox |
| Contingency description (Line 1) | `p07tf001_*` | Text |
| Contingency description (Line 2) | `p07tf002_*` | Text |
| Contingency description (Line 3) | `p07tf003_*` | Text |
| Contingency month | `p07tf004_*` | Text |
| Contingency day | `p07tf005_*` | Text |
| Contingency year | `p07tf006_*` | Text |
| 14B(i) - Binding with Escape Clause | `p07cb003_*` | Checkbox |
| Escape Clause hours | `p07tf007_*` | Number |
| Escape Clause address | `p07tf008_*` | Text |
| Closing days from removal | `p07tf009_*` | Number |
| 14B(ii) - Binding without Escape | `p07cb004_*` | Checkbox |
| Time refers to - Buyer removes contingency | `p07cb005_*` | Checkbox |
| Time refers to - Contract acceptance | `p07cb006_*` | Checkbox |

---

## PAGE 8 - Home Warranty, Inspection

### Section 15: HOME-WARRANTY PLANS
| Field Description | Form Field Name | Data Type |
|-------------------|-----------------|-----------|
| 15A - No Home Warranty | `p08cb001_*` | Checkbox |
| 15B - Specific Company Warranty | `p08cb002_*` | Checkbox |
| Warranty Company Name | `p08tf001_*` | Text |
| Warranty Plan Name | `p08tf002_*` | Text |
| Warranty Paid By | `p08tf003_*` | Text |
| Warranty Cost Not to Exceed | `p08tf004_*` | Currency |
| 15C - General Warranty | `p08cb003_*` | Checkbox |
| 15C Paid By | `p08tf005_*` | Text |
| 15C Cost Not to Exceed | `p08tf006_*` | Currency |
| 15D - Other | `p08cb004_*` | Checkbox |
| Other warranty terms | `p08tf007_*` | Text |

### Section 16: INSPECTION AND REPAIRS
| Field Description | Form Field Name | Data Type |
|-------------------|-----------------|-----------|
| 16A - AS IS | `p08cb005_*` | Checkbox |
| 16B - Inspection Rights | `p08cb006_*` | Checkbox |

---

## PAGE 10 - Restrictive Covenants, Seller Disclosure

### Section 18: RESTRICTIVE COVENANTS
| Field Description | Form Field Name | Data Type |
|-------------------|-----------------|-----------|
| Not subject to mandatory membership | `p10cb001_*` | Checkbox |
| Subject to mandatory membership | `p10cb002_*` | Checkbox |
| See Owners Association Addendum | `p10cb003_*` | Checkbox |

### Section 19: SELLER PROPERTY DISCLOSURE
| Field Description | Form Field Name | Data Type |
|-------------------|-----------------|-----------|
| 19A - Received and reviewed | `p10cb004_*` | Checkbox |
| 19B - Request disclosure | `p10cb005_*` | Checkbox |
| 19C - Not requested | `p10cb006_*` | Checkbox |
| 19D - No disclosure available | `p10cb007_*` | Checkbox |

---

## PAGE 11 - Termite, Lead Paint, Insurance

### Section 20: TERMITE CONTROL
| Field Description | Form Field Name | Data Type |
|-------------------|-----------------|-----------|
| 20A - None | `p11cb001_*` | Checkbox |
| 20B - Letter of Clearance | `p11cb002_*` | Checkbox |
| 20C - Other | `p11cb003_*` | Checkbox |
| Other termite terms | `p11tf001_*` | Text |

### Section 21: LEAD-BASED PAINT
| Field Description | Form Field Name | Data Type |
|-------------------|-----------------|-----------|
| 21A - Not constructed prior to 1978 | `p11cb004_*` | Checkbox |
| 21B - May contain lead paint (pre-1978) | `p11cb005_*` | Checkbox |

---

## PAGE 12 - Closing

### Section 23: CLOSING
| Field Description | Form Field Name | Data Type |
|-------------------|-----------------|-----------|
| Closing Month | `p12tf001_*` | Text |
| Closing Day | `p12tf002_*` | Text |
| Closing Year | `p12tf003_*` | Text |

---

## PAGE 13 - Possession, Assignment

### Section 24: POSSESSION
| Field Description | Form Field Name | Data Type |
|-------------------|-----------------|-----------|
| 24A - Upon Closing | `p13cb001_*` | Checkbox |
| 24B - Delayed Possession | `p13cb002_*` | Checkbox |
| 24C - Prior to Closing | `p13cb003_*` | Checkbox |

---

## PAGE 14 - Disclaimer, Other, Time

### Section 33: OTHER
| Field Description | Form Field Name | Data Type |
|-------------------|-----------------|-----------|
| Other terms (Line 1) | `p14tf001_*` | Text |
| Other terms (Line 2) | `p14tf002_*` | Text |
| Other terms (Line 3) | `p14tf003_*` | Text |
| Other terms (Line 4) | `p14tf004_*` | Text |
| Other terms (Line 5) | `p14tf005_*` | Text |

---

## PAGE 15 - Licensee Disclosure

### Section 38: LICENSEE DISCLOSURE
| Field Description | Form Field Name | Data Type |
|-------------------|-----------------|-----------|
| 38A - Not Applicable | `p15cb001_*` | Checkbox |
| 38B - Party holds license | `p15cb002_*` | Checkbox |
| 38B - Buyer holds license | `p15cb003_*` | Checkbox |
| 38B - Seller holds license | `p15cb004_*` | Checkbox |
| 38C - Entity owner holds license | `p15cb005_*` | Checkbox |
| 38C - Buyer entity | `p15cb006_*` | Checkbox |
| 38C - Seller entity | `p15cb007_*` | Checkbox |
| 38D - Neither party represented | `p15cb008_*` | Checkbox |

---

## PAGE 16 - Expiration

### Section 39: EXPIRATION
| Field Description | Form Field Name | Data Type |
|-------------------|-----------------|-----------|
| Expiration Month | `p16tf001_*` | Text |
| Expiration Day | `p16tf002_*` | Text |
| Expiration Year | `p16tf003_*` | Text |
| Expiration Time | `p16tf004_*` | Text |
| Expiration AM | `p16cb001_*` | Checkbox |
| Expiration PM | `p16cb002_*` | Checkbox |

---

## PAGE 17 - Signatures

### Buyer Signatures
| Field Description | Form Field Name | Data Type |
|-------------------|-----------------|-----------|
| Buyer 1 Signature | `p17sig001_*` | Signature |
| Buyer 1 Printed Name | `p17tf001_*` | Text |
| Buyer 1 Date/Time | `p17tf002_*` | DateTime |
| Buyer 2 Signature | `p17sig002_*` | Signature |
| Buyer 2 Printed Name | `p17tf003_*` | Text |
| Buyer 2 Date/Time | `p17tf004_*` | DateTime |

### Seller Response
| Field Description | Form Field Name | Data Type |
|-------------------|-----------------|-----------|
| Accepted checkbox | `p17cb001_*` | Checkbox |
| Seller 1 Signature | `p17sig003_*` | Signature |
| Seller 1 Printed Name | `p17tf005_*` | Text |
| Seller 1 Date/Time | `p17tf006_*` | DateTime |
| Seller 2 Signature | `p17sig004_*` | Signature |
| Seller 2 Printed Name | `p17tf007_*` | Text |
| Seller 2 Date/Time | `p17tf008_*` | DateTime |
| Rejected checkbox | `p17cb002_*` | Checkbox |
| Counter-offered checkbox | `p17cb003_*` | Checkbox |
| Counter Serial Number | `p17tf009_*` | Text |
| Backup checkbox | `p17cb004_*` | Checkbox |
| Backup Serial Number | `p17tf010_*` | Text |
| Accepted as Backup checkbox | `p17cb005_*` | Checkbox |

---

## PAGE 18 - Agent/Broker Information

### Selling Firm
| Field Description | Form Field Name | Data Type |
|-------------------|-----------------|-----------|
| Selling Firm Name | `p18tf001_*` | Text |
| Selling Broker Signature | `p18sig001_*` | Signature |
| Selling Broker Printed Name | `p18tf002_*` | Text |
| Selling Broker Date/Time | `p18tf003_*` | DateTime |
| Selling Broker AREC License # | `p18tf004_*` | Text |
| Selling Broker Email | `p18tf005_*` | Text |
| Selling Agent Signature | `p18sig002_*` | Signature |
| Selling Agent Printed Name | `p18tf006_*` | Text |
| Selling Agent Date/Time | `p18tf007_*` | DateTime |
| Selling Agent AREC License # | `p18tf008_*` | Text |
| Selling Agent Email | `p18tf009_*` | Text |
| Selling Agent Cell Number | `p18tf010_*` | Text |

### Listing Firm
| Field Description | Form Field Name | Data Type |
|-------------------|-----------------|-----------|
| Listing Firm Name | `p18tf011_*` | Text |
| Listing Broker Signature | `p18sig003_*` | Signature |
| Listing Broker Printed Name | `p18tf012_*` | Text |
| Listing Broker Date/Time | `p18tf013_*` | DateTime |
| Listing Broker AREC License # | `p18tf014_*` | Text |
| Listing Broker Email | `p18tf015_*` | Text |
| Listing Agent Signature | `p18sig004_*` | Signature |
| Listing Agent Printed Name | `p18tf016_*` | Text |
| Listing Agent Date/Time | `p18tf017_*` | DateTime |
| Listing Agent AREC License # | `p18tf018_*` | Text |
| Listing Agent Email | `p18tf019_*` | Text |
| Listing Agent Cell Number | `p18tf020_*` | Text |

---

## KNOWN FIELD NAMES (Verified from Form Simplicity)

These are the actual field names discovered from the live form:

### Page 1 - Verified Fields
| Description | Actual Field Name |
|-------------|-------------------|
| Property Address | `Global_Info-Property-Location-Address-Full_66` |
| Buyer Name | `Global_Info-Buyer-Entity-Name_67` |
| Sale Price | `Global_Info-Sale-Price-Amount_68` |
| Legal Description | `Global_Info-Property-Legal-Description-Full_35` |
| Additional Buyer Line | `p01tf001_69` |
| Additional Description | `p01tf002_36` |
| Other Financing | `p01tf003_70` |
| Single Family Checkbox | `p01cb001_71` |
| One-to-Four Checkbox | `p01cb002_72` |
| Manufactured Home Checkbox | `p01cb003_73` |
| Builder Owned Checkbox | `p01cb004_74` |
| Condo/Townhome Checkbox | `p01cb005_75` |
| New Financing Checkbox | `p01cb006_76` |
| Conventional Checkbox | `p01cb007_77` |
| VA Checkbox | `p01cb008_78` |
| FHA Checkbox | `p01cb009_79` |
| USDA-RD Checkbox | `p01cb010_80` |
| USDA Direct Checkbox | `p01cb011_81` |
| USDA Lender Checkbox | `p01cb012_82` |
| Other Financing Checkbox | `p01cb013_83` |
| Loan Assumption Checkbox | `p01cb014_84` |
| Cash Purchase Checkbox | `p01cb015_85` |

---

## NEXT STEP: Discover Remaining Field Names

To get the actual field names for pages 2-18, we need to:

1. **Run Playwright script** to scroll through all 18 pages
2. **Extract field names** using JavaScript in browser console
3. **Update this mapping** with actual field names

### Script to Extract All Field Names:
```javascript
// Run this in browser console while form is open
const allInputs = document.querySelectorAll('input, textarea, select');
const fieldMap = [];
allInputs.forEach(el => {
  if (el.name && el.offsetParent !== null) { // visible elements only
    fieldMap.push({
      name: el.name,
      type: el.type || el.tagName.toLowerCase(),
      value: el.value
    });
  }
});
console.log(JSON.stringify(fieldMap, null, 2));
```

---

## Total Estimated Fields

| Page | Text Fields | Checkboxes | Signatures | Total |
|------|-------------|------------|------------|-------|
| 1 | 6 | 15 | 0 | 21 |
| 2 | 1 | 1 | 0 | 2 |
| 3 | 0 | 5 | 0 | 5 |
| 4 | 6 | 7 | 0 | 13 |
| 5 | 1 | 3 | 0 | 4 |
| 6 | 4 | 6 | 0 | 10 |
| 7 | 9 | 6 | 0 | 15 |
| 8 | 7 | 6 | 0 | 13 |
| 9 | 0 | 0 | 0 | 0 |
| 10 | 0 | 7 | 0 | 7 |
| 11 | 1 | 5 | 0 | 6 |
| 12 | 3 | 0 | 0 | 3 |
| 13 | 0 | 3 | 0 | 3 |
| 14 | 5 | 0 | 0 | 5 |
| 15 | 0 | 8 | 0 | 8 |
| 16 | 4 | 2 | 0 | 6 |
| 17 | 10 | 5 | 4 | 19 |
| 18 | 20 | 0 | 4 | 24 |
| **TOTAL** | **77** | **79** | **8** | **164** |

---

*Last Updated: 2026-01-12*
