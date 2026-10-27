# AI Appointment Booking

**Sells to:** salons, clinics, consultants. **Price to test:** $200–$800 setup.

## What it does
- A chat assistant checks **real availability** in Google Calendar, offers free times inside opening hours, and books.
  It collects the service, name, email and phone. The customer gets a calendar invitation.
- Customers can **move or cancel**: the assistant finds their booking by email and cancels it, notifying them.
- **Every hour**, appointments starting in 24 hours get a **reminder email** (`reminderHoursBefore`).

## Setup
1. Import `workflow.json` and fill in **Settings**:
   - services (with durations), address
   - `calendarId` (Google Calendar → Settings → *Integrate calendar*; `primary` = main calendar)
   - time zone, opening days and hours, slot length
2. Connect OpenAI and Google Calendar (on the model and the four calendar tools, plus *Upcoming appointments*), and Gmail (*Send reminder*).
3. In the **Chat** node, adjust the welcome message. Activate.
4. Share the chat URL or embed it on the website (*Embedded chat* in the Chat node).

Block time off in the calendar (holidays, breaks) as normal events; the assistant treats them as busy.
**Upsell:** SMS or WhatsApp reminders with Twilio.
