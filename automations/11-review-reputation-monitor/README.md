# Review & Reputation Monitor

## What it does
- **Daily check:** every morning it reads your Google Business reviews through the Google Places API and keeps the ones it hasn't seen before.
- **Analysis:** for each new review, the AI rates the sentiment, writes a summary and topics, and drafts a public reply. The reply never offers compensation or admits fault.
- **Logging:** reviews are saved in the **Reviews** sheet.
- **Alerts:** you get an immediate email for low ratings (`lowRating` stars or less), with the suggested reply.
- **Digest:** a daily digest email lists all new reviews.

Google returns up to 5 reviews per check (the most relevant ones), so a very busy place can miss some.
Replies must be posted by you on Google Business Profile.

## Setup
1. Find the business's Place ID with Google's *Place ID Finder*.
2. In Google Cloud, enable **Places API (New)** and create an API key.
3. In n8n, create a **Header Auth** credential: name `X-Goog-Api-Key`, value = the key. Select it on *Get Google reviews*.
4. Import `workflow.json` and fill in **Settings**.
5. In the Google Sheet, create a tab named **Reviews** with the columns from `reviews-sheet.csv`.
6. Connect OpenAI, Google Sheets and Gmail. Activate.
