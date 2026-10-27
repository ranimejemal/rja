# AI Lead Generation & Follow-up

**Sells to:** agencies, real estate, consultants. **Price to test:** $300–$1,500 setup.

## What it does
- **New lead** (website form, any webhook, or Facebook Lead Ads):
  1. Saves the lead to the **Leads** sheet.
  2. AI scores it hot, warm or cold.
  3. AI writes a first reply that invites the lead to book a call. The reply is sent (or saved as a Gmail draft when `autoSendReplies` is off).
  4. You get an email for every **hot** lead.
- **No email address:** the lead is saved as "call - no email" and you are asked to call them.
- **Every weekday at 9:00:** leads who have not replied get an AI-written follow-up every `followUpDays` days, up to `maxFollowUps` times.
- **Replies:** when a lead answers, they are marked **replied**, follow-ups stop, and you get an email.

## Setup
1. Import `workflow.json` and fill in **Settings**: business description, ideal customer, booking link, team email, sheet URL.
2. In the Google Sheet, create a tab named **Leads** with the columns from `leads-sheet.csv`.
3. Connect OpenAI, Gmail (on the email nodes and the *Lead replied by email* trigger) and Google Sheets.
4. Lead sources, any or all:
   - **Form:** share the *Production URL* of *New lead form* or embed it on the website.
   - **Webhook:** send leads as JSON to the *Website or ads webhook* production URL.
     Common field names (name, email, phone, company, message, budget) are recognized automatically.
   - **Facebook Lead Ads:** enable the node, connect Facebook, and pick the page and form.
5. Activate.

Start with `autoSendReplies` off for a few days so the client can review the drafts.
