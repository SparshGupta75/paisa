# Vendored agent skills

Third-party skills, copied verbatim at a pinned commit so they cannot change
under us. Project rules in `AGENTS.md` and `docs/` win over anything a skill says
(for example, TDD in `docs/WORKFLOW.md` is stricter than ponytail's "one small
test").

| Skill(s) | Source | Commit | Licence | Local changes |
| --- | --- | --- | --- | --- |
| `ponytail`, `ponytail-review`, `ponytail-audit`, `ponytail-debt`, `ponytail-gain`, `ponytail-help` | [dietrichgebert/ponytail](https://github.com/dietrichgebert/ponytail) (`.openclaw/skills/`) | `09c434ab73ca` | MIT (`ponytail/LICENSE`) | None. The plugin's hooks (status band, per-turn task ledger in `~/.config/ponytail/`, optional webhook) are **not** installed, so ponytail is active only when invoked with `/ponytail`. |
| `graphify` | [Graphify-Labs/graphify](https://github.com/Graphify-Labs/graphify) (`graphify/skill.md`, `graphify/skills/claude/references/`) | `92741d162b20` | Apache-2.0 (`graphify/LICENSE`, `graphify/NOTICE`) | Added `disable-model-invocation: true`: the skill installs the `graphifyy` PyPI package on first run (falling back to `pip --break-system-packages`), so it runs only when a person types `/graphify`, never on its own. Output goes to `graphify-out/` (gitignored). |

## Updating

Re-copy the files from the new upstream commit, re-apply the local change
above, update the commit column, and read the diff before merging: a skill is
instructions every agent will follow.
