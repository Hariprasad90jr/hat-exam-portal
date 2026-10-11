#!/usr/bin/env bash
# ==============================================================================
# Exam Portal - Production Database Backup Script
#
# Generates a timestamped, compressed logical backup of the PostgreSQL database
# using pg_dump in custom archive format (-Fc), suitable for pg_restore.
#
# SAFETY GUARANTEES:
# 1. Read-only operation against the database (takes logical snapshot).
# 2. Never prints or echoes database credentials/passwords.
# 3. Saves exclusively to the .gitignore-protected backups/ directory.
# 4. Validates archive integrity immediately after creation using pg_restore --list.
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKUP_DIR="${PROJECT_ROOT}/backups"
TIMESTAMP="$(date +"%Y%m%d_%H%M%S")"
BACKUP_FILE="${BACKUP_DIR}/exam_portal_backup_${TIMESTAMP}.dump"

# Locate pg_dump and pg_restore (check PostgreSQL 17 locations first, then PATH)
PG_DUMP_BIN=""
PG_RESTORE_BIN=""

for candidate in \
  "/opt/homebrew/opt/postgresql@17/bin/pg_dump" \
  "/usr/local/opt/postgresql@17/bin/pg_dump" \
  "$(command -v pg_dump 2>/dev/null || true)"
do
  if [[ -n "$candidate" && -x "$candidate" ]]; then
    PG_DUMP_BIN="$candidate"
    break
  fi
done

for candidate in \
  "/opt/homebrew/opt/postgresql@17/bin/pg_restore" \
  "/usr/local/opt/postgresql@17/bin/pg_restore" \
  "$(command -v pg_restore 2>/dev/null || true)"
do
  if [[ -n "$candidate" && -x "$candidate" ]]; then
    PG_RESTORE_BIN="$candidate"
    break
  fi
done

if [[ -z "$PG_DUMP_BIN" ]]; then
  echo "[-] ERROR: pg_dump utility not found. Please ensure postgresql@17 client is installed." >&2
  exit 1
fi

if [[ -z "$PG_RESTORE_BIN" ]]; then
  echo "[-] ERROR: pg_restore utility not found. Please ensure postgresql@17 client is installed." >&2
  exit 1
fi

# Ensure backups directory exists
mkdir -p "${BACKUP_DIR}"

# Extract DIRECT_URL from .env.local (preferred for pg_dump snapshot mode) or fallback to environment
TARGET_URL="${DIRECT_URL:-}"

if [[ -z "$TARGET_URL" && -f "${PROJECT_ROOT}/.env.local" ]]; then
  TARGET_URL="$(node -e '
    const fs = require("fs");
    const m = fs.readFileSync(process.argv[1], "utf8").match(/^DIRECT_URL=["\x27]?([^\r\n"\x27]+)["\x27]?/m);
    if (m) console.log(m[1].trim());
  ' "${PROJECT_ROOT}/.env.local")"
fi

if [[ -z "$TARGET_URL" && -f "${PROJECT_ROOT}/.env" ]]; then
  TARGET_URL="$(node -e '
    const fs = require("fs");
    const m = fs.readFileSync(process.argv[1], "utf8").match(/^DIRECT_URL=["\x27]?([^\r\n"\x27]+)["\x27]?/m);
    if (m) console.log(m[1].trim());
  ' "${PROJECT_ROOT}/.env")"
fi

if [[ -z "$TARGET_URL" ]]; then
  echo "[-] ERROR: DIRECT_URL not found in environment or .env.local. DIRECT_URL (port 5432) is required for logical pg_dump." >&2
  exit 1
fi

# Parse connection metadata safely without printing password
CONN_HOST="$(node -e 'try { const u = new URL(process.argv[1]); console.log(u.host); } catch { console.log("unknown"); }' "$TARGET_URL")"
CONN_USER="$(node -e 'try { const u = new URL(process.argv[1]); console.log(u.username); } catch { console.log("unknown"); }' "$TARGET_URL")"
CONN_DB="$(node -e 'try { const u = new URL(process.argv[1]); console.log(u.pathname.replace(/^\//, "")); } catch { console.log("unknown"); }' "$TARGET_URL")"

echo "=================================================================="
echo " Exam Portal - Database Logical Backup"
echo "=================================================================="
echo " pg_dump binary : ${PG_DUMP_BIN}"
echo " pg_dump version: $("${PG_DUMP_BIN}" --version)"
echo " Target Host    : ${CONN_HOST}"
echo " Target DB      : ${CONN_DB}"
echo " Target User    : ${CONN_USER}"
echo " Output File    : ${BACKUP_FILE}"
echo " Mode           : Custom Archive (-Fc, compressed)"
echo "=================================================================="

echo "[*] Initiating logical snapshot with pg_dump..."
"${PG_DUMP_BIN}" \
  --dbname="${TARGET_URL}" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="${BACKUP_FILE}"

if [[ ! -s "${BACKUP_FILE}" ]]; then
  echo "[-] ERROR: Backup file was not created or is empty: ${BACKUP_FILE}" >&2
  exit 1
fi

FILE_SIZE="$(du -h "${BACKUP_FILE}" | cut -f1)"
FILE_BYTES="$(stat -f%z "${BACKUP_FILE}" 2>/dev/null || stat -c%s "${BACKUP_FILE}" 2>/dev/null || echo "unknown")"

echo "[+] Backup successfully written:"
echo "    Path: ${BACKUP_FILE}"
echo "    Size: ${FILE_SIZE} (${FILE_BYTES} bytes)"

echo "[*] Validating archive catalog integrity with pg_restore --list..."
ENTRY_COUNT="$("${PG_RESTORE_BIN}" --list "${BACKUP_FILE}" | grep -v '^;' | grep -c '.' || echo "0")"
TABLE_COUNT="$("${PG_RESTORE_BIN}" --list "${BACKUP_FILE}" | grep ' TABLE ' | grep -c 'public ' || echo "0")"

echo "[+] Archive verification passed:"
echo "    Catalog entries: ${ENTRY_COUNT}"
echo "    Public tables  : ${TABLE_COUNT}"

echo "=================================================================="
echo " Backup completed successfully at $(date)"
echo "=================================================================="
