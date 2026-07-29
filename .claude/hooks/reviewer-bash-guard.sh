#!/usr/bin/env bash
# PreToolUse guard for the code-reviewer subagent's Bash tool.
# Allows only read-only verification commands; blocks everything else with exit 2.
# Input: hook JSON on stdin; the command is at .tool_input.command.

cmd=$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("tool_input",{}).get("command",""))' 2>/dev/null)

if [[ -z "$cmd" ]]; then
  echo "reviewer-bash-guard: could not parse command from hook input" >&2
  exit 2
fi

# Shell metacharacters would let an allowed prefix smuggle in arbitrary commands
# (e.g. "git diff; rm -rf ."), so reject them outright.
if [[ "$cmd" == *';'* || "$cmd" == *'&'* || "$cmd" == *'|'* || "$cmd" == *'>'* || \
      "$cmd" == *'<'* || "$cmd" == *'`'* || "$cmd" == *'$('* ]]; then
  echo "reviewer-bash-guard: blocked (shell metacharacters not allowed): $cmd" >&2
  exit 2
fi

allowed=(
  '^git (diff|status|log|show)( [^;&|<>`]*)?$'
  '^npm test( [^;&|<>`]*)?$'
  '^npm run (lint|build|test)( [^;&|<>`]*)?$'
  '^npx tsc --noEmit$'
)

for pattern in "${allowed[@]}"; do
  if [[ "$cmd" =~ $pattern ]]; then
    exit 0
  fi
done

echo "reviewer-bash-guard: blocked. code-reviewer may only run: git diff/status/log/show, npm test, npm run lint|build|test, npx tsc --noEmit. Got: $cmd" >&2
exit 2
