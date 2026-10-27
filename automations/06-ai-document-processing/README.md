# AI Document Processing

**Sells to:** accounting firms, property businesses. **Price to test:** $300–$2,000 setup.

## What it does
- **Collects documents:**
  - **Email:** every 5 minutes, new emails with PDF, JPG or PNG attachments (small images like logos are skipped).
  - **Upload form:** shareable, takes several files at once.
- **Extracts the data:** the AI reads each document, including scans and photos, and pulls out:
  - supplier and VAT ID
  - invoice number, date and due date
  - currency, subtotal, VAT and total
  - line items
- **Checks the data:** missing fields, subtotal + VAT ≠ total, line items that don't add up, low-confidence readings.
- **Files and logs:**
  - Saves the document to a Google Drive folder as `date_supplier_number.pdf`.
  - Logs a row in the **Documents** sheet with status *ok* or *needs review*.
  - Emails the team about anything that needs review.

## Setup
1. Import `workflow.json` and fill in **Settings**: sheet URL, Drive folder ID (the last part of the folder URL), team email.
2. In the Google Sheet, create a tab named **Documents** with the columns from `documents-sheet.csv`.
3. Connect Gmail (trigger and *Ask for a review*), OpenAI, Google Drive and Google Sheets.
4. To limit it to one mailbox label or sender, edit the search in *Document received by email*
   (for example `label:invoices has:attachment`).
5. Activate. Share the *Upload form* production URL with the client.

**Upsell:** send the checked data on to Xero or QuickBooks (n8n has nodes for both).
