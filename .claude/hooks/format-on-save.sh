#!/usr/bin/env bash
# PostToolUse hook (Edit|Write): auto-format edited source files with prettier.
# Parses hook stdin JSON with grep/sed only (no jq/python dependency) for portability.

# prettier is a devDependency, so it is not on the global PATH — call the project's
# own binary. `command -v prettier` always failed here and silently skipped formatting.
prettier="${CLAUDE_PROJECT_DIR:-.}/node_modules/.bin/prettier"
[ -e "$prettier" ] || exit 0

# Hooks run in a non-interactive, non-login shell, so PATH additions from
# ~/.bashrc / ~/.bash_profile (where toolchains are commonly added) are not
# inherited. Source them here so node (needed by the prettier shim) resolves the
# same as in a normal terminal, without hardcoding any one machine's install path.
if ! command -v node >/dev/null 2>&1; then
  for rc in "$HOME/.bashrc" "$HOME/.bash_profile" "$HOME/.zshrc" "$HOME/.profile"; do
    [ -f "$rc" ] && . "$rc" >/dev/null 2>&1
  done
fi
command -v node >/dev/null 2>&1 || exit 0

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
  */dist/*|*/coverage/*) exit 0 ;;
esac

case "$norm" in
  *.ts) "$prettier" --write "$f" >/dev/null 2>&1 ;;
esac

exit 0
