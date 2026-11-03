# Database backups (free)

The Supabase free plan has no backups. The GitHub workflow `.github/workflows/db-backup.yml` makes one every night,
encrypted with a passphrase only you know, and keeps each one for 90 days. It also pings the site's API every day so
the free Supabase project is never paused for inactivity.

## Set it up once (10 minutes)

1. **Get the database connection string.** In Supabase, open your project, click **Connect** (top of the page),
   choose **Session pooler**, and copy the URI. It looks like
   `postgresql://postgres.zdppasosborxodhglqwo:[YOUR-PASSWORD]@aws-0-….pooler.supabase.com:5432/postgres`.
   Replace `[YOUR-PASSWORD]` with your database password. If you do not know it:
   **Project Settings → Database → Reset database password** (the website keeps working; it does not use this password).
   Use the *Session pooler* one: GitHub cannot reach the "Direct connection" address.
2. **Choose a backup passphrase**: at least 16 characters, for example four random words. Save it in your password
   manager. **Without it, the backups cannot be opened, by you or anyone else.**
3. **Add both as secrets on GitHub.** In the repository: **Settings → Secrets and variables → Actions →
   New repository secret**:
   - Name `SUPABASE_DB_URL`, value: the connection string from step 1.
   - Name `BACKUP_PASSPHRASE`, value: the passphrase from step 2.
4. **Run it once now.** **Actions → Database backup → Run workflow.** After a minute or two it shows a green tick,
   and the run page has a file named `rja-db-YYYY-MM-DD` under **Artifacts**.

From then on it runs every night at 02:17 UTC. If a run fails, GitHub emails you.

The repository is public, so anyone can download the backup files, but they are encrypted with AES-256: without your
passphrase they are unreadable. Never put the passphrase or the connection string in a file in the repository.

## Restore

You need the PostgreSQL 17 tools (`pg_restore`) and `gpg` on your computer (macOS: `brew install postgresql@17 gnupg`;
Windows: use WSL, or ask your developer).

1. Download the backup artifact from **Actions → Database backup → (a run) → Artifacts**, and unzip it.
2. Decrypt it (it asks for your passphrase):

   ```bash
   gpg --decrypt rja-db-2026-11-03.dump.gpg > rja-db.dump
   ```

3. Restore it into a Supabase project (a new one is safest: test there first, then point the site at it):

   ```bash
   pg_restore --clean --if-exists --no-owner --dbname "postgresql://postgres.…:PASSWORD@….pooler.supabase.com:5432/postgres" rja-db.dump
   ```

   A few "already exists" messages are normal and harmless.
4. Delete the decrypted `rja-db.dump` from your computer when you are done.

**What is in a backup:** all your data (products, orders, customers' setup answers, quotes, sellers, payouts…) and
the user accounts with their logins. **Not included:** files uploaded to Supabase Storage (none are used today: the
agency's automations are in this repository) and Supabase dashboard settings (email templates, SMTP), which you
re-enter by hand. The table structure itself is also in `supabase/migrations/`.

Try a restore once into a new free project, so you know it works before you ever need it.
