# Product Requirements Document (PRD)
# Arkansas Real Estate Contract Auto-Filler

**Version:** 1.0
**Date:** January 12, 2026
**Status:** Draft

---

## 1. Overview

### 1.1 Purpose
Build an automation tool that logs into the Arkansas REALTORS Form Simplicity platform, fills out the Real Estate Contract (Residential) form with data from a Google Sheet, and saves the completed contract.

### 1.2 Problem Statement
Manually entering contract data into Form Simplicity is time-consuming and error-prone. Real estate agents need to re-enter the same information repeatedly, leading to inefficiency and potential mistakes.

### 1.3 Solution
An automated system that:
1. Reads contract data from a Google Sheet
2. Logs into Form Simplicity
3. Navigates to the contract form
4. Fills all fields automatically
5. Saves the completed contract

---

## 2. Target Platform

### 2.1 Website Details
- **URL:** https://ara.formsimplicity.com
- **Platform:** Form Simplicity (Arkansas REALTORS Association)
- **Form:** Real Estate Contract (Residential) - 18 pages

### 2.2 Authentication
- **Login URL:** https://ara.formsimplicity.com (or specific login page)
- **Username:** 116211010
- **Password:** lbbc2245
- **Auth Type:** Standard username/password form

---

## 3. Functional Requirements

### 3.1 Authentication Module

| ID | Requirement | Priority |
|----|-------------|----------|
| AUTH-01 | Navigate to Form Simplicity login page | High |
| AUTH-02 | Enter username in login field | High |
| AUTH-03 | Enter password in password field | High |
| AUTH-04 | Click login/submit button | High |
| AUTH-05 | Verify successful login (check for dashboard or error) | High |
| AUTH-06 | Handle login failures gracefully with error message | High |
| AUTH-07 | Handle MFA/2FA if prompted (alert user) | Medium |

### 3.2 Navigation Module

| ID | Requirement | Priority |
|----|-------------|----------|
| NAV-01 | Navigate to contract creation page after login | High |
| NAV-02 | Select "Real Estate Contract (Residential)" form | High |
| NAV-03 | Wait for form to fully load before filling | High |
| NAV-04 | Handle any pop-ups or modals that appear | Medium |

### 3.3 Data Input Module

| ID | Requirement | Priority |
|----|-------------|----------|
| DATA-01 | Read contract data from Google Sheet (specific row) | High |
| DATA-02 | Map Google Sheet columns to form fields | High |
| DATA-03 | Support all 87 identified form fields | High |
| DATA-04 | Handle text input fields | High |
| DATA-05 | Handle dropdown/select fields | High |
| DATA-06 | Handle checkbox fields | High |
| DATA-07 | Handle radio button fields | High |
| DATA-08 | Handle date picker fields | High |
| DATA-09 | Handle multi-page form navigation | High |
| DATA-10 | Skip empty/null values gracefully | Medium |

### 3.4 Form Filling Module

| ID | Requirement | Priority |
|----|-------------|----------|
| FILL-01 | Fill Page 1: Parties & Property Information | High |
| FILL-02 | Fill Page 1: Purchase Price & Financing | High |
| FILL-03 | Fill Page 3: Agency Selection | High |
| FILL-04 | Fill Page 4: Loan Costs & Earnest Money | High |
| FILL-05 | Fill Page 4: Non-Refundable Deposit | High |
| FILL-06 | Fill Page 5: Title Requirements | High |
| FILL-07 | Fill Page 6: Survey & Fixtures | High |
| FILL-08 | Fill Page 7: Other Contingency | High |
| FILL-09 | Fill Page 8: Home Warranty & Inspection | High |
| FILL-10 | Fill Page 10: HOA & Seller Disclosure | High |
| FILL-11 | Fill Page 11: Termite & Lead Paint | High |
| FILL-12 | Fill Page 12: Closing Date | High |
| FILL-13 | Fill Page 13: Possession | High |
| FILL-14 | Fill Page 14: Other Provisions | High |
| FILL-15 | Fill Page 15: Licensee Disclosure | High |
| FILL-16 | Fill Page 16: Expiration Date/Time | High |
| FILL-17 | Fill Page 18: Broker/Agent Information | High |

### 3.5 Save Module

| ID | Requirement | Priority |
|----|-------------|----------|
| SAVE-01 | Click save button after filling | High |
| SAVE-02 | Verify save was successful | High |
| SAVE-03 | Capture/log the saved contract ID or reference | Medium |
| SAVE-04 | Option to download PDF after save | Medium |
| SAVE-05 | Update Google Sheet with "Filled" status | Low |

---

## 4. Technical Architecture

### 4.1 Technology Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Automation | Playwright | Modern, reliable, handles SPAs well |
| Language | Python or Node.js | TBD based on preference |
| Data Source | Google Sheets API | Already set up from previous work |
| Configuration | .env file | Store credentials securely |

### 4.2 Project Structure

```
cfill2026/
├── src/
│   ├── auth.js          # Login/authentication
│   ├── navigation.js    # Page navigation
│   ├── formFiller.js    # Form field mapping & filling
│   ├── dataSources.js   # Google Sheets integration
│   └── main.js          # Entry point
├── config/
│   ├── fieldMappings.json   # Form field to data mapping
│   └── selectors.json       # CSS/XPath selectors for form
├── .env                 # Credentials (gitignored)
├── package.json
└── README.md
```

### 4.3 Configuration (.env)

```env
# Form Simplicity Credentials
FS_USERNAME=116211010
FS_PASSWORD=lbbc2245
FS_LOGIN_URL=https://ara.formsimplicity.com

# Google Sheets
GOOGLE_SHEET_ID=your_sheet_id_here
GOOGLE_CREDENTIALS_PATH=./credentials.json
```

---

## 5. Field Mapping

### 5.1 Field Mapping Strategy

Each form field needs:
1. **Google Sheet Column** - Where data comes from
2. **Form Selector** - How to find the field (CSS/XPath)
3. **Field Type** - text, select, checkbox, radio, date
4. **Transformation** - Any data formatting needed

### 5.2 Sample Field Mappings

| Sheet Column | Form Field Name | Selector (TBD) | Type |
|--------------|-----------------|----------------|------|
| buyer_names | Parties (Buyer) | #buyer-field or [name="parties"] | text |
| property_type | Property Type | input[value="Single Family"] | radio |
| property_address | Address | #address or [name="address"] | text |
| purchase_price | Purchase Price | #price or [name="purchasePrice"] | text |
| loan_type | Loan Type | select[name="loanType"] | select |
| closing_date | Closing Date | #closingDate | date |

*Note: Actual selectors will be determined during development by inspecting the Form Simplicity interface.*

---

## 6. User Workflow

### 6.1 Happy Path

```
1. User enters contract data in Google Sheet (or web form)
2. User runs the automation tool
3. Tool logs into Form Simplicity
4. Tool navigates to contract form
5. Tool fills all fields from Google Sheet data
6. Tool saves the contract
7. User receives confirmation with contract ID
```

### 6.2 Workflow Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Google     │     │  Contract   │     │    Form     │
│  Sheet      │────▶│  Filler     │────▶│  Simplicity │
│  (Data)     │     │  (Tool)     │     │  (Website)  │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   Saved     │
                    │  Contract   │
                    └─────────────┘
```

---

## 7. Error Handling

### 7.1 Error Scenarios

| Scenario | Handling |
|----------|----------|
| Login failed | Retry once, then alert user with error message |
| Form field not found | Log warning, skip field, continue |
| Page timeout | Retry navigation, alert if persistent |
| Session expired | Re-authenticate and continue |
| Invalid data format | Log error, skip field with warning |
| Form validation error | Capture error message, report to user |

### 7.2 Logging

- Log all actions with timestamps
- Capture screenshots on errors
- Save logs to file for debugging

---

## 8. Security Considerations

### 8.1 Credential Storage
- Store credentials in `.env` file
- Add `.env` to `.gitignore`
- Never commit credentials to version control

### 8.2 Future Improvements
- Implement secure credential vault
- Add session token caching
- Consider OAuth if platform supports it

### 8.3 Current Approach (Development Phase)
For simplicity during development, credentials are stored in plain text configuration. This is acceptable for personal use but should be improved before any production or shared use.

---

## 9. Testing Requirements

### 9.1 Test Cases

| ID | Test Case | Expected Result |
|----|-----------|-----------------|
| TC-01 | Login with valid credentials | Dashboard loads |
| TC-02 | Login with invalid credentials | Error message shown |
| TC-03 | Fill single text field | Field populated correctly |
| TC-04 | Fill dropdown field | Correct option selected |
| TC-05 | Fill checkbox field | Checkbox checked |
| TC-06 | Fill complete form | All fields populated |
| TC-07 | Save filled form | Contract saved successfully |
| TC-08 | Handle missing data | Skips empty fields gracefully |

---

## 10. Implementation Phases

### Phase 1: Discovery & Setup (Current)
- [x] Analyze PDF contract structure
- [x] Identify all form fields (87 fields)
- [x] Create data collection form
- [x] Set up Google Sheets integration
- [ ] Inspect Form Simplicity UI to get field selectors

### Phase 2: Authentication
- [ ] Implement login automation
- [ ] Handle login success/failure
- [ ] Test with provided credentials

### Phase 3: Form Filling
- [ ] Map all form fields to selectors
- [ ] Implement field type handlers (text, select, radio, etc.)
- [ ] Test individual field filling
- [ ] Test complete form filling

### Phase 4: Save & Verify
- [ ] Implement save functionality
- [ ] Verify successful save
- [ ] Capture contract reference

### Phase 5: Polish & Error Handling
- [ ] Add comprehensive error handling
- [ ] Add logging and screenshots
- [ ] Create user documentation
- [ ] Test edge cases

---

## 11. Success Metrics

| Metric | Target |
|--------|--------|
| Login success rate | 99%+ |
| Field fill accuracy | 100% |
| End-to-end completion rate | 95%+ |
| Time to fill contract | < 60 seconds |
| Error recovery rate | 90%+ |

---

## 12. Dependencies

### 12.1 External Dependencies
- Form Simplicity platform availability
- Google Sheets API access
- Stable internet connection

### 12.2 Technical Dependencies
- Node.js 18+ or Python 3.10+
- Playwright browser automation
- Google API credentials

---

## 13. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Form Simplicity UI changes | High | Use robust selectors, add monitoring |
| CAPTCHA on login | High | Alert user for manual intervention |
| Rate limiting | Medium | Add delays between actions |
| Session timeouts | Medium | Implement re-authentication |
| Field selector changes | Medium | Centralize selectors in config file |

---

## 14. Appendix

### 14.1 Form Simplicity Credentials
- **URL:** https://ara.formsimplicity.com
- **Username:** 116211010
- **Password:** lbbc2245

### 14.2 Related Documents
- `contract-form.html` - Web form for data entry
- `google-apps-script.js` - Google Sheets backend
- `Real Estate Contract Residential.pdf` - Original contract

### 14.3 Field Reference
See the questionnaire in the previous work for all 87 form fields and their Google Sheet column mappings.

---

## 15. Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Owner | | | |
| Developer | | | |
| Stakeholder | | | |

---

*Document created: January 12, 2026*
