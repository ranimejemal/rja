# Customer Support Ticket Triage

## What it does
- **Triage:** every email reaching the support inbox is read. The AI picks a category, urgency (urgent, high, normal, low), sentiment and language, and writes a one-line summary.
- **Logging:** each email becomes a ticket in the **Tickets** sheet (status *new*).
- **Reply draft:** a suggested reply is drafted in the same Gmail thread, based only on the policies in Settings. Nothing is sent automatically.
- **Alerts:** urgent and high-urgency tickets are emailed to the person on duty.

## Setup
1. Import `workflow.json` and fill in **Settings**: categories, your real policies (returns, refunds, delivery…), sender name, on-duty email, sheet URL.
2. In the Google Sheet, create a tab named **Tickets** with the columns from `tickets-sheet.csv`.
3. Connect Gmail (on the support mailbox), Google Sheets and OpenAI. Activate.
