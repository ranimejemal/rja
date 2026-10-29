-- Remove the "Legal operator" and "Business address" placeholder lines from the current Terms and Privacy Policy.
update agreements
set body = regexp_replace(body, '^(Legal operator|Business address): \[Insert[^\n]*\]\n', '', 'gn')
where kind in ('terms', 'privacy') and is_current;

-- Show versions without the "-draft" suffix (for example "1.0-draft" becomes "1.0").
update agreements set version = replace(version, '-draft', '') where is_current and version like '%-draft';
