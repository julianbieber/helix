# tree-sitter-hmml

| Field        | Value                                             |
| ------------ | ------------------------------------------------- |
| Type         | tree-sitter grammar (generated C parser, checked in) |
| Owner        | @julianbieber                                     |
| Dependencies | a C compiler — Helix builds it, no tree-sitter CLI |
| Status       | v3 — the review delta of one PR, with the Bevy layer |

Syntax highlighting for **HMML** (`.hmml`), the hobby dialect of the Mental
Model Language: the review delta of one PR, as `/hmml-extract` writes it. The
language is defined in `hobby-tooling`'s `lsps/hobby-mml-lsp/grammar.md`.
Semantics — diagnostics, completion, goto, references — come from
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

Being ours, the grammar can also carry what HMML adds to the work dialect
without editing a grammar shared with work `.mml` files.

## One line, one item

The grammar has no `extras`: every space is part of a token, so column 0 is
always the token right after a newline. That is what lets the context gutter —
a single space — be a token of its own beside `+`, `-` and `~`, and what bounds
a malformed line's `ERROR` node to that line. Every line ends in a newline
token; an unterminated last line is recovered with a zero-width one.

## Taken from the work grammar

`grammar.js` is the work `tree-sitter-mml` v2 grammar with `name: "hmml"`, so a
fix there applies here as it is. The highlight queries are that grammar's
queries with the captures below added. The gutter and the two halves of a `~`
line are captured as `@diff.plus` / `@diff.minus` / `@diff.delta`, so a delta
reads like a diff.

## The Bevy layer

- `unit_trigger` — `in <Schedule>` or `on <Event>` after a unit's name and
  status (`trigger_keyword`, `trigger_target`), captured as a keyword and a type.
- `ecs_role` — `component`, `resource`, `event`, `message` or `state` before a
  `struct` / `enum` in `## data`, captured as `@keyword.storage.modifier`.
  The role is one token with its trailing whitespace, so a field named `state`
  or `event` still lexes as a field: without the whitespace in the token, the
  keyword would win at the start of every member line.
- Bevy's `Entity Vec2 Vec3 Quat Color Timer Duration Handle` highlight as
  builtin types.

Whether a role, a schedule or an event is right is `hobby-mml-parser`'s
question, not this grammar's.

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
