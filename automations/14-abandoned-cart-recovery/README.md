# Abandoned Cart Recovery (Shopify)

## What it does
- **Carts:** every Shopify checkout is saved in the **Carts** sheet.
- **Recovered carts:** when the customer completes the order, the cart is marked *recovered*.
- **Reminders:** every hour, carts left open get an email: the first after `firstDelayHours`, then every `repeatHours`, up to `maxReminders`.
- **Writing:** the AI writes each email from the items in the cart, in your brand voice, with the link to finish the order.
- **Discount:** an optional code is offered only from the second reminder.

Only email customers who have agreed to receive marketing emails where the law requires it (for example GDPR in the EU).

## Setup
1. Import `workflow.json` and fill in **Settings**: store name, voice, language, timings, optional discount, sheet URL.
2. In the Google Sheet, create a tab named **Carts** with the columns from `carts-sheet.csv`.
3. Connect Shopify (custom app access token with `read_checkouts` and `read_orders`) on the three Shopify triggers, plus Google Sheets, Gmail and OpenAI.
4. Activate.
