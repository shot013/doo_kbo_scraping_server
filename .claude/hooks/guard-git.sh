#!/usr/bin/env bash
# PreToolUse hook (Bash): enforce the deterministic parts of the git workflow.
#
# Copied from doo_kbo_harness_kit/.claude/hooks/guard-git.sh.template with two
# project fixes (not yet upstreamed to the kit):
#   - heredoc commits (`git commit -m "$(cat <<'EOF' ... EOF)"`), the form Claude Code
#     uses by default, are checked on their first message line instead of being denied.
#   - the issue number in feature/fix branch names is optional, and docs/ is allowed,
#     matching CONTRIBUTING.md.
#
# Enforced here:  no direct push to main/master, branch naming, Conventional Commits.
# Left to rules: anything needing judgement (see doo_kbo_harness_kit/KIT_RULES.md "git").
#
# Parses hook stdin JSON with shell/awk only (no jq/python dependency) for portability.
# Fails open: anything it cannot parse confidently is allowed through.

input=$(cat)

case "$input" in
  *'"command"'*git*) ;;
  *) exit 0 ;;
esac

# Isolate the tool_input.command JSON string: skip to its opening quote, then cut at
# the next sibling key or the end of tool_input.
raw=${input#*'"command"'}
raw=${raw#*'"'}
raw=${raw%%'","'*}
raw=${raw%%'"}'*}

# Decode the JSON escapes that matter here. Newlines must survive so the first line of
# a heredoc commit message can be found.
cmd=$(printf '%s' "$raw" | awk '{
  gsub(/\\\\/, "\001"); gsub(/\\n/, "\n"); gsub(/\\t/, " "); gsub(/\\"/, "\"");
  gsub(/\001/, "\\"); printf "%s", $0
}')

flat=$(printf '%s' "$cmd" | tr '\n' ' ')

case "$flat" in
  *git*) ;;
  *) exit 0 ;;
esac

# 명령 판정(push/브랜치)은 따옴표 안의 문자열을 지운 버전으로 한다. 그러지 않으면
# 커밋 메시지 본문에 'main' 같은 단어가 들어 있을 때 명령으로 오인한다.
bare=$(printf '%s' "$flat" | sed -E "s/\"[^\"]*\"//g; s/'[^']*'//g")

deny() {
  # JSON 문자열에 넣기 전에 따옴표/역슬래시를 제거한다 (이스케이프보다 단순하고 안전).
  escaped=$(printf '%s' "$1" | tr -d '\042\134')
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"%s"}}\n' "$escaped"
  exit 0
}

# 1. main/master는 PR로만 병합한다 — 직접 push 차단. push 구간만 본다(뒤에 이어진 다른 명령의 'main' 무시).
push_seg=$(printf '%s' "$bare" | grep -oE '(^|[^a-zA-Z0-9_-])git[[:space:]]+push[^;&|]*' | head -1)
if [ -n "$push_seg" ]; then
  if printf '%s' "$push_seg" | grep -qE '([[:space:]:+])(main|master)([[:space:]]|$)'; then
    deny "git-workflow: main/master로 직접 push할 수 없습니다. develop을 target으로 PR을 여세요."
  fi
  # 명시적 refspec이 없으면 현재 브랜치로 push된다.
  branch=$(git -C "${CLAUDE_PROJECT_DIR:-.}" rev-parse --abbrev-ref HEAD 2>/dev/null)
  case "$branch" in
    main|master)
      deny "git-workflow: 현재 브랜치가 ${branch}입니다. 직접 push할 수 없으니 작업 브랜치로 분기한 뒤 PR을 여세요."
      ;;
  esac
fi

# 2. 브랜치명 규약 (CONTRIBUTING.md).
newbr=$(printf '%s' "$bare" \
  | grep -oE 'git[[:space:]]+(checkout[[:space:]]+-b|switch[[:space:]]+-c)[[:space:]]+[^[:space:];&|]+' \
  | head -1 \
  | awk '{print $NF}')
if [ -n "$newbr" ]; then
  if ! printf '%s' "$newbr" | grep -qE '^((feature|fix)/([0-9]+-)?[a-z0-9._-]+|(chore|docs)/[a-z0-9._-]+|release/[A-Za-z0-9._-]+|develop)$'; then
    deny "git-workflow: 브랜치명 '${newbr}'이(가) 규약에 맞지 않습니다. feature/{desc}, fix/{desc}(앞에 {issue}- 선택), chore/{desc}, docs/{desc}, release/{version} 중 하나를 사용하세요."
  fi
fi

# 3. Conventional Commits. subject(첫 줄)만 검사한다.
if printf '%s' "$bare" | grep -qE '(^|[^a-zA-Z0-9_-])git[[:space:]]+commit'; then
  # -m(-am 포함)이 여러 개면 첫 번째만 subject다.
  msg=$(printf '%s' "$flat" \
    | grep -oE -- "(^|[[:space:]])-[a-zA-Z]*m[[:space:]]*[\"'][^\"']*" \
    | head -1 \
    | sed -E "s/^[[:space:]]*-[a-zA-Z]*m[[:space:]]*[\"']//")
  case "$msg" in
    '$('*|'')
      # heredoc으로 넘긴 메시지: `<<`가 있는 줄 다음의 첫 비어 있지 않은 줄이 subject다.
      # heredoc도 -m도 없으면(-F 파일, --no-edit 등) 그대로 통과한다(fail-open).
      msg=''
      case "$cmd" in
        *'<<'*)
          msg=$(printf '%s\n' "$cmd" | awk 'found && NF { sub(/^[[:space:]]+/, ""); print; exit } /<</ { found = 1 }')
          ;;
      esac
      ;;
  esac
  if [ -n "$msg" ]; then
    if ! printf '%s' "$msg" | grep -qE '^(feat|fix|docs|style|refactor|test|chore|perf)(\([a-z0-9._/-]+\))?: [a-z](.*[^.])?$'; then
      deny "git-workflow: 커밋 메시지 '${msg}'이(가) Conventional Commits 형식이 아닙니다. <type>(<scope>): <subject> — type은 feat|fix|docs|style|refactor|test|chore|perf, subject는 명령형·소문자 시작·마침표 없이."
    fi
  fi
fi

exit 0
