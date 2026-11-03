#!/usr/bin/env bash
# PreToolUse hook (Edit|Write): enforce the mechanical edit rules of this repository.
#
#   1. Branch first — tracked project files are never edited on main/master/develop.
#   2. Merged migrations are immutable — a migration that already exists on
#      origin/develop or origin/main may have run in production; change the schema
#      with a new migration instead (see commit e807ac3).
#
# Files outside this repository (the harness kit, Claude memory, scratch files) and
# gitignored files (.env, docs/ops/, settings.local.json) are not checked.
# Parses hook stdin JSON with grep/sed only (no jq/python dependency) for portability.
# Fails open: anything it cannot resolve confidently is allowed through.

input=$(cat)

f=$(printf '%s' "$input" \
  | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' \
  | head -1 \
  | sed -E 's/^"file_path"[[:space:]]*:[[:space:]]*"//' \
  | sed 's/"$//' \
  | sed 's/\\\\/\\/g')

[ -z "$f" ] && exit 0

project_top=$(git -C "${CLAUDE_PROJECT_DIR:-.}" rev-parse --show-toplevel 2>/dev/null) || exit 0

# The file may not exist yet (Write of a new file), so resolve the repository from
# the nearest existing ancestor directory.
dir=$(dirname "$f")
while [ ! -d "$dir" ]; do
  parent=$(dirname "$dir")
  [ "$parent" = "$dir" ] && exit 0
  dir=$parent
done
file_top=$(git -C "$dir" rev-parse --show-toplevel 2>/dev/null) || exit 0
[ "$file_top" = "$project_top" ] || exit 0

git -C "$project_top" check-ignore -q -- "$f" 2>/dev/null && exit 0

deny() {
  escaped=$(printf '%s' "$1" | tr -d '\042\134')
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"%s"}}\n' "$escaped"
  exit 0
}

branch=$(git -C "$project_top" rev-parse --abbrev-ref HEAD 2>/dev/null)
case "$branch" in
  main|master|develop)
    deny "guard-edit: 현재 브랜치가 ${branch}입니다. 파일을 고치기 전에 develop에서 작업 브랜치(feature/, fix/, chore/, docs/)를 먼저 만드세요."
    ;;
esac

norm=$(printf '%s' "$f" | tr '\\' '/')
case "$norm" in
  */src/database/migrations/*)
    rel=$(git -C "$project_top" ls-files --full-name -- "$f" 2>/dev/null)
    [ -z "$rel" ] && exit 0
    for base in origin/develop origin/main; do
      if git -C "$project_top" cat-file -e "${base}:${rel}" 2>/dev/null; then
        deny "guard-edit: ${rel}은(는) 이미 ${base}에 병합된 마이그레이션이라 운영 DB에 적용됐을 수 있습니다. 수정하지 말고 npm run migration:generate로 새 마이그레이션을 추가하세요."
      fi
    done
    ;;
esac

exit 0
