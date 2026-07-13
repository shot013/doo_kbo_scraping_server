#!/usr/bin/env bash
# PreToolUse hook (Edit|Write): block edits to generated files.
# Parses hook stdin JSON with grep/sed only (no jq/python dependency) for portability.
input=$(cat)

f=$(printf '%s' "$input" \
  | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' \
  | head -1 \
  | sed -E 's/^"file_path"[[:space:]]*:[[:space:]]*"//' \
  | sed 's/"$//' \
  | sed 's/\\\\/\\/g')

[ -z "$f" ] && exit 0

norm=$(printf '%s' "$f" | tr '\\' '/')

case "$norm" in
  */dist/*|*/coverage/*)
    escaped=$(printf '%s' "$f" | sed 's/\\/\\\\/g; s/"/\\"/g')
    printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"generated file - do not edit directly: %s"}}\n' "$escaped"
    exit 0
    ;;
esac

exit 0
