# Auth email templates

Paste each file into Supabase → Authentication → Emails → Templates (use the **Source** view), with this subject:

| Template | File | Subject |
|---|---|---|
| Confirm signup | `confirm-signup.html` | `{{ .Token }} is your Ranime Jemal Agency code` |
| Reset Password | `reset-password.html` | `Reset your Ranime Jemal Agency password` |

The logo is loaded from `https://rja-wd2u.vercel.app/email/rja-logo-white.png` (`public/email/`).
If the site moves to another domain, update that URL in both files.
