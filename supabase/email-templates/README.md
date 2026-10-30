# Auth email templates

Paste each file into Supabase → Authentication → Emails → Templates (use the **Source** view), with this subject:

| Template | File | Subject |
|---|---|---|
| Confirm signup | `confirm-signup.html` | `{{ .Token }} is your Ranime Jemal Agency code` |
| Reset Password | `reset-password.html` | `{{ .Token }} is your Ranime Jemal Agency password reset code` |

The logo (`public/email/rja-logo-white.png`) is served by jsDelivr straight from this public GitHub repo,
pinned to a commit, so it works whatever happens to the Vercel deployment. If the logo changes, commit the new
PNG and put the new commit hash in the `cdn.jsdelivr.net/gh/ranimejemal/rja@<commit>/...` URL in both files.
