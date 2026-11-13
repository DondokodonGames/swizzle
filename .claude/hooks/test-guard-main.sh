#!/usr/bin/env bash
# Tests for .claude/hooks/guard-main.py using mock PreToolUse inputs.
# Nothing here talks to GitHub: each case only pipes JSON into the hook and checks
# its exit code (2 = blocked, 0 = allowed). The git repositories are throwaway local
# ones under mktemp; nothing is pushed.
#
#   bash .claude/hooks/test-guard-main.sh
set -u
HOOK="$(cd "$(dirname "$0")" && pwd)/guard-main.py"
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
SETTINGS="$REPO/.claude/settings.json"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkrepo() { # dir branch
  git init -q -b "$2" "$1"
  git -C "$1" -c user.name=t -c user.email=t@example.invalid commit -q --allow-empty -m init
}
M="$TMP/main-repo"; mkrepo "$M" main              # current branch is main
W="$TMP/work-repo"; mkrepo "$W" claude/work       # a working branch, no upstream
U="$TMP/upstream-main"; mkrepo "$U" claude/work   # working branch whose push destination is main
git -C "$U" remote add origin "$TMP/nowhere.git"
git -C "$U" update-ref refs/remotes/origin/main HEAD
git -C "$U" config branch.claude/work.remote origin
git -C "$U" config branch.claude/work.merge refs/heads/main
git -C "$U" config push.default upstream
X="$TMP/matching"; mkrepo "$X" claude/work; git -C "$X" config push.default matching
D="$TMP/detached"; mkrepo "$D" claude/work; git -C "$D" checkout -q --detach

pass=0; fail=0
check() { # expect(block|allow) exit-code label
  if { [ "$1" = block ] && [ "$2" -eq 2 ]; } || { [ "$1" = allow ] && [ "$2" -eq 0 ]; }; then
    pass=$((pass + 1))
  else
    fail=$((fail + 1)); echo "FAIL (expected $1, exit $2) $3"
  fi
}
run() { # expect cwd command
  local code=0
  jq -n --arg c "$3" --arg d "$2" \
    '{tool_name:"Bash", tool_input:{command:$c}, cwd:$d, hook_event_name:"PreToolUse"}' \
    | python3 "$HOOK" >/dev/null 2>&1 || code=$?
  check "$1" "$code" "[$2] $3"
}
raw() { # expect stdin-text
  local code=0
  printf '%s' "$2" | python3 "$HOOK" >/dev/null 2>&1 || code=$?
  check "$1" "$code" "raw input: $2"
}

# --- merges, auto-merge, settings writes ------------------------------------
run block "$W" 'gh pr merge 12 --merge'
run block "$W" 'gh pr merge --auto --squash 12'
run block "$W" 'cd /tmp && gh  pr   merge 3'
run block "$W" 'gh api -X PUT repos/DondokodonGames/swizzle/pulls/12/merge'
run block "$W" 'curl -X PUT https://api.github.com/repos/o/r/pulls/5/merge'
run block "$W" "gh api graphql -f query='mutation { mergePullRequest(input:{pullRequestId:\"X\"}) { clientMutationId } }'"
run block "$W" "gh api graphql -f query='mutation { enablePullRequestAutoMerge(input:{pullRequestId:\"X\"}) { clientMutationId } }'"
run block "$W" 'gh api -X POST repos/o/r/merges -f base=main -f head=feature'
run block "$W" 'gh api -X PUT repos/o/r/pulls/12/ccr/auto_merge -f merge_method=squash'
run block "$W" 'gh api --method=PUT repos/o/r/pulls/12/ccr/auto_merge'
run block "$W" 'gh api -X DELETE repos/o/r/rulesets/27175768'
run block "$W" 'gh api --method PUT repos/o/r/branches/main/protection --input p.json'

# --- pushes that name main, force pushes ------------------------------------
run block "$W" 'git push origin main'
run block "$W" 'git push -u origin main'
run block "$W" 'git push origin HEAD:main'
run block "$W" 'git push origin claude/work:refs/heads/main'
run block "$W" 'git push origin "main"'
run block "$W" 'git push origin +claude/work'
run block "$W" 'git push --force origin claude/work'
run block "$W" 'git push -f origin claude/work'
run block "$W" 'git push -uf origin claude/work'
run block "$W" 'git push --force-with-lease origin claude/work'
run block "$W" 'git push origin --delete main'
run block "$W" 'git push origin :main'
run block "$W" 'git push --mirror origin'
run block "$W" 'git push --all origin'
run block "$W" "git push origin 'refs/heads/*:refs/heads/*'"
run block "$W" 'git push origin :'
run block "$W" 'git -C . push origin main'
run block "$W" 'FOO=1 git push origin main'
run block "$W" 'git add -A && git commit -m x && git push origin main'
run block "$W" "bash -c 'git push origin main'"
run block "$W" "bash -lc 'git push origin main'"
run block "$W" 'timeout 60 git push origin main'
run block "$W" 'sudo -u someone git push origin main'
run block "$W" 'if true; then git push origin main; fi'
run block "$W" '{ git push origin main; }'

# --- multi-line commands (newline, line continuation, heredoc fed to a shell) -
run block "$W" $'echo start\ngit push origin main'
run block "$W" $'git push \\\n  origin main'
run block "$W" $'bash <<\'EOF\'\ngit push origin main\nEOF'
run block "$W" $'cat <<EOF | sh\ngit push origin main\nEOF'

# --- push without an explicit branch: checked-out branch and its destination -
run block "$M" 'git push'
run block "$M" 'git push origin'
run block "$M" 'git push origin HEAD'
run block "$M" 'git push -u origin @'
run block "$U" 'git push'                          # push.default=upstream, upstream is main
run block "$U" 'git push origin HEAD'
run block "$X" 'git push'                          # push.default=matching
run block "$D" 'git push'                          # detached HEAD: branch unknown
run block "/nonexistent-dir" 'git push'            # repository unknown

# --- which repository: cd / pushd / popd / git -C / subshells (item 3) ------
run block "$W" "cd $M && git push"
run block "$W" "cd $M; git push origin HEAD"
run block "$W" "pushd $M && git push"
run block "$W" "pushd $W && popd && git push"     # popd target is not tracked: unknown
run block "$W" "git -C $M push"
run block "$W" "git -C $W -C $M push"
run block "$W" "cd $TMP && cd main-repo && git push"
run block "$W" "(cd $M && git push)"
run block "$M" "(cd $W) && git push"               # the cd ended with the subshell
run block "$W" 'cd "$SOMEWHERE" && git push'
run block "$W" 'cd - && git push'
run block "$W" "GIT_DIR=$M/.git git push"
run block "$W" "git --git-dir=$M/.git push"

# --- push arguments that cannot be resolved (fail closed) -------------------
run block "$W" 'git push origin "$BRANCH"'
run block "$W" 'git push origin $(git branch --show-current)'
run block "$W" 'git push origin `git branch --show-current`'
run block "$W" 'git push "$REMOTE"'
run block "$W" 'git push origin --delete "$B"'

# --- input the guard cannot judge (fail closed, item 2) ---------------------
run block "$W" 'git push origin "main'
run block "$W" "echo 'unterminated"
run block "$W" "echo \"it's"
run block "$W" '   '
raw block 'not json'
raw block ''
raw block '{"tool_name":"Bash"'
raw block '[]'
raw block '{}'
raw block '{"tool_name":"Bash","tool_input":{}}'
raw block '{"tool_name":"Bash","tool_input":{"command":42}}'
raw block '{"tool_name":"Bash","tool_input":["git push origin main"]}'

# --- must be allowed (normal development) -----------------------------------
run allow "$W" 'git push -u origin claude/dreamy-einstein-dmr3y8'
run allow "$W" 'git push -u origin claude/dreamy-einstein-dmr3y8 2>&1 | tail -5'
run allow "$W" 'git push origin claude/work'
run allow "$W" 'git push origin "claude/work"'
run allow "$W" 'git push origin HEAD'
run allow "$W" 'git push'
run allow "$W" 'git push origin claude/work:claude/work'
run allow "$U" 'git push origin claude/work'       # explicit branch, same name
run allow "$M" "cd $W && git push"
run allow "$M" "git -C $W push"
run allow "$W" "(cd $M && git status) && git push"
run allow "$W" "cd $M && git status; cd $W && git push"
run allow "$W" 'git commit -m "merge main into working branch; fix main menu"'
run allow "$W" $'git commit -m "$(cat <<\'EOF\'\nFix the player\'s score; don\'t reset main menu\nEOF\n)"'
run allow "$W" $'git add . && git commit -F - <<\'EOF\'\nIt\'s fine\nEOF'
run allow "$W" $'cat > notes.md <<\'EOF\'\nIt\'s about main; git push origin main is for humans\nEOF'
run allow "$W" $'npm run test\nnpm run build'
run allow "$W" "echo 'it'\\''s fine'"
run allow "$W" 'git fetch origin main'
run allow "$W" 'git merge origin/main'
run allow "$W" 'git log --oneline origin/main..HEAD'
run allow "$W" "git log --format='%H %s' -3"
run allow "$W" 'git diff main...HEAD --stat'
run allow "$W" 'git checkout main'
run allow "$W" 'grep -rn "git push" docs | head'
run allow "$W" 'for f in a b; do echo "$f"; done'
run allow "$W" 'x=$(cd /tmp; pwd); echo "$x"'
run allow "$W" 'npm run test'
run allow "$W" 'npm run build && npx tsc --noEmit --skipLibCheck'
run allow "$W" 'gh pr create --base main --head claude/work --title t --body b'
run allow "$W" 'gh pr view 12 --json state,mergeable'
run allow "$W" 'gh api repos/DondokodonGames/swizzle/rulesets'
run allow "$W" 'gh api repos/o/r/pulls/12'
run allow "$W" 'gh api -X DELETE repos/o/r/pulls/12/ccr/auto_merge'
run allow "$W" 'gh api repos/o/r/pulls/12/ccr/review_threads'
run allow "$W" 'echo "main" && ls'
run allow "$REPO" 'git status'
raw allow '{"tool_name":"Read","tool_input":{"file_path":"x"}}'
raw allow '{"tool_name":"Edit","tool_input":{"file_path":"x","old_string":"git push origin main"}}'

# --- settings: the hook blocks when it cannot run (onFailure, item 1) -------
code=0
jq -e '[.hooks.PreToolUse[] | select(.matcher == "Bash") | .hooks[]
        | select(.command | contains("guard-main.py"))] | length == 1 and all(.onFailure == "block")' \
  "$SETTINGS" >/dev/null 2>&1 || code=2
check allow "$code" "settings.json: guard hook present with onFailure=block"

echo "guard-main: $pass passed, $fail failed"
[ $fail -eq 0 ]
