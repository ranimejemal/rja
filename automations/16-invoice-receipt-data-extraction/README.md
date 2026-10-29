# Invoice & Receipt Data Extraction (Google Drive)

## What it does
- **Inbox folder:** watches a Google Drive folder for new invoices and receipts (PDF, JPG, PNG, scans and photos included).
- **Extraction:** the AI pulls out supplier, VAT ID, number, dates, currency, subtotal, VAT, total and line items.
- **Checks:** missing fields, totals that don't add up, and low-confidence readings are flagged.
- **Filing:** the data is logged in the **Documents** sheet and the file is moved to the *processed* folder.
- **Review:** anything flagged is emailed for review.

For documents that arrive by email, use automation 06; both share the same extraction and checks.

## Setup
1. Create two Drive folders: *Inbox* and *Processed*.
2. Import `workflow.json`. In **Watch the inbox folder**, enter the *Inbox* folder ID (the last part of its URL).
3. In **Settings**, enter the *Processed* folder ID, team email and sheet URL.
4. In the Google Sheet, create a tab named **Documents** with the columns from `documents-sheet.csv`.
5. Connect Google Drive, Google Sheets, Gmail and OpenAI. Activate.
