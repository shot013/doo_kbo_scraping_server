#!/usr/bin/env bash
# 운영 서버 상태를 읽기 전용으로 조회한다 (배포 커밋, 컨테이너, 백필 진행, 최근 경고 로그, 메모리·디스크).
# .github/workflows/server-status.yaml이 SSH로 실행하고, 수동으로는:
#   ssh -i <pem> ubuntu@<EIP> 'bash -s' < scripts/server-status.sh
APP_DIR="${APP_DIR:-$HOME/doo_kbo_scraping_server}"
COMPOSE=(docker compose -f docker-compose.prod.yml)
cd "$APP_DIR" || exit 1

section() { printf '\n== %s\n' "$*"; }

section '배포 커밋'
git log -1 --format='%h %ci %s'

section '컨테이너'
"${COMPOSE[@]}" ps

section '백필 요청'
pgrep -af '^curl .*backfill' || echo '(실행 중인 백필 없음)'
for f in ~/backfill_*.json; do
  [ -e "$f" ] || continue
  echo "-- $f ($(stat -c '%s bytes, %y' "$f"))"
  head -c 2000 "$f"
  echo
done

section 'DB'
"${COMPOSE[@]}" exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "SELECT COUNT(DISTINCT game_id) AS summary_games, MIN(game_id) AS first_game, MAX(game_id) AS last_game, MAX(updated_at) AS last_saved FROM game_line_scores;" \
  -c "SELECT season_year, series, status, COUNT(*) FROM games WHERE season_year = EXTRACT(YEAR FROM now()) GROUP BY 1, 2, 3 ORDER BY 2, 3;"'

section '최근 3시간 경고·에러 로그 (최대 40줄)'
"${COMPOSE[@]}" logs --since 3h app 2>&1 | grep -iE 'warn|error|exception|Failed to backfill' | tail -40 || true

section '메모리·디스크'
free -h
df -h /
