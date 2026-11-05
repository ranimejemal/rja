-- Defence in depth: Supabase grants EXECUTE on new functions to anon by default. These functions already refuse
-- visitors who are not signed in (they check auth.uid() or is_admin()), but they are not meant to be callable
-- without an account at all. Visitors keep record_page_view, unsubscribe_marketing and submit_quote_request.
revoke execute on function
  admin_users(), admin_analytics(integer), claim_promotion(), finish_promotion_send(uuid, boolean, text),
  set_marketing_opt_in(boolean), can_use_product(uuid), save_configuration(uuid, jsonb)
from anon;
