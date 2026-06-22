# PostgreSQL backup for Hostnet Panel production
# Usage: ./scripts/backup-database.sh [output-dir]
# Requires: pg_dump, DATABASE_URL in environment or ../../.env

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="${1:-$ROOT/backups}"
STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT_DIR"

if [ -f "$ROOT/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set" >&2
  exit 1
fi

FILE="$OUT_DIR/hostnet-panel-$STAMP.sql.gz"
pg_dump "$DATABASE_URL" | gzip > "$FILE"
echo "Backup written: $FILE"
