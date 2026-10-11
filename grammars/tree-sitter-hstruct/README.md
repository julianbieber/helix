# tree-sitter-hstruct

| Field        | Value                                                     |
| ------------ | --------------------------------------------------------- |
| Type         | tree-sitter grammar (generated C parser, checked in)       |
| Owner        | @julianbieber                                              |
| Dependencies | a C compiler — Helix builds it, no tree-sitter CLI needed  |
| Status       | v1 — parses every adopted file with no ERROR nodes         |

Syntax highlighting for **HSTRUCT** (`.hstruct`). Semantics — diagnostics,
completion, goto — come from `hobby-struct-lsp` and `hobby-struct-parser`, never
from here. The grammar is deliberately loose: it recognises the shape of each
line well enough to assign highlight groups, not to validate the language.

Forked from `tree-sitter-hmml`, and it keeps that grammar's one structural
decision: `\n` is **not** an extra. One line is one item, and a significant
newline is what stops a malformed line from swallowing the rest of the file into
a single ERROR node.

## The colouring that matters

What has to separate is the durable half of a standard from the volatile half:

- `## <name>` and its prose → the rule and why it exists, the part that stays
- `check:` / `budget:` / `review:` / `audited:` → `@keyword`, the lines that move

A reader skimming a diff for what changed is looking for the numbers.

## Two lexing rules, both load-bearing

Most of the file is unmarked prose, and a token matching a whole line of it
outruns every structural token on length. Two consequences:

**Each construct carries its discriminating suffix in one token** — `repo:`
including the colon, `terrain @` including the at-sign. A construct spelled as
separate tokens loses its line to `prose` every time.

**No free-text token may begin with a space.** One that does matches the
whitespace ahead of a keyword and takes the line before the keyword is tried;
the symptom is `! layer model  a` lexing with no keyword at all.

Structural tokens also outrank free text by a wide margin rather than by one. A
structural token shorter than the line it introduces — `owns` against a whole
`owns` line — needs the gap to win, and a narrow lead silently loses.

## Invariants for this fork

The same two `tree-sitter-hmml` carries:

- The grammar name, the exported symbol in `src/parser.c`, and `name:` in
  `grammar.js` must all say `hstruct`. Helix `dlsym`s `tree_sitter_<name>`, and a
  mismatch silently yields no parser.
- **`src/parser.c` stays committed**, so a machine needs only a C compiler.
  Requiring the tree-sitter CLI everywhere would reintroduce the portability
  problem the fork exists to avoid.

`just install-config` declares the grammar with this checkout's absolute path,
and the queries live only in `runtime/queries/hstruct/`.

## Tests

`tree-sitter test` runs `test/corpus/lines.txt`, which pins the one thing worth
pinning: that each of the three line kinds is recognised, and that prose is never
mistaken for a construct.
