# Data Breach Monitor (Have I Been Pwned)

## What it does
- **Weekly check:** every Monday each email address in Settings is checked against **Have I Been Pwned**.
- **New breaches only:** a breach already reported for an address isn't reported again.
- **Log and advice:** each new breach is logged with the kind of data exposed and clear advice. For example, if passwords were exposed: change the password everywhere it was reused and turn on two-factor authentication.
- **Summary:** the security contact gets a summary, with "passwords exposed" flagged in the subject.
- **Personal notices (optional, `notifyPeople`):** each affected person gets a short personal email.

## Setup
1. Buy a Have I Been Pwned API key at haveibeenpwned.com/API/Key. The smallest plan is enough for a small team, and the workflow waits 6.5 s between lookups to stay within it.
2. In n8n, create a **Header Auth** credential: name `hibp-api-key`, value = the key. Select it on *Have I Been Pwned*.
3. Import `workflow.json` and fill in **Settings** (one email per line).
4. In the Google Sheet, create a tab named **Breaches** with the columns from `breaches-sheet.csv`.
5. Connect Google Sheets and Gmail. Activate.
