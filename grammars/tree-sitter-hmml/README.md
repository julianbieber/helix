# tree-sitter-hmml

| Field        | Value                                             |
| ------------ | ------------------------------------------------- |
| Type         | tree-sitter grammar (generated C parser, checked in) |
| Owner        | @julianbieber                                     |
| Dependencies | a C compiler — Helix builds it, no tree-sitter CLI |
| Status       | v2 — parses every `.hmml` spec in use with no ERROR nodes |

Syntax highlighting for **HMML** (`.hmml`), the hobby Bevy dialect of the Mental
Model Language. Semantics — diagnostics, completion, goto, references — come from
`hobby-mml-lsp` and `hobby-mml-parser`, never from here. The grammar is
deliberately loose: it recognises the shape of each line well enough to assign
highlight groups, not to validate the language.

## Why this is a fork

HMML used to borrow the work grammar via `grammar = "mml"`. That grammar's
`source.path` pointed into the work checkout, so `.hmml` highlighting worked on
exactly one machine — and an absolute path to a directory that exists nowhere
else fails the *entire* `hx` build, because `helix-term/build.rs` compiles
grammars with `STRICT = true`.

Vendoring here fixes both. The grammar lives in the Helix fork itself, at
`grammars/tree-sitter-hmml`, and `just install-config` declares it with this
checkout's absolute path — so every machine that builds `hx` has it.
`src/parser.c` is committed and there is no external scanner, so Helix builds it
with a C compiler alone.

It also unblocked the real fix. The forked-from grammar modelled **v1**, and a v2
spec did not merely under-highlight — `## components` and friends were not in the
`section_name` set at all, so one unmatched header errored through the rest of the
file. Being ours, the grammar could grow the v2 rules; before the fork that meant
editing a grammar shared with work `.mml` files.

## One line, one item

HMML is line-oriented, so `\n` is deliberately **not** an extra. That is the
single decision the rest of the grammar hangs off.

The v1 grammar put `\n` in `extras`, which made the tree shape blind to line
breaks: a token that failed mid-line had no boundary to resynchronise at, so one
bad line became one `ERROR` node spanning forty. Keeping the newline significant
bounds the damage to the line that caused it — which matters more than it sounds,
because a spec is half-written most of the time it is being looked at.

The one token allowed to cross a newline is `continuation`, a wrapped bullet's
second line. It swallows its own leading newline, which is what makes it
unambiguous against the `_newline` that would otherwise end the bullet: it has to
be indented and must not start a new construct, so a nested `- bullet`, a
`## section`, a `# comment` and a blank line all fail to match and the shorter
`_newline` wins instead.

## What v2 adds

- the five Bevy sections in `section_name` — `components`, `resources`, `events`,
  `systems`, `access`
- `marker Name`, the zero-sized component (grammar.md §8.1)
- `access_entry` — one line of an access block (§8.3), keyed by a closed set
  (`schedule`, `set`, `after`, `before`, `run_if`, `query`, `reads`, `writes`,
  `spawns`, `despawns`, `emits`, `consumes`), so it highlights as metadata rather
  than as a generic `field`. The keys are ordinary identifiers everywhere else —
  a struct member may still be called `set` — because tree-sitter only prefers
  the keyword where the rule is valid.
- a bare `#` line is a comment (the `/hmml-new` templates use it as a spacer)
- wrapped bullet continuation lines

Roles, schedules and access-list membership are **not** checked here; that is
`hobby-mml-parser`'s job. The grammar only assigns shapes.

## Change annotations (`# +` / `# -`)

A spec carries the change a task intends as comment markers on top of its
baseline (grammar.md §10): `# +` marks the line beneath it — and that line's
nested children — as added, `# - <text>` is a baseline line the change removes,
commented out in place. They are ordinary comments to the language, so nothing
else about parsing changes, but they get their own nodes here, `change_added`
and `change_removed`, captured as `@diff.plus` / `@diff.minus` so an annotated
spec reads like a diff instead of a wall of comment-grey.

Both markers take the whole line and outrank `comment`, which matches the same
span. A repeated sign (`# --- divider ---`, `# +++`) is a rule line, not a
marker: it is matched at a higher precedence still and stays a `comment`.
Markers are also accepted inside a `struct` / `enum` body, where an added field
otherwise had nowhere to sit.

The `##` punctuation node is called `section_marker`, not `marker` — `marker` is
now the `marker Name` keyword, and one name for both would be a trap in a query.

## Regenerating

`src/parser.c` is generated from `grammar.js` and committed on purpose: Helix
needs it, and requiring the tree-sitter CLI on every machine would reintroduce
the portability problem this fork removes. After editing `grammar.js`:

```bash
cargo install tree-sitter-cli   # only on the machine making the change
tree-sitter generate            # regenerates src/parser.c
tree-sitter test                # runs test/corpus
just grammars                   # from the Helix checkout root
```

`tree-sitter generate` runs `grammar.js` with Node; if `node` is not on `PATH`,
use `mise exec node@latest -- tree-sitter generate`.

**Keep `name: "hmml"` in `grammar.js`.** Helix `dlsym`s `tree_sitter_<name>`, so
if the grammar name and the exported symbol disagree the library loads nothing
and the language silently falls back to having no parser.

## Wiring

The language is declared in the fork's `languages.toml`. The `[[grammar]]`
entry is not, because Helix reads a local grammar path relative to the working
directory: `just install-config` appends it with this checkout's absolute path
when it copies the config to `~/.config/helix/`.

The highlight queries live only in `runtime/queries/hmml/` — Helix resolves
queries by *language name* — and `tree-sitter.json` points there, so
`tree-sitter highlight` reads the same file Helix does.
