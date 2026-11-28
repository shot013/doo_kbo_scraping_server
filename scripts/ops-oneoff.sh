#!/usr/bin/env bash
# One-off read-only diagnostics (not for merge).
main() {
cd ~/doo_kbo_scraping_server || exit 1
C=(docker compose -f docker-compose.prod.yml)

echo '##### KS games in DB'
"${C[@]}" exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT id, game_date, status FROM games WHERE series = '"'"'KOREAN_SERIES'"'"' AND season_year = 2026 ORDER BY game_date;"'

echo '##### KBO schedule rows 11.08-11.12 / KS 6,7'
timeout 300 "${C[@]}" exec -T app node - <<'JS'
const { GameScraper } = require('./dist/modules/scrape/infrastructure/scrapers/game.scraper');
new GameScraper({}).fetchScheduleRows(2026, '11', '3,4,5,7').then((r) => {
  console.log('rows', r.length);
  for (const { row } of r) {
    const t = row.map((c) => c.Text).join(' | ');
    if (/11\.(08|09|10|11|12)/.test(t) || /KS [67]/.test(t)) console.log(t.slice(0, 300));
  }
}).catch((e) => { console.error('ERR', (e && e.stack) || e); process.exit(1); });
JS
echo '##### done'
}
main </dev/null
