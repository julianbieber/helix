# tree-sitter-hresearch

| Field        | Value                                                     |
| ------------ | --------------------------------------------------------- |
| Type         | tree-sitter grammar (generated C parser, checked in)       |
| Owner        | @julianbieber                                              |
| Dependencies | a C compiler — Helix builds it, no tree-sitter CLI needed  |
| Status       | v1 — parses every existing research file with no ERROR nodes |

Syntax highlighting for the `.hresearch` files `hresearch render` writes (see
`skills/research/README.md` in hobby-tooling). Whether a file is valid is `hresearch check`'s
job; this grammar only recognises each line's shape well enough to colour it.

Two file shapes, told apart by the first token:

- **card** — the boxed answer card, `┌ … ┐` to `└ … ┘`. Slot labels, the
  question, the date, `[n]` refs, URLs, quotes and the frame are coloured, and
  each `snippet` line is a `code` node that `runtime/queries/hresearch/injections.scm` hands to
  the Rust grammar.
- **sheet** — the option matrix and the mechanism figure, which open with
  `question:`. Criteria, refs, URLs and drawing characters are coloured.

## The Rust injection

The injection is **combined**: every `code` node and the `code_break` after it
form one Rust document, so a multi-line expression parses as one and a `//`
comment ends at its own line. A `code` token stops at the last non-space
before the closing `│`, so Rust never sees the frame or its padding.

Snippet indentation is not part of the `code` token. Rust highlighting does not
depend on it.

## Invariants

- The grammar name, the exported symbol in `src/parser.c`, and `name:` in
  `grammar.js` must all say `hresearch`. Helix `dlsym`s `tree_sitter_<name>`,
  and a mismatch silently yields no parser.
- **`src/parser.c` stays committed**, so a machine needs only a C compiler.

`just install-config` declares the grammar with this checkout's absolute path;
the language is in `languages.toml` and both query files live only in
`runtime/queries/hresearch/`. `just install-config` then `just grammars` is all
a machine needs.

## Tests

`tree-sitter test` runs `test/corpus/cards.txt`: snippet lines parse as `code`
(a blank one included), an `empty:` snippet stays text, a matrix criterion is
recognised only at line start, and a figure's `│` is drawing, not a card frame.
