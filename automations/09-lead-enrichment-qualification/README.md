# Lead Enrichment & Qualification

## What it does
- **Website:** for each new lead (webhook or form), the workflow reads the company's website. It uses the *website* field, or the email's domain when it isn't a free mail address like Gmail.
- **Enrichment:** the AI describes the company (name, industry, size, what they do) from the website and the lead's message.
- **Scoring:** the AI gives a **fit score** (0 to 100) against your ideal customer.
- **Logging:** every lead goes into the **Leads** sheet.
- **Routing:** leads scoring at least `minFitScore` are emailed to a salesperson, chosen by `routingRules` (one per line: `keyword = email`), or `defaultOwner` when no rule matches.

## Setup
1. Import `workflow.json` and fill in **Settings**: ideal customer, minimum score, routing rules, default owner, sheet URL.
2. In the Google Sheet, create a tab named **Leads** with the columns from `enriched-leads-sheet.csv`.
3. Connect OpenAI, Google Sheets and Gmail.
4. Send leads to the webhook (JSON with name, email, company, website, message) or share the form. Activate.
