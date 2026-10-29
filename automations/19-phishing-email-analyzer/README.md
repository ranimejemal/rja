# Phishing Email Analyzer

## What it does
- **Reporting:** employees forward any suspicious email to one reporting mailbox, for example `phishing@yourcompany.com`.
- **Link checks:** each link in the email (up to 5) is checked on **VirusTotal**.
- **Verdict:** the AI judges the email (**phishing**, **suspicious**, **spam** or **safe**) from its content, the claimed sender and the links. A link that VirusTotal flags as malicious always makes it **phishing**.
- **Answer:** within minutes the employee gets a reply with the verdict and what to do.
- **Alerts:** phishing and suspicious reports are emailed to the security team with concrete actions (block the domain, search other mailboxes, reset the password if someone clicked).
- **Log:** every report goes into the **Phishing reports** sheet.

## Setup
1. Create the reporting mailbox (a Google Workspace user or group) and tell staff to forward suspicious emails there.
2. Import `workflow.json` and fill in **Settings**.
3. In the Google Sheet, create a tab named **Phishing reports** with the columns from `phishing-reports-sheet.csv`.
4. Connect:
   - Gmail on the reporting mailbox, for the trigger and the two email nodes.
   - VirusTotal: a free API key gives 4 lookups a minute.
   - OpenAI and Google Sheets.
5. Activate.
