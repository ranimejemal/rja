# AI Social Media Automation

**Sells to:** brands, marketing agencies. **Price to test:** $150–$600/month.

## What it does
- **Writes the posts** (every Monday at 8:00): for each idea in the **Content plan** due in the next `daysAhead` days, the AI writes a post for Instagram, Facebook, LinkedIn and X, plus hashtags, in the brand voice.
- **Creates the images:** when a post has no `image_url`, the AI creates an image for it (OpenAI image model, `imageModel`, in your `imageStyle`). The image is stored on your Facebook page **without being posted** so Instagram can use it, and its link is saved in the sheet. Turn this off with `generateImages`.
- **Asks for approval:** the drafts are saved with the status *waiting approval*, and the approver gets an email listing the posts and images. They edit what they like and set the status to **approved**.
- **Publishes** (every hour): the next approved post whose time has passed goes to Facebook, Instagram and LinkedIn (and X if enabled). The result per network (*published*, *partly published* or *failed*, with the error) is written back.
- **Replies to comments and messages** (instantly):
  - New comments on your Facebook page and Instagram posts, plus Messenger and Instagram direct messages, get a short AI reply in your brand voice, using only the facts in `replyKnowledge`.
  - Questions and praise are answered automatically.
  - **Complaints, refunds, order problems, abuse and anything uncertain are never answered automatically:** you get an email with a suggested reply instead.
  - Spam is ignored.
  - Set `autoReply` to false to approve every reply yourself.
  - Every comment and reply is logged in the **Replies** sheet.

## Setup
1. Import `workflow.json` and fill in **Settings**: brand, voice, approver, page and account IDs, image options, `replyKnowledge` (the facts the AI may use) and `metaVerifyToken` (any long random text).
2. In the Google Sheet, create the tabs **Content plan** (`content-plan.csv`) and **Replies** (`replies-sheet.csv`). Add one row per post idea: `post_id`, `publish_at`, `topic`, `status` = `idea`.
3. Connect:
   - **OpenAI**, for texts and images.
   - **Google Sheets** and **Gmail**.
   - **Facebook Graph API**: a page access token with `pages_manage_posts`, `pages_read_engagement`, `pages_manage_engagement`, `pages_messaging`, `instagram_basic`, `instagram_content_publish`, `instagram_manage_comments` and `instagram_manage_messages`.
   - **LinkedIn.**
   - **X:** the node is disabled; enable it only with X API access.
4. **For replies:** in your Meta app, add the **Webhooks** product:
   - Use the *Meta events* production URL as the callback URL, and your `metaVerifyToken` as the verify token.
   - Subscribe the page to `feed` and `messages`, and Instagram to `comments` and `messages`.
   - Meta checks the URL once; the workflow answers automatically.
5. Activate.

**Videos:** the workflow creates images, not videos. AI video generation through an API (for example OpenAI Sora or Runway) is possible but expensive per clip and not tested here. Ask for it as an add-on.
