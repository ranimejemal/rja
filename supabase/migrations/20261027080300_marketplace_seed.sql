-- Reference data: categories, draft legal documents, platform seller and demo catalog helpers.

insert into product_categories (slug, name, sort_order) values
  ('ai-agents', 'AI Agents', 1),
  ('lead-generation', 'Lead Generation', 2),
  ('sales-automation', 'Sales Automation', 3),
  ('marketing-automation', 'Marketing Automation', 4),
  ('social-media', 'Social Media', 5),
  ('customer-support', 'Customer Support', 6),
  ('e-commerce', 'E-commerce', 7),
  ('business-operations', 'Business Operations', 8),
  ('productivity', 'Productivity', 9),
  ('finance-administration', 'Finance and Administration', 10),
  ('cybersecurity', 'Cybersecurity', 11),
  ('data-processing', 'Data Processing', 12),
  ('chatbots', 'Chatbots', 13),
  ('n8n-workflows', 'n8n Workflows', 14),
  ('api-integrations', 'API Integrations', 15);

-- Draft agreements. They are placeholders to be replaced after legal review; admins publish new versions.
insert into agreements (kind, version, title, body, is_current) values
('seller_agreement', '0.1-draft', 'Seller Agreement',
$md$**Draft for legal review. Not legal advice and not yet reviewed for any jurisdiction.**

1. **Commission.** The platform keeps the commission rate in force at the time of each sale (currently shown in your dashboard). Rates may change for future sales only.
2. **Pricing and discounts.** You set prices within the platform's limits. Discounts you create apply to your share proportionally.
3. **Payments and payouts.** Payments are collected by the platform's payment provider. Your share becomes available after the refund window and is paid out when you request it and the payout is confirmed.
4. **Ownership.** You keep ownership of your products. You grant the platform a non-exclusive licence to display, distribute and sell them on the marketplace.
5. **Originality and rights.** You confirm you own or are authorised to distribute every file you upload, and that it does not infringe third-party rights.
6. **Prohibited content.** No malicious workflows, hidden data exfiltration, credential harvesting, unlawful content, or misleading descriptions.
7. **Quality and testing.** You test products before submission and describe requirements and limitations accurately.
8. **Support.** You answer buyer support requests within a reasonable time.
9. **Refunds and chargebacks.** Approved refunds and chargebacks are deducted from your share in proportion to the original split.
10. **Updates.** Updates to published products go through review before buyers receive them.
11. **Suspension.** The platform may suspend products or accounts that breach this agreement.
12. **Liability and disputes.** To be completed after legal review for the jurisdictions where the platform operates.
$md$, true),
('buyer_license', '0.1-draft', 'Buyer License Agreement',
$md$**Draft for legal review.**

- You receive the workflow files and documentation of the version you bought, plus updates while the product is maintained.
- The licence type shown at checkout (personal, single business, commercial or extended commercial) defines where you may use it.
- You may modify the workflow for your own use. You do not acquire the creator's intellectual property.
- Client projects are allowed only with a commercial or extended commercial licence.
- Redistribution or resale of the files is not allowed.
- Third-party services and API costs are not included.
- Support and refund conditions are described on the product page and in the Refund Policy.
- If a product is discontinued, you keep access to the version you bought.
$md$, true),
('terms', '0.1-draft', 'Terms of Service', $md$**Draft for legal review.** Terms of use of the marketplace, accounts, acceptable use and liability.$md$, true),
('privacy', '0.1-draft', 'Privacy Policy', $md$**Draft for legal review.** What personal data is collected, why, how long it is kept, and your rights under the GDPR.$md$, true),
('refund_policy', '0.1-draft', 'Refund Policy', $md$**Draft for legal review.** Request a refund from your dashboard within 14 days if the product does not match its description or cannot be installed with the documented requirements. Approved refunds remove access to the product.$md$, true);

-- Creates the platform-owned seller for the calling admin (first-party store).
create function ensure_platform_seller() returns uuid
language plpgsql security definer set search_path = public as $$
declare sid uuid;
begin
  if not is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  select id into sid from seller_profiles where is_platform;
  if sid is null then
    insert into seller_profiles (user_id, slug, display_name, bio, status, is_platform)
    values (auth.uid(), 'ranime-jemal-agency', 'Ranime Jemal Agency',
            'Automations built and supported by the Ranime Jemal Agency team.', 'approved', true)
    returning id into sid;
    insert into user_roles (user_id, role) values (auth.uid(), 'seller') on conflict do nothing;
    perform audit('seller.platform_created', 'seller_profile', sid::text);
  end if;
  return sid;
end $$;
revoke execute on function ensure_platform_seller() from public, anon;
grant execute on function ensure_platform_seller() to authenticated;
