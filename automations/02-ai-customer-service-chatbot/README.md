# AI Customer Service Chatbot

**Sells to:** e-commerce and service businesses. **Price to test:** $200–$1,000 setup.

## What it does
- Answers customers 24/7 in their own language, **only from the client's FAQ sheet**. It never makes up prices or policies.
- When the customer asks for a person, is upset, or needs something it cannot do, it collects their contact details and emails the team (*handoff_to_team*).
- Logs every question and answer in the **Conversations** tab, so the client can see what customers ask and improve the FAQ.

## Setup
1. Import `workflow.json` and fill in **Settings**: business name, description, opening hours, contact details, tone, team email, sheet URL.
2. In the Google Sheet, create the tabs **FAQ** (`faq-sheet.csv`) and **Conversations** (`conversations-sheet.csv`).
   Fill in the FAQ with the client's real questions and answers. This is what the bot knows.
3. Connect OpenAI (on *OpenAI chat model*), Google Sheets (*faq*, *Log conversation*) and Gmail (*handoff_to_team*).
4. In the **Chat** node, change the welcome message and title. Activate.
5. Share the chat URL from the Chat node, or embed it on the website with the snippet n8n shows (*Embedded chat*).
   Set *Allowed origins* to the client's domain.

**Upsell:** order-status lookups (Shopify or WooCommerce tool), or WhatsApp and Instagram channels.
