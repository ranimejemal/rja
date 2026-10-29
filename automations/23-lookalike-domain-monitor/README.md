# Lookalike Domain Monitor

## What it does
- **Daily search:** every day the workflow searches public **Certificate Transparency** logs (crt.sh) for new domains that contain or imitate your brand: `acme-login.com`, `acrne.com`, or punycode lookalikes such as `xn--acme-...`. Attackers usually get a certificate for a phishing site before they use it, so it shows up here early.
- **Ignored:** your own domains, their subdomains, and anything on the allowlist.
- **Risk level:** each domain gets a **risk level** with reasons: contains the brand, looks like it, uses lookalike characters, or contains phishing words such as login, secure or verify.
- **Log and alert:** new domains are logged and emailed. The first run lists every existing match; after that, only new ones.

## Setup
1. Import `workflow.json` and fill in **Settings**:
   - **Brand domains:** for example `acme.com`.
   - **Search terms:** at least 4 letters each, usually the brand name.
   - **Allowlist:** partner domains that are fine.
   - **Alert email.**
2. In the Google Sheet, create a tab named **Lookalike domains** with the columns from `lookalike-domains-sheet.csv`.
3. Connect Google Sheets and Gmail. Activate.

What to do with a high-risk domain: block it in your email filter and web proxy, warn staff, and report it to the registrar or hosting provider.
