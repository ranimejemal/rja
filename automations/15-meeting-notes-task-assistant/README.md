# Meeting Notes & Task Assistant

## What it does
- **Input:** paste a transcript or rough notes in the form, or send them to the webhook from your recording tool as JSON: `{ "title", "date", "attendees": ["a@x.com"], "transcript" }`.
- **Notes:** the AI writes the summary, decisions, action items (with owner and due date when they were said) and open questions.
- **Email:** the notes are emailed to the attendees and to `notesEmail`.
- **Tasks:** every action item is added to the **Tasks** sheet.

## Setup
1. Import `workflow.json` and fill in **Settings**.
2. In the Google Sheet, create a tab named **Tasks** with the columns from `tasks-sheet.csv`.
3. Connect OpenAI, Gmail and Google Sheets.
4. Activate and share the form URL.
