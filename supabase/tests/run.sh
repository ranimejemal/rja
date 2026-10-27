#!/bin/sh
# Runs the migrations and database tests against a throwaway local Postgres.
# Usage: sh supabase/tests/run.sh   (needs Postgres server binaries; PG_BIN defaults to /usr/lib/postgresql/16/bin)
set -e
PG_BIN=${PG_BIN:-/usr/lib/postgresql/16/bin}
DIR=$(cd "$(dirname "$0")/.." && pwd)
DATA=$(mktemp -d)
PORT=${PORT:-54329}
chown postgres "$DATA" 2>/dev/null || true
as_pg() { if [ "$(id -u)" = 0 ]; then su postgres -s /bin/sh -c "$*"; else sh -c "$*"; fi; }
as_pg "$PG_BIN/initdb -D $DATA -U postgres -A trust >/dev/null"
as_pg "$PG_BIN/pg_ctl -D $DATA -o '-p $PORT -k /tmp' -l $DATA/log -w start >/dev/null"
trap 'as_pg "$PG_BIN/pg_ctl -D $DATA -m immediate stop >/dev/null"; rm -rf "$DATA"' EXIT
PSQL="psql -X -q -v ON_ERROR_STOP=1 -h /tmp -p $PORT -U postgres -d postgres"
$PSQL -f "$DIR/tests/supabase_stubs.sql"
for f in "$DIR"/migrations/*.sql; do
  $PSQL -f "$f" || { echo "migration failed: $f"; exit 1; }
done
echo "migrations applied"
$PSQL -f "$DIR/tests/marketplace_test.sql"
