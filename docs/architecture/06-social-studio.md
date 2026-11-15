# Social Media Studio (beta, 15 November 2026)

**Today (no platform approval needed).** `/studio`: the customer uploads the statistics export of their own
Instagram / Facebook (Meta Business Suite → Insights → Content → Export), TikTok (Analytics → Content → Download)
or LinkedIn page. RJA computes, from the file only: formats ranked by engagement per 100 people reached, best day
and time slots (only when a slot has 3+ posts), posting rhythm, caption habits, top 5 posts. The AI then describes
the style and pillars and writes new posts (caption, hashtags, carousel slides, visual brief) and reel plans
(hook in the first 3 seconds, timed shots, on-screen text, voice-over, sound mood, caption). The file is analysed
in memory and not stored. 10 runs per hour per person.

**Content rules (`lib/social/content-rules.ts`).** Schema-checked JSON; no links, no Pinterest or other people's
images, no virality or result promises, platform caption limits, reels ≤ 90 s with the hook at 0–3 s. A failing
answer is discarded, never shown. The account's captions go to the AI as tagged data.

**Engine.** New `social.publish` block, classed critical: the checker refuses it without an approval step before
it, and it needs the `publish_posts` permission from a connected account.

## What the platforms allow (checked against their public API terms)

| Platform | Read posts + stats | Publish | Needs |
| --- | --- | --- | --- |
| Instagram (Business/Creator) | yes, incl. reels, reach, saves, audience totals | yes | Meta app + App Review, Business verification |
| Facebook Page | yes | yes | same Meta app |
| TikTok | videos + basic stats | yes, private until TikTok audits the app | TikTok developer app + audit |
| LinkedIn page | yes | yes | LinkedIn Community Management API approval |
| Snapchat | no official API for regular accounts | no | — |
| Figma | frames, colours, fonts, texts, exported images | cannot create frames from outside (plugin needed) | Figma OAuth app |
| Canva | designs, export | brand-template autofill needs Canva Enterprise | Canva Connect app |
| Pinterest | the customer's own boards as a mood board | not used for images (copyright) | Pinterest app |

"Who saw my posts": platforms give totals (reach, age, gender, city, active hours), never identities.

## Next steps
1. Meta app (Instagram + Facebook): connect accounts directly instead of uploading a file; publish after approval.
2. Figma connector: read selected frames to describe the visual style (colours, fonts, layouts) for the AI.
3. AI images from the briefs (provider and cost to choose).
4. TikTok and LinkedIn apps.
