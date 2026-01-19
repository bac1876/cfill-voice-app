# Arkansas Real Estate Contract - Form & Google Sheets Setup Guide

## Overview

This system has three components:
1. **HTML Form** (`contract-form.html`) - Web form for data entry
2. **Google Apps Script** (`google-apps-script.js`) - Backend to receive data
3. **Google Sheets** - Database to store all contract data

---

## Step 1: Create the Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Click **+ Blank** to create a new spreadsheet
3. Name it something like "Real Estate Contracts Database"

---

## Step 2: Add the Google Apps Script

1. In your new Google Sheet, go to **Extensions > Apps Script**
2. Delete any existing code in the editor
3. Open the file `google-apps-script.js` from this folder
4. Copy ALL the code and paste it into the Apps Script editor
5. Click the **Save** icon (or Ctrl+S)
6. Name the project "Contract Form Handler"

---

## Step 3: Initialize the Sheet Headers

1. In the Apps Script editor, select **initializeSheet** from the function dropdown (near the Run button)
2. Click **Run**
3. When prompted, click **Review Permissions**
4. Select your Google account
5. Click **Advanced** > **Go to Contract Form Handler (unsafe)**
6. Click **Allow**
7. Go back to your Google Sheet - you should see all the column headers

---

## Step 4: Deploy the Web App

1. In Apps Script, click **Deploy > New deployment**
2. Click the gear icon next to "Select type" and choose **Web app**
3. Fill in:
   - **Description**: "Contract Form Handler v1"
   - **Execute as**: Me
   - **Who has access**: Anyone
4. Click **Deploy**
5. **COPY THE WEB APP URL** - you'll need this!

---

## Step 5: Configure the HTML Form

1. Open `contract-form.html` in a text editor
2. Find this line near the bottom:
   ```javascript
   const GOOGLE_SCRIPT_URL = 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE';
   ```
3. Replace `YOUR_GOOGLE_APPS_SCRIPT_URL_HERE` with the URL you copied
4. Save the file

---

## Step 6: Use the Form

### Option A: Open Locally
- Double-click `contract-form.html` to open in your browser
- Fill out the form
- Click "Submit to Google Sheets"
- Data appears in your Google Sheet!

### Option B: Host Online (for sharing)
- Upload `contract-form.html` to GitHub Pages, Netlify, or any web host
- Share the URL with anyone who needs to enter contract data

---

## Using the System

### Entering Data
1. Open the form in a browser
2. Fill in all required fields (marked with *)
3. Click "Submit to Google Sheets"
4. Data is automatically saved to your Google Sheet

### Exporting Data
- **Export JSON**: Click to get all form data as JSON
- **Export CSV**: Click to get data as comma-separated values
- Use these exports for manual entry or backup

### Auto-Save
- The form automatically saves to your browser's local storage every 30 seconds
- If you close the browser, your data will be restored when you reopen

---

## Google Sheet Features

Once you have data in your Google Sheet:

### Custom Menu
A **Contract Tools** menu appears with:
- **Initialize Sheet** - Reset headers
- **View All Contracts (JSON)** - See all data as JSON
- **Export Selected Row for PDF** - Get a specific row ready for PDF filling

### Search Functions
You can use these in Apps Script or create custom formulas:
- `searchByAddress("Main St")` - Find contracts by address
- `searchByBuyer("Smith")` - Find contracts by buyer name
- `exportForPDF(2)` - Get row 2 formatted for PDF filling

---

## Next Steps: PDF Filling

To fill the actual PDF contract with your Google Sheet data, you have options:

### Option 1: Manual Copy
1. Select a row in Google Sheets
2. Use the **Contract Tools > Export Selected Row for PDF** menu
3. Copy the values into the PDF form manually

### Option 2: Automated PDF Filling (Advanced)
We can build a system using:
- **pdf-lib** (JavaScript library)
- **PyPDF2** (Python library)
- **DocuSign** or **Adobe Sign** API

Let me know if you want me to build the automated PDF filling component!

---

## Troubleshooting

### Form won't submit
- Check that you replaced the Google Script URL correctly
- Make sure the Apps Script is deployed
- Check browser console for errors (F12 > Console)

### Data not appearing in Sheet
- Verify the web app deployment is set to "Anyone"
- Try re-deploying with a new version
- Check Apps Script execution logs (View > Executions)

### Headers are missing
- Run the `initializeSheet` function again

---

## File Summary

| File | Purpose |
|------|---------|
| `contract-form.html` | Web form for data entry |
| `google-apps-script.js` | Backend code for Google Sheets |
| `Real Estate Contract Residential.pdf` | Original contract template |
| `SETUP-GUIDE.md` | This guide |

---

## Support

If you need help with:
- **Setting up Google Sheets** - Follow this guide step by step
- **Customizing the form** - Edit the HTML file
- **Automated PDF filling** - Let me know and I'll build it
- **Additional fields** - Add to both the HTML form and Apps Script headers
