#!/usr/bin/env bash
# 운영 EC2에서 main을 배포한다: pull → DB 백업 → app·migrate 빌드 → 마이그레이션 → app 재기동 → 헬스체크.
#
# GitHub Actions(.github/workflows/deploy.yaml)가 SSH로 이 스크립트를 서버에 흘려보내 실행하고,
# 수동 배포도 같은 스크립트로 한다:
#   ssh -i <pem> ubuntu@<EIP> 'bash -s' < scripts/deploy.sh
#
# 인자: [기대 커밋 SHA] — 주면 pull 뒤 HEAD가 이 커밋을 포함하는지 확인한다.
# 환경변수:
#   APP_DIR          저장소 위치 (기본 ~/doo_kbo_scraping_server)
#   BACKUP_DIR       DB 백업 위치 (기본 ~/backups)
#   BACKUP_KEEP      남길 백업 개수 (기본 5)
#   FORCE_DEPLOY=1   서버에서 백필 요청이 돌고 있어도 배포한다 (app 재기동으로 백필이 끊긴다)
# 이 스크립트는 `ssh ... 'bash -s' < script`처럼 stdin으로 실행된다. bash는 stdin에서 한 줄씩 읽으며
# 실행하므로, stdin을 읽는 명령(docker compose exec/run)이 나머지 스크립트를 삼켜 그 뒤가 조용히
# 실행되지 않는다. 전체를 main으로 감싸 끝까지 읽은 뒤 실행하고, docker 명령의 stdin도 막는다.
main() {
  set -euo pipefail

  APP_DIR="${APP_DIR:-$HOME/doo_kbo_scraping_server}"
  BACKUP_DIR="${BACKUP_DIR:-$HOME/backups}"
  BACKUP_KEEP="${BACKUP_KEEP:-5}"
  EXPECTED_SHA="${1:-}"
  HEALTH_URL='http://localhost:3651/games?limit=1'
  COMPOSE=(docker compose -f docker-compose.prod.yml)

  log() { printf '\n==> %s\n' "$*"; }

  cd "$APP_DIR"

  log '사전 점검'
  if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
    echo '서버 저장소에 커밋되지 않은 변경이 있어 중단합니다:' >&2
    git status --short --untracked-files=no >&2
    exit 1
  fi
  # 백필은 수 시간 걸리는 단일 HTTP 요청이라 app을 재기동하면 중간에 끊긴다.
  if pgrep -af 'scrape/.*backfill' >/dev/null && [ "${FORCE_DEPLOY:-0}" != 1 ]; then
    echo '서버에서 백필 요청이 실행 중이라 중단합니다 (끝난 뒤 다시 배포하거나 FORCE_DEPLOY=1):' >&2
    pgrep -af 'scrape/.*backfill' >&2
    exit 1
  fi
  df -h / | tail -1
  free -h | sed -n 2,3p

  log 'main 가져오기'
  PREVIOUS_SHA=$(git rev-parse --short HEAD)
  git fetch --quiet origin main
  git checkout --quiet main
  git merge --ff-only --quiet origin/main
  CURRENT_SHA=$(git rev-parse --short HEAD)
  echo "HEAD: ${PREVIOUS_SHA} -> ${CURRENT_SHA}"
  if [ -n "$EXPECTED_SHA" ] && ! git merge-base --is-ancestor "$EXPECTED_SHA" HEAD; then
    echo "HEAD(${CURRENT_SHA})가 배포 대상 커밋 ${EXPECTED_SHA}을 포함하지 않습니다." >&2
    exit 1
  fi

  log 'DB 백업'
  mkdir -p "$BACKUP_DIR"
  BACKUP_FILE="${BACKUP_DIR}/db_$(date +%Y%m%d_%H%M%S)_${PREVIOUS_SHA}.sql.gz"
  "${COMPOSE[@]}" exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip >"$BACKUP_FILE"
  # 빈 gzip은 수십 바이트다. 덤프 자체의 실패는 pipefail로 이미 걸러진다.
  if [ "$(stat -c %s "$BACKUP_FILE")" -lt 1024 ]; then
    echo "백업 파일이 비정상적으로 작습니다: ${BACKUP_FILE}" >&2
    exit 1
  fi
  ls -lh "$BACKUP_FILE"
  # 오래된 백업 정리 (최근 BACKUP_KEEP개만 남김)
  ls -1t "$BACKUP_DIR"/db_*.sql.gz | tail -n +"$((BACKUP_KEEP + 1))" | xargs -r rm -f --

  log '이미지 빌드 (app, migrate)'
  # migrate도 함께 빌드해야 한다. app만 빌드하면 migrate 이미지가 이전 배포의 것으로 남아
  # 새 마이그레이션을 못 찾고 "No migrations are pending"으로 끝난다.
  "${COMPOSE[@]}" build app migrate

  log '마이그레이션'
  "${COMPOSE[@]}" run --rm migrate

  log 'app 재기동'
  "${COMPOSE[@]}" up -d app

  log '헬스체크'
  status=000
  for _ in $(seq 1 30); do
    status=$(curl -s -o /dev/null -w '%{http_code}' "$HEALTH_URL" || true)
    [ "$status" = 200 ] && break
    sleep 3
  done
  "${COMPOSE[@]}" ps
  if [ "$status" != 200 ]; then
    echo "헬스체크 실패: ${HEALTH_URL} -> ${status}" >&2
    "${COMPOSE[@]}" logs --tail 100 app >&2
    exit 1
  fi
  echo "${HEALTH_URL} -> 200"

  log '정리'
  # 배포마다 이전 이미지가 dangling으로 남아 20GB 디스크를 채운다.
  docker image prune -f >/dev/null
  df -h / | tail -1

  log "배포 완료: ${PREVIOUS_SHA} -> ${CURRENT_SHA} (백업 ${BACKUP_FILE})"
}

main "$@" </dev/null
