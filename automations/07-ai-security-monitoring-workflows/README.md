# AI Security Monitoring Workflows

**Sells to:** businesses with IT infrastructure. **Price to test:** $500+ depending on scope.

## What it does
- **Receives alerts** on one webhook. Formats understood automatically:
  - Wazuh (integration JSON)
  - Grafana / Prometheus Alertmanager
  - AWS GuardDuty (EventBridge events; SNS-wrapped messages are unwrapped too)
  - any tool sending `{ "title", "severity", "host", "ip", "description" }`
- **Mutes repeats:** the same alert on the same host or IP is muted for `muteRepeatsMinutes`.
- **Checks IPs:** public IPs are looked up on **VirusTotal**.
- **Triages with AI:** severity, one-line summary, likely cause, false-positive likelihood and concrete recommended actions.
  The AI can raise the severity but never lower the severity the tool reported.
- **Logs and alerts:**
  - Everything is logged in the **Incidents** sheet.
  - **High** and **critical** alerts are emailed at once.
- **Every Monday:** a summary with counts by severity, the most affected hosts, and open high or critical alerts.

## Setup
1. Import `workflow.json` and fill in **Settings**: organisation name, alert email, sheet URL.
2. In the Google Sheet, create a tab named **Incidents** with the columns from `incidents-sheet.csv`.
   Close incidents by setting `status` to `closed`.
3. Create a **Header Auth** credential (for example name `X-Alert-Token` with a long random value) and select it on *Security alert*.
4. Connect OpenAI, VirusTotal, Google Sheets and Gmail. Activate.
5. Point the alert sources at the webhook's production URL with the same header:
   - **Wazuh:** an `<integration>` block with a custom script or the webhook integration.
   - **Alertmanager:** a `webhook_configs` receiver with `http_config.authorization` or headers.
   - **GuardDuty:** an EventBridge rule for *GuardDuty Finding* → **API destination**, whose connection uses *API key* auth with the same header name and value.

Scope work per client: which systems to connect, alert thresholds, and who gets which emails.
