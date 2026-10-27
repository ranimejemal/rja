# AI Social Media Automation

**Sells to:** brands, marketing agencies. **Price to test:** $150–$600/month.

## What it does
- **Every Monday at 8:00:**
  1. Reads the **Content plan** sheet. For each idea due in the next `daysAhead` days, the AI writes a post for Instagram, Facebook, LinkedIn and X, plus hashtags, in the brand voice.
  2. Saves the drafts in the sheet with the status *waiting approval*.
  3. Emails the approver.
- **Approval:** the approver edits the texts if needed and sets the status to **approved**.
- **Every hour:** the next approved post whose `publish_at` time has passed is published.
  - The result per network is written back: *published*, *partly published* or *failed*, with the error.
  - A network that fails does not stop the others.

## Setup
1. Import `workflow.json` and fill in **Settings**:
   - brand description and voice, language, approver email
   - Facebook page ID, Instagram business account ID, LinkedIn organization ID
   - sheet URL
2. In the Google Sheet, create a tab named **Content plan** with the columns from `content-plan.csv`.
   Add one row per post: a unique `post_id`, `publish_at` (date and time), `topic`, and `status` = `idea`.
   Instagram needs a public `image_url`.
3. Connect OpenAI, Google Sheets, Gmail, Facebook Graph API (all three Facebook/Instagram nodes) and LinkedIn.
4. **Post to X** is disabled. Enable it only if the client has X API access.
   Disable any other network the client does not use.
5. Activate.

The monthly price covers the client's content runs, checking results and adjusting the prompts.
