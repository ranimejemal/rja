# Social Media Content Scheduler

## What it does
- **Your posts, your schedule:** you write the posts in a Google Sheet (one column per network) and choose the publish time.
- **Hourly publishing:** every hour the next post whose time has passed is published to Facebook, Instagram (needs an image URL) and LinkedIn. X is optional.
- **Results:** the outcome for each network is written back to the sheet: *published*, *partly published* or *failed*, with the error.
- **No AI here:** for posts written by AI with an approval step, use automation 04.

## Setup
1. Import `workflow.json` and fill in **Settings**: Facebook page ID, Instagram business account ID, LinkedIn organization ID, sheet URL.
2. In the Google Sheet, create a tab named **Schedule** with the columns from `schedule-sheet.csv`. Set `status` to `scheduled` for posts that are ready.
3. Connect Google Sheets, Facebook Graph API (page token with publish permissions) and LinkedIn. Disable the networks you don't use. Enable *Post to X* only with X API access.
4. Activate.
