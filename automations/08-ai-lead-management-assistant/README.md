# AI Lead Management Assistant

## What it does
- **Inbox:** every new email in the inbox (promotions and social excluded) is read.
- **Website form:** enquiries posted to the *Website form webhook* are handled the same way.
- **Sorting:** the AI picks a category (your list in Settings) and a priority (high, normal or low), writes a one-line summary, and spots spam.
- **Logging:** every enquiry is saved in the **Enquiries** sheet.
- **Reply draft:** a reply is drafted in Gmail, in the same thread for emails, for you to check and send. Nothing is sent automatically.
- **Alerts:** high-priority enquiries are emailed to the team.

## Setup
1. Import `workflow.json` and fill in **Settings**: business name, description, categories, sender name, team email, sheet URL.
2. In the Google Sheet, create a tab named **Enquiries** with the columns from `enquiries-sheet.csv`.
3. Connect Gmail (trigger, *Draft the reply*, *Alert the team*), Google Sheets and OpenAI.
4. Optional: point the website form to the webhook's production URL. Common field names are recognized.
5. Activate.
