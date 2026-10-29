# E-commerce Order & Inventory Sync

## What it does
- **Orders:** each new **Shopify** or **WooCommerce** order is logged in the **Orders** sheet.
- **Stock:** the stock of every SKU sold is reduced in the **Inventory** sheet.
- **Alerts:** one email when a product reaches its `low_stock_threshold`, or when an order contains a SKU that isn't in the inventory sheet.

Refunds, cancellations and restocks are not handled automatically: adjust the stock in the sheet.

## Setup
1. Import `workflow.json` and fill in **Settings**.
2. In the Google Sheet, create **Inventory** (`inventory-sheet.csv`: one row per SKU, using the same SKUs as the store) and **Orders** (`orders-sheet.csv`).
3. Shopify: create a custom app with `read_orders`, connect it with its access token, and keep *New Shopify order*.
   WooCommerce: connect a REST API key and keep *New WooCommerce order*. Disable the trigger you don't use.
4. Connect Google Sheets and Gmail. Activate.
