/**
 * Google Apps Script for Arkansas Real Estate Contract Form
 *
 * SETUP INSTRUCTIONS:
 * 1. Go to Google Sheets and create a new spreadsheet
 * 2. Go to Extensions > Apps Script
 * 3. Delete any existing code and paste this entire script
 * 4. Click "Deploy" > "New deployment"
 * 5. Select type: "Web app"
 * 6. Set "Execute as": "Me"
 * 7. Set "Who has access": "Anyone"
 * 8. Click "Deploy" and copy the Web App URL
 * 9. Paste that URL into the contract-form.html file (replace YOUR_GOOGLE_APPS_SCRIPT_URL_HERE)
 */

// Column headers - must match form field names
const HEADERS = [
  'submission_timestamp',
  'buyer_names',
  'seller_names',
  'property_type',
  'property_address',
  'legal_description',
  'purchase_method',
  'purchase_price',
  'loan_type',
  'other_financing_details',
  'fha_min_appraised_value',
  'hud_form_received',
  'seller_loan_cost_limit',
  'closing_cost_terms',
  'agency_type',
  'earnest_money_addendum',
  'deposit_applicable',
  'deposit_amount',
  'deposit_timing_type',
  'deposit_days_after_signing',
  'deposit_timing_other',
  'title_insurance_option',
  'title_insurance_other',
  'survey_option',
  'survey_paid_by',
  'survey_other',
  'additional_fixtures',
  'items_not_conveying',
  'has_contingency',
  'contingency_description',
  'contingency_deadline',
  'escape_clause_type',
  'hours_to_remove_contingency',
  'days_to_closing_after_removal',
  'buyer_notice_address',
  'time_constraints_reference',
  'home_warranty_option',
  'warranty_company',
  'warranty_plan',
  'warranty_paid_by',
  'warranty_cost_limit',
  'warranty_other',
  'inspection_option',
  'has_hoa',
  'hoa_addendum',
  'disclosure_option',
  'termite_option',
  'termite_other',
  'lead_paint_option',
  'closing_date',
  'possession_option',
  'other_provisions',
  'licensee_disclosure',
  'licensed_party_role',
  'expiration_date',
  'expiration_time',
  'buyer1_name',
  'buyer1_datetime',
  'buyer2_name',
  'buyer2_datetime',
  'seller1_name',
  'seller1_datetime',
  'seller2_name',
  'seller2_datetime',
  'contract_status',
  'selling_firm',
  'selling_broker_name',
  'selling_broker_license',
  'selling_broker_email',
  'selling_agent_name',
  'selling_agent_license',
  'selling_agent_email',
  'selling_agent_cell',
  'listing_firm',
  'listing_broker_name',
  'listing_broker_license',
  'listing_broker_email',
  'listing_agent_name',
  'listing_agent_license',
  'listing_agent_email',
  'listing_agent_cell'
];

/**
 * Initialize the spreadsheet with headers
 * Run this function once to set up the headers
 */
function initializeSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  // Check if headers already exist
  const firstRow = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  if (firstRow[0] === HEADERS[0]) {
    Logger.log('Headers already exist');
    return;
  }

  // Set headers
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);

  // Format header row
  const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#2c5282');
  headerRange.setFontColor('white');

  // Freeze header row
  sheet.setFrozenRows(1);

  // Auto-resize columns
  for (let i = 1; i <= HEADERS.length; i++) {
    sheet.autoResizeColumn(i);
  }

  Logger.log('Sheet initialized with headers');
}

/**
 * Handle POST requests from the form
 */
function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    // Parse the incoming data
    const data = JSON.parse(e.postData.contents);

    // Create row data in correct order
    const rowData = HEADERS.map(header => data[header] || '');

    // Append to sheet
    sheet.appendRow(rowData);

    // Return success
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'success', message: 'Data added successfully' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    // Return error
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle GET requests (for testing)
 */
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      status: 'ok',
      message: 'Arkansas Real Estate Contract API is running',
      headers: HEADERS
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Get all contract data as JSON
 * Useful for retrieving data to fill PDFs
 */
function getAllContracts() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    return [];
  }

  const headers = data[0];
  const contracts = [];

  for (let i = 1; i < data.length; i++) {
    const contract = {};
    for (let j = 0; j < headers.length; j++) {
      contract[headers[j]] = data[i][j];
    }
    contracts.push(contract);
  }

  return contracts;
}

/**
 * Get a specific contract by row number
 */
function getContractByRow(rowNumber) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const headers = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  const data = sheet.getRange(rowNumber, 1, 1, HEADERS.length).getValues()[0];

  const contract = {};
  for (let i = 0; i < headers.length; i++) {
    contract[headers[i]] = data[i];
  }

  return contract;
}

/**
 * Search contracts by property address
 */
function searchByAddress(searchTerm) {
  const contracts = getAllContracts();
  return contracts.filter(c =>
    c.property_address &&
    c.property_address.toLowerCase().includes(searchTerm.toLowerCase())
  );
}

/**
 * Search contracts by buyer name
 */
function searchByBuyer(searchTerm) {
  const contracts = getAllContracts();
  return contracts.filter(c =>
    c.buyer_names &&
    c.buyer_names.toLowerCase().includes(searchTerm.toLowerCase())
  );
}

/**
 * Export contract data for PDF filling
 * Returns data formatted for common PDF form field names
 */
function exportForPDF(rowNumber) {
  const contract = getContractByRow(rowNumber);

  // Parse dates into components
  const closingDate = contract.closing_date ? new Date(contract.closing_date) : null;
  const expirationDate = contract.expiration_date ? new Date(contract.expiration_date) : null;
  const contingencyDate = contract.contingency_deadline ? new Date(contract.contingency_deadline) : null;

  // Format for PDF fields
  const pdfData = {
    // Basic parties
    'Parties': contract.buyer_names,
    'SellerNames': contract.seller_names,

    // Property
    'PropertyAddress': contract.property_address,
    'LegalDescription': contract.legal_description,

    // Purchase price
    'PurchasePrice': contract.purchase_price,
    'CashAmount': contract.purchase_method === 'Cash' ? contract.purchase_price : '',

    // Closing date components
    'ClosingMonth': closingDate ? closingDate.toLocaleString('default', { month: 'long' }) : '',
    'ClosingDay': closingDate ? closingDate.getDate() : '',
    'ClosingYear': closingDate ? closingDate.getFullYear() : '',

    // Expiration date components
    'ExpirationMonth': expirationDate ? expirationDate.toLocaleString('default', { month: 'long' }) : '',
    'ExpirationDay': expirationDate ? expirationDate.getDate() : '',
    'ExpirationYear': expirationDate ? expirationDate.getFullYear() : '',
    'ExpirationTime': contract.expiration_time || '',

    // All original data
    ...contract
  };

  return pdfData;
}

/**
 * Create a menu in Google Sheets for easy access
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Contract Tools')
    .addItem('Initialize Sheet', 'initializeSheet')
    .addItem('View All Contracts (JSON)', 'showAllContractsJSON')
    .addSeparator()
    .addItem('Export Selected Row for PDF', 'exportSelectedForPDF')
    .addToUi();
}

/**
 * Show all contracts as JSON in a dialog
 */
function showAllContractsJSON() {
  const contracts = getAllContracts();
  const html = HtmlService.createHtmlOutput(
    '<pre style="white-space: pre-wrap;">' + JSON.stringify(contracts, null, 2) + '</pre>'
  )
  .setWidth(600)
  .setHeight(400);
  SpreadsheetApp.getUi().showModalDialog(html, 'All Contracts (JSON)');
}

/**
 * Export selected row for PDF filling
 */
function exportSelectedForPDF() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const row = sheet.getActiveCell().getRow();

  if (row <= 1) {
    SpreadsheetApp.getUi().alert('Please select a data row (not the header row)');
    return;
  }

  const pdfData = exportForPDF(row);
  const html = HtmlService.createHtmlOutput(
    '<pre style="white-space: pre-wrap;">' + JSON.stringify(pdfData, null, 2) + '</pre>' +
    '<br><button onclick="navigator.clipboard.writeText(document.querySelector(\'pre\').textContent).then(() => alert(\'Copied!\'))">Copy to Clipboard</button>'
  )
  .setWidth(600)
  .setHeight(400);
  SpreadsheetApp.getUi().showModalDialog(html, 'Contract Data for PDF (Row ' + row + ')');
}
