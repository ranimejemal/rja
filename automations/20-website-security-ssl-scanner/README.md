# Website Security & SSL Scanner

## What it does
- **Weekly scan:** every Monday each website in Settings is checked:
  - Reachable over **HTTPS**, and **HTTP redirects to HTTPS**.
  - **Security headers**: HSTS, Content-Security-Policy, clickjacking protection, X-Content-Type-Options, Referrer-Policy and Permissions-Policy.
  - **No software versions leaked** in headers.
  - **Cookies** set with Secure and HttpOnly.
  - **Certificate expiry**, from public Certificate Transparency logs.
- **Grade and fixes:** each site gets a **grade from A to F** and a list of exact fixes.
- **Results:** the results are logged and emailed. A certificate close to expiry puts "Certificate expiring soon" in the subject.
- **On demand:** the **Scan a website** form runs the same check for any URL and emails the report to whoever asked. It also works as a free lead magnet on your site.

All checks are **passive**: the workflow reads public responses like a browser does and never attacks or stresses the site.

## Setup
1. Import `workflow.json` and fill in **Settings**: sites (one per line), report email, certificate warning days.
2. In the Google Sheet, create a tab named **Scans** with the columns from `scans-sheet.csv`.
3. Connect Google Sheets and Gmail. Activate.
4. Optional: share the form's production URL as a "free security check".
