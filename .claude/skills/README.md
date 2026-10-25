# Vendored agent skills

Third-party skills, copied verbatim at a pinned commit so they cannot change
under us. Project rules in `AGENTS.md` and `docs/` win over anything a skill says
(for example, TDD in `docs/WORKFLOW.md` is stricter than ponytail's "one small
test").

| Skill(s) | Source | Commit | Licence | Local changes |
| --- | --- | --- | --- | --- |
| `ponytail`, `ponytail-review`, `ponytail-audit`, `ponytail-debt`, `ponytail-gain`, `ponytail-help` | [dietrichgebert/ponytail](https://github.com/dietrichgebert/ponytail) (`.openclaw/skills/`) | `09c434ab73ca` | MIT (`ponytail/LICENSE`) | `ponytail` gets `disable-model-invocation: true`: its description targets "any coding task" and it stays on for the session, so it runs only when a person types `/ponytail` (its "trivial changes need no test" would otherwise compete with our TDD rule). The plugin's hooks (status band, per-turn task ledger in `~/.config/ponytail/`, optional webhook) are **not** installed, so ponytail is active only when invoked with `/ponytail`. |
| `graphify` | [Graphify-Labs/graphify](https://github.com/Graphify-Labs/graphify) (`graphify/skill.md`, `graphify/skills/claude/references/`) | `92741d162b20` | Apache-2.0 (`graphify/LICENSE`, `graphify/NOTICE`, `graphify/LICENSE-MIT`) | Added `disable-model-invocation: true`: the skill installs the `graphifyy` PyPI package on first run (falling back to `pip --break-system-packages`), so it runs only when a person types `/graphify`, never on its own. Output goes to `graphify-out/` (gitignored). |

## Rules for running `/graphify` here

graphify's own instructions go further than this project allows. When a person
runs `/graphify`, agents must:

- **Ask before installing.** Never install `graphifyy` without the person's OK,
  never with `--break-system-packages`, and pin the version that was reviewed.
  Prefer `uv tool install graphifyy==<version>` run by the person.
- **Keep data on the machine.** Do not run it with `GEMINI_API_KEY` or
  `GOOGLE_API_KEY` set (that sends document and image contents to Google). Never
  use `--neo4j-push` or `--falkordb-push`.
- **No persistent changes.** Never run `graphify hook install`,
  `graphify claude install`, or `--watch`, and do not clone other repositories
  (`~/.graphify/repos`) unless the person asks for exactly that.
- Never remove `disable-model-invocation` from either skill.

## Updating

Re-copy the files from the new upstream commit, re-apply the local change
above, update the commit column, and read the diff before merging: a skill is
instructions every agent will follow.
