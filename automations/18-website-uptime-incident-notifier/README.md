# Website Uptime & Incident Notifier

## What it does
- **Checks:** every 5 minutes each site in Settings is checked. A site is *down* on an error status, no response within 15 s, or when a required text is missing from the page (for example "Add to cart").
- **Down alert:** after `confirmFailures` failed checks in a row, a **DOWN** email goes out and the incident is logged.
- **Recovery:** when the site is back, a **RECOVERED** email gives the downtime in minutes.
- **Log:** the **Incidents** sheet keeps the history.

## Setup
1. Import `workflow.json` and fill in **Settings**.
   `sites` takes one site per line; add `| text` to also check that a text appears on the page.
2. In the Google Sheet, create a tab named **Incidents** with the columns from `uptime-incidents-sheet.csv`.
3. Connect Google Sheets and Gmail. Activate.

The checks run from the n8n server. If n8n itself is down, nothing is checked, so host n8n somewhere other than the sites it watches.
