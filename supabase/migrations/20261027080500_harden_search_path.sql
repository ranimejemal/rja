-- Pin search_path on the remaining helper functions (Supabase security advisor 0011).
alter function forbid_ledger_changes() set search_path = public;
alter function split_price(integer, integer) set search_path = public;
alter function product_search_text(text, text, text[], text[]) set search_path = public;
alter function reject_demo_items() set search_path = public;

-- Newsletter sign-ups are written by the server only; no client access is intended.
comment on table newsletter_subscribers is 'Written by the server with the service role; no client policies by design.';
