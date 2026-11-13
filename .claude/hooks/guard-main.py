#!/usr/bin/env python3
"""PreToolUse guard for Bash: stop Claude Code from changing `main` on its own.

Blocks (exit 2, reason on stderr):
  - PR merges: `gh pr merge`, REST `.../pulls/<n>/merge`, GraphQL `mergePullRequest`
  - auto-merge: GraphQL `enablePullRequestAutoMerge`, REST `.../pulls/<n>/ccr/auto_merge`
    (`gh pr merge --auto` is covered by the first rule)
  - branch merges through the API: REST `.../merges`
  - pushes that update or delete `main`, and every force push
  - writes to rulesets / branch protection through `gh api`

Everything else is allowed: commits, pushes to working branches, tests, builds,
`gh pr create`, reading PRs.

Fail closed. A Bash call the guard cannot judge is blocked, so Claude has to rephrase it:
input that is not JSON, no tool name or command, quoting that cannot be parsed, an
internal error, and a push whose destination cannot be worked out (`$VAR`, `$(...)` or
backticks in the push arguments, a `cd` / `git -C` target that is not a literal path, an
unknown current branch, push config this script does not evaluate). Tools other than
Bash are not checked. `.claude/settings.json` sets `onFailure: "block"`, so a guard that
cannot start, crashes or times out blocks the call as well.

The repository a push runs in is followed through `cd`, `pushd`/`popd`, `git -C`,
subshells `( ... )`, `;`, `&&`, `||`, `|` and newlines. For a push without an explicit
branch (`git push`, `git push origin`, `git push origin HEAD`) both the checked-out
branch and its configured push destination (`@{push}`) are checked.

Limits (a guard against mistakes, not a security boundary):
  - a push or API call made from a script file, an encoded string or another program
    is not seen;
  - `git push <remote> <branch>` is taken to update the remote branch of the same name;
  - control flow is not evaluated: a `cd` inside `if` / `for` counts as if it ran;
  - the API words above are matched anywhere in the text, so a command that only
    mentions them (grep, a commit message) is blocked too.

Tests: .claude/hooks/test-guard-main.sh
"""
import json
import os
import re
import shlex
import subprocess
import sys

PROTECTED = "main"
PROTECTED_REFS = {PROTECTED, f"refs/heads/{PROTECTED}"}

# Patterns checked against the whole command text, quotes included.
API_PATTERNS = [
    (re.compile(r"\bgh\s+pr\s+merge\b"), "PR merge (gh pr merge)"),
    (re.compile(r"/pulls/\d+/merge\b"), "PR merge through the REST API"),
    (re.compile(r"\bmergePullRequest\b"), "PR merge through the GraphQL API"),
    (re.compile(r"\benablePullRequestAutoMerge\b"), "enabling auto-merge"),
    (re.compile(r"(^|[\s/'\"])repos/[^/\s]+/[^/\s]+/merges\b"), "branch merge through the REST API"),
]
WRITE_METHOD = re.compile(r"(-X|--method)\s*=?\s*(POST|PUT|PATCH|DELETE)\b", re.I)
# Claude Code cloud sessions expose auto-merge as a REST route; DELETE (turning it off) stays allowed.
CCR_AUTO_MERGE = re.compile(r"/pulls/\d+/ccr/auto_merge\b")
DELETE_METHOD = re.compile(r"(-X|--method)\s*=?\s*DELETE\b", re.I)
SETTINGS_PATHS = re.compile(r"/rulesets\b|/branches/[^/\s]+/protection\b")
# <<WORD, <<-WORD, <<'WORD', <<"WORD", <<\WORD  (not <<< here-strings)
HEREDOC = re.compile(r"(?<!<)<<(?!<)(?P<dash>-?)\s*\\?(?P<q>['\"]?)(?P<word>[A-Za-z_][A-Za-z0-9_]*)(?P=q)")
ASSIGNMENT = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*=")
SHELL_C = re.compile(r"^-[A-Za-z]*c[A-Za-z]*$")  # -c, -lc, -ec ...

PUNCT = ";&|()\n"
SHELLS = {"bash", "sh", "zsh", "dash", "ksh"}
# Words that can stand in front of a command without changing which command it is.
PREFIX_WORDS = {"env", "command", "builtin", "sudo", "time", "nohup", "exec", "nice",
                "!", "{", "}", "if", "then", "else", "elif", "while", "until", "do"}
GIT_OPTS_WITH_VALUE = {"-C", "-c", "--git-dir", "--work-tree", "--namespace", "--exec-path"}
PUSH_OPTS_WITH_VALUE = {"--repo", "-o", "--push-option", "--receive-pack", "--exec", "--recurse-submodules"}
UNKNOWN = None  # a working directory that cannot be worked out


def block(reason):
    sys.stderr.write(
        f"Blocked by .claude/hooks/guard-main.py: {reason}. "
        f"Changing '{PROTECTED}' needs a human: open a PR from a working branch and let a person merge it. "
        "If this command does not touch main, rewrite it in a plainer form "
        "(literal paths and branch names, no $VAR in push arguments, balanced quotes).\n"
    )
    sys.exit(2)


def dynamic(word):
    return "$" in word or "`" in word


def git_out(cwd, *args):
    """stdout of a read-only git command in cwd, or "" when it fails or cwd is unknown."""
    if cwd is UNKNOWN:
        return ""
    try:
        out = subprocess.run(["git", "-C", cwd, *args], capture_output=True, text=True, timeout=3)
        return out.stdout.strip() if out.returncode == 0 else ""
    except Exception:
        return ""


def resolve_dir(base, target):
    if base is UNKNOWN or target is None or dynamic(target) or target == "-" or re.search(r"[*?\[]", target):
        return UNKNOWN
    return os.path.normpath(os.path.join(base, os.path.expanduser(target)))


def split_heredocs(command, cwd, depth):
    """Return the command with here-document bodies removed.

    A body fed to a shell (`bash <<EOF`, `cat <<EOF | sh`, `eval`) is checked as a
    command first; any other body is data (commit messages, file contents). A body
    with no end marker is left in place, so it is parsed as commands.
    """
    lines = command.split("\n")
    kept = []
    i = 0
    while i < len(lines):
        line = lines[i]
        kept.append(line)
        i += 1
        for m in HEREDOC.finditer(line):
            end = i
            while end < len(lines):
                candidate = lines[end].lstrip("\t") if m.group("dash") else lines[end]
                if candidate == m.group("word"):
                    break
                end += 1
            if end == len(lines):
                break
            body = lines[i:end]
            i = end + 1
            words = {os.path.basename(w) for w in re.split(r"[\s;&|()]+", line) if w}
            if words & (SHELLS | {"eval", "source"}):
                check_command("\n".join(body), cwd, depth + 1)
    return "\n".join(kept)


def tokenize(command):
    lexer = shlex.shlex(command, posix=True, punctuation_chars=PUNCT)
    lexer.whitespace_split = True
    lexer.whitespace = " \t\r"  # newlines separate commands, so they come back as tokens
    lexer.commenters = ""
    return list(lexer)


def strip_prefixes(seg):
    """Drop `VAR=value`, `env`, `sudo`, `then`, `{` ... in front of a command.

    Returns (remaining words, whether GIT_DIR / GIT_WORK_TREE was set).
    """
    git_env = False
    i = 0
    while i < len(seg):
        tok = seg[i]
        if ASSIGNMENT.match(tok):
            git_env = git_env or tok.startswith(("GIT_DIR=", "GIT_WORK_TREE="))
        elif tok not in PREFIX_WORDS:
            break
        i += 1
    return seg[i:], git_env


def check_push(args, cwd):
    """args: everything after `git push`. cwd: the repository it runs in (or UNKNOWN)."""
    positional = []
    i = 0
    while i < len(args):
        a = args[i]
        if a == "--":
            positional.extend(args[i + 1:])
            break
        if a.startswith("--"):
            name = a.split("=", 1)[0]
            if name in ("--force", "--force-with-lease", "--force-if-includes"):
                block("force push")
            if name in ("--mirror", "--all", "--prune"):
                block(f"push with {name} (can rewrite or delete '{PROTECTED}')")
            if name == "--delete" and any(t in PROTECTED_REFS or dynamic(t) for t in args[i + 1:]):
                block(f"deleting '{PROTECTED}' or a branch named by a variable")
            if name in PUSH_OPTS_WITH_VALUE and "=" not in a:
                i += 1
        elif a.startswith("-") and len(a) > 1:
            letters = a[1:]
            if "f" in letters:
                block("force push")
            if "d" in letters and any(t in PROTECTED_REFS or dynamic(t) for t in args[i + 1:]):
                block(f"deleting '{PROTECTED}' or a branch named by a variable")
            if a in PUSH_OPTS_WITH_VALUE:
                i += 1
        else:
            positional.append(a)
        i += 1

    if any(dynamic(p) for p in positional):
        block("push whose remote or branch comes from a variable, $(...) or backticks")

    refspecs = positional[1:]  # positional[0] is the remote
    for spec in refspecs:
        if spec.startswith("+"):
            block("force push (+refspec)")
        if "*" in spec or spec == ":":
            block(f"push with a wildcard or matching refspec ('{spec}' can include '{PROTECTED}')")
        src, _, dst = spec.partition(":")
        if (dst or src) in PROTECTED_REFS:
            block(f"push to '{PROTECTED}'")

    implicit = not refspecs or any(spec.partition(":")[0] in ("HEAD", "@") and ":" not in spec for spec in refspecs)
    if implicit:
        branch = git_out(cwd, "symbolic-ref", "--short", "-q", "HEAD")
        if not branch:
            block("push whose target depends on a current branch that cannot be determined")
        if branch == PROTECTED:
            block(f"push from '{PROTECTED}' (current branch)")
        destination = git_out(cwd, "rev-parse", "--symbolic-full-name", "@{push}")
        if destination.endswith("/" + PROTECTED):
            block(f"push whose configured destination is '{PROTECTED}' ({destination})")
    if not refspecs:
        if git_out(cwd, "config", "--get", "push.default") == "matching":
            block("push with push.default=matching (pushes every matching branch)")
        if git_out(cwd, "config", "--get-regexp", r"^remote\..*\.push$"):
            block("push without a refspec while remote.<name>.push is configured")


def check_git(args, cwd):
    """args: everything after `git`."""
    i = 0
    while i < len(args) and args[i].startswith("-"):
        opt = args[i]
        if opt == "-C":
            cwd = resolve_dir(cwd, args[i + 1] if i + 1 < len(args) else None)
        elif opt.split("=", 1)[0] in ("--git-dir", "--work-tree"):
            cwd = UNKNOWN
        if opt in GIT_OPTS_WITH_VALUE:
            i += 1
        i += 1
    if i < len(args) and args[i] == "push":
        check_push(args[i + 1:], cwd)


def check_segment(seg, cwd, depth):
    """Check one simple command. Returns the working directory for the next one."""
    words, git_env = strip_prefixes(seg)
    if not words:
        return cwd
    first = os.path.basename(words[0])
    if first in ("cd", "pushd"):
        args = [a for a in words[1:] if not a.startswith("-") or a == "-"]
        return resolve_dir(cwd, args[0] if args else "~")
    if first == "popd":
        return UNKNOWN
    # The command may sit behind a wrapper (`timeout 60 git ...`, `xargs git ...`).
    for idx, word in enumerate(words):
        name = os.path.basename(word)
        if name in SHELLS:
            for j in range(idx + 1, len(words) - 1):
                if SHELL_C.match(words[j]):
                    check_command(words[j + 1], cwd, depth + 1)
                    break
            return cwd
        if name == "eval":
            check_command(" ".join(words[idx + 1:]), cwd, depth + 1)
            return cwd
        if name == "git":
            check_git(words[idx + 1:], UNKNOWN if git_env else cwd)
            return cwd
    return cwd


def check_command(command, cwd, depth=0):
    if depth > 3:
        block("commands nested too deeply to check")
    for pattern, reason in API_PATTERNS:
        if pattern.search(command):
            block(reason)
    if CCR_AUTO_MERGE.search(command) and not DELETE_METHOD.search(command):
        block("enabling auto-merge (ccr/auto_merge route)")
    if re.search(r"\bgh\s+api\b", command) and SETTINGS_PATHS.search(command) and WRITE_METHOD.search(command):
        block("changing rulesets or branch protection")

    command = split_heredocs(command, cwd, depth).replace("\\\n", " ")
    try:
        tokens = tokenize(command)
    except ValueError as e:
        block(f"a command whose quoting cannot be parsed ({e})")

    saved = []  # working directories to restore when a subshell closes
    seg = []
    for tok in tokens + [";"]:
        if tok and set(tok) <= set(PUNCT):
            if seg:
                cwd = check_segment(seg, cwd, depth)
                seg = []
            for ch in tok:
                if ch == "(":
                    saved.append(cwd)
                elif ch == ")" and saved:
                    cwd = saved.pop()
        else:
            seg.append(tok)


def run():
    try:
        data = json.load(sys.stdin)
    except Exception:
        block("hook input that is not valid JSON")
    if not isinstance(data, dict) or not isinstance(data.get("tool_name"), str):
        block("hook input with no tool name")
    if data["tool_name"] != "Bash":
        return
    tool_input = data.get("tool_input")
    command = tool_input.get("command") if isinstance(tool_input, dict) else None
    if not isinstance(command, str) or not command.strip():
        block("a Bash call with no command")
    cwd = data.get("cwd")
    check_command(command, cwd if isinstance(cwd, str) and cwd else os.getcwd())


def main():
    try:
        run()
    except SystemExit:
        raise
    except Exception as e:
        block(f"an internal error in the guard ({type(e).__name__})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
