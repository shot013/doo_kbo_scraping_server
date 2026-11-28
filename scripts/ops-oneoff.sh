#!/usr/bin/env bash
# One-off read-only diagnostics (not for merge).
cd ~/doo_kbo_scraping_server || exit 1
C=(docker compose -f docker-compose.prod.yml)

echo '##### backend: game summary samples'
for g in 20261108KTSS0 20261104SSKT0 20261029SSHT0; do
  echo "== $g"
  curl -s -m 20 -w "\nHTTP %{http_code}\n" "http://localhost:3651/game-summaries/$g"
done
"${C[@]}" exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT game_id, team_code, is_home, innings, runs FROM game_line_scores WHERE game_id IN ('"'"'20261108KTSS0'"'"','"'"'20261104SSKT0'"'"','"'"'20261029SSHT0'"'"') ORDER BY game_id, is_home;"'

echo '##### scraping: dist scrapers'
"${C[@]}" exec -T app ls dist/modules/scrape/infrastructure/scrapers/

echo '##### scraping 1: season pitching duplicates'
timeout 300 "${C[@]}" exec -T app node - <<'JS'
const { SeasonStatsScraper } = require('./dist/modules/scrape/infrastructure/scrapers/season-stats.scraper');
new SeasonStatsScraper().scrapePitching().then((s) => {
  const m = {};
  for (const x of s) {
    const k = x.teamCode + '/' + x.playerName;
    (m[k] = m[k] || []).push([x.rank, x.games, x.inningsPitched, x.era]);
  }
  console.log('total', s.length);
  console.log(JSON.stringify(Object.entries(m).filter(([, v]) => v.length > 1)));
}).catch((e) => { console.error('ERR', e && e.stack || e); process.exit(1); });
JS

echo '##### scraping 2: LG roster row 이정준'
timeout 300 "${C[@]}" exec -T app node - <<'JS'
const { RosterScraper } = require('./dist/modules/scrape/infrastructure/scrapers/roster.scraper');
const o = RosterScraper.prototype.parsePlayerRows;
RosterScraper.prototype.parsePlayerRows = function ($, t) {
  $('table.tEx tr').each((_, r) => { if ($(r).text().includes('이정준')) console.log($.html(r)); });
  return o.call(this, $, t);
};
new RosterScraper().scrape('LG').then((p) => console.log('rows', p.length))
  .catch((e) => { console.error('ERR', e && e.stack || e); process.exit(1); });
JS
echo '##### done'
