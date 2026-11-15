-- Social Media Studio joins the RJA solutions (price list row; texts in lib/solutions.ts). Setup price starts from
-- the marketplace "AI Social Media Automation". Rollback: delete from solutions where id = 'social_studio'.
insert into solutions (id, name, setup_price_minor)
values ('social_studio', 'Social Media Studio', (select price_minor from products where slug = 'ai-social-media-automation'))
on conflict (id) do nothing;
