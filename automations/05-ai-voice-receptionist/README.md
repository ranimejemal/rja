# AI Voice Receptionist (Vapi)

**Sells to:** hotels, restaurants, service businesses. **Price to test:** $300–$1,500 setup.

## How it fits together
The phone agent runs on **Vapi** (voice, speech recognition, phone number). When the agent needs to do something,
Vapi calls this n8n workflow:
- `check_availability`: free start times on a day, from Google Calendar and the opening hours in Settings.
- `book_appointment`: checks the time is still free, then creates the calendar event.
- `take_message`: emails the message, with the caller's number, to the team.
- **End of call:** each call is logged in the **Calls** sheet (summary, transcript, recording link) and the summary is emailed.

## Setup
1. **n8n**:
   1. Import `workflow.json` and fill in **Settings**: calendar ID, time zone, opening days (1 = Monday … 7 = Sunday), hours, slot length, team email, sheet URL.
   2. Create a **Header Auth** credential: name `x-vapi-secret`, value = a long random secret. Select it on both webhooks.
   3. Connect Google Calendar, Google Sheets (tab **Calls**, columns in `calls-sheet.csv`) and Gmail.
   4. Activate and copy the two **production** webhook URLs.
2. **Vapi**: create an assistant from `vapi-assistant.json` (API) or copy the same settings in the dashboard:
   - Replace the business details in the system prompt.
   - Replace `YOUR-N8N-DOMAIN` with the n8n domain, and `SAME-SECRET-AS-N8N-HEADER-AUTH` with the secret.
   - Pick a voice and language.
   - Attach a phone number (buy one in Vapi or import a Twilio number) and forward the business line to it.
   - Check the field names against Vapi's current docs when you create the assistant.
3. Call the number and test a booking and a message.

Vapi call minutes and the phone number are billed by Vapi to the client.
