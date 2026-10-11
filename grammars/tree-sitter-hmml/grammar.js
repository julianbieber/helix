/**
 * @file Tree-sitter grammar for HMML (the hobby Mental Model Language dialect) —
 *   syntax highlighting only. Semantics (diagnostics, references, …) live in the
 *   `hobby-mml-lsp` server; this grammar exists purely so an editor can colour a
 *   `.hmml` spec. It is deliberately loose: it recognises the shape of each line
 *   well enough to assign highlight groups, not to fully validate the language.
 *
 *   Forked from the work `tree-sitter-mml`, which HMML used to borrow via
 *   `grammar = "mml"`. That borrow meant highlighting only worked on a machine
 *   with the work checkout. This copy lives in the Helix fork, so every machine
 *   has it — and, being ours, it covers the v2 sections (`## components`,
 *   `## systems`, `## access`) that the v1 grammar rejects outright.
 *
 *   HMML is line-oriented, so `\n` is deliberately NOT an extra: one line is one
 *   item. Keeping the newline significant is what stops a malformed line from
 *   swallowing the rest of the file into a single ERROR node — the parser
 *   resynchronises at the next line break.
 *
 *   Known limit: `prose`/`path`/`continuation` stop at `@` (so `@ spec`
 *   annotations lex as their own nodes); a literal mid-prose `@` not starting an
 *   annotation produces a local ERROR node, which is acceptable for colouring.
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

function sepBy1(sep, rule) {
  return seq(rule, repeat(seq(sep, rule)));
}
function sepBy(sep, rule) {
  return optional(sepBy1(sep, rule));
}

module.exports = grammar({
  name: "hmml",

  word: ($) => $.identifier,

  // Horizontal whitespace only. Newlines carry meaning (see the file comment),
  // and indentation is skipped — an item's meaning comes from its first token,
  // never from how deeply it is nested.
  extras: ($) => [/[ \t]/],

  rules: {
    // Blank lines and the newline ending each item are the only place `_newline`
    // is consumed at top level; `continuation` (below) is the one token allowed
    // to reach across one.
    source_file: ($) => repeat(choice($._newline, $._item)),

    _newline: ($) => token(/\r?\n/),

    _item: ($) =>
      choice(
        $.change_added,
        $.change_removed,
        $.comment,
        $.section_header,
        $.io_declaration,
        $.use_import,
        $.type_definition,
        $.marker_declaration,
        $.module_entry,
        $.api_entry,
        $.where_clause,
        $.access_entry,
        $.binding,
        $.field,
        $.bullet,
      ),

    // A single `#` starts a comment; `##` is a section header (handled below).
    // The rest of the line is optional so a bare `#` — used as a spacer in the
    // `/hmml-new` templates — is a comment too. `##` still wins by being the
    // longer match.
    //
    // The second form is a rule/divider line (`# --- x ---`, `# +++`): a repeated
    // sign, matched at the highest precedence so it stays a comment instead of
    // lexing as a change marker plus a stray bullet.
    comment: ($) =>
      choice(
        token(seq("#", optional(seq(/[^#\r\n]/, /[^\r\n]*/)))),
        token(prec(2, seq("#", /[ \t]*/, /[-+][-+]+[^\r\n]*/))),
      ),

    // Change annotations (grammar §10): `# +` marks the line beneath it (with
    // that line's nested children) as added, and `# - <text>` is a baseline line
    // this change removes, commented out in place. They are plain comments to
    // the language — they get their own nodes here only so an editor can colour
    // them like a diff. Each takes the whole line and outranks `comment`, which
    // matches the same span.
    change_added: ($) => token(prec(1, seq("#", /[ \t]*/, "+", /[^\r\n]*/))),
    change_removed: ($) => token(prec(1, seq("#", /[ \t]*/, "-", /[^\r\n]*/))),

    section_header: ($) =>
      seq(
        alias(token(/##+/), $.section_marker),
        field("name", $.section_name),
      ),
    // The classic four (v1) plus the Bevy sections (v2, grammar.md §8) and the
    // module dialect's `api` (§11). Which of these a given `kind:` may use is
    // the LSP's business, not the grammar's.
    section_name: ($) =>
      choice(
        "modules",
        "data",
        "behavior",
        "api",
        "invariants",
        "components",
        "resources",
        "events",
        "systems",
        "access",
      ),

    // `in:` / `out:` name the unit's input/output type. Classic kinds only —
    // a plugin or system passes data through the World instead.
    io_declaration: ($) =>
      seq(field("direction", choice("in", "out")), ":", field("type", $.type)),

    // Type import: `use system/unit: Type, Type` (grammar §4.5). The ref reuses
    // the `spec_ref` node (same shape/highlight as an `@ spec` target); the
    // imported type names are plain identifiers after the `:`.
    //
    // `use extern crate::path: Type, …` (grammar §4.8) is the same line with a
    // crate path in place of the spec ref. The `extern` keyword must be
    // followed by a path token, so `use extern: Type` — an import from a unit
    // that happens to be called `extern` — still matches the first branch.
    use_import: ($) =>
      seq(
        "use",
        choice(
          seq(
            field(
              "ref",
              alias(
                token(
                  prec(2, /[A-Za-z][A-Za-z0-9._-]*(\/[A-Za-z][A-Za-z0-9._-]*)?/),
                ),
                $.spec_ref,
              ),
            ),
            ":",
          ),
          seq(
            alias(token(prec(3, /extern[ \t]+/)), $.extern_keyword),
            field("crate", $.crate_path),
            ":",
          ),
        ),
        sepBy1(",", field("type", $.identifier)),
      ),

    // A `::`-separated Rust path, lexed immediately after the `extern` keyword
    // (which swallows its own trailing whitespace) so it never competes with
    // the `spec_ref` token of the other branch.
    crate_path: ($) =>
      token.immediate(prec(3, /[A-Za-z_][A-Za-z0-9_]*(::[A-Za-z_][A-Za-z0-9_]*)*/)),

    // Header key/value: `system: …`, `unit: …`, `kind: …`, `repo: …`.
    field: ($) =>
      seq(field("key", $.identifier), ":", optional(field("value", $.value))),
    value: ($) => token(prec(1, /[^\r\n]+/)),

    // One line of a system's access block (grammar §8.3), whether indented under
    // a `## systems` entry or unindented under `## access`. The key set is
    // closed, which is what lets it highlight distinctly from a generic `field`;
    // role-checking the value is the LSP's job.
    access_entry: ($) =>
      seq(field("key", $.access_key), ":", optional(field("value", $.value))),
    access_key: ($) =>
      choice(
        "schedule",
        "set",
        "after",
        "before",
        "run_if",
        "query",
        "reads",
        "writes",
        "spawns",
        "despawns",
        "emits",
        "consumes",
      ),

    // `struct`/`enum` block. Members are treated uniformly (struct fields carry
    // a `: Type`, enum variants do not) — good enough for colouring.
    //
    // Both the `@ <path>` and the body are optional (grammar §4.7): a type that
    // references real code may name only the members it changes, or none at all.
    type_definition: ($) =>
      seq(
        field("keyword", choice("struct", "enum")),
        field("name", $.identifier),
        optional(seq("@", field("path", $.type_path))),
        optional(
          seq(
            "{",
            repeat(
              choice(
                $.member,
                ",",
                $._newline,
                $.comment,
                $.change_added,
                $.change_removed,
              ),
            ),
            "}",
          ),
        ),
      ),
    member: ($) =>
      seq(
        // `+` adds the member to the referenced type, `-` removes it; unmarked
        // means "already there" (grammar §4.7).
        optional(field("delta", $.delta)),
        field("name", $.identifier),
        optional(seq(":", field("type", $.type))),
        // Optional endpoint parameter source: `field: Type @query` (grammar §4.1).
        optional(seq("@", field("source", $.identifier))),
      ),
    delta: ($) => token(prec(4, choice("+", "-"))),

    // A type declaration's `@ <path>`. Unlike `path`, it must also stop at `{`,
    // because a body may follow on the same line.
    type_path: ($) => token(prec(2, /[^@{\r\n]+/)),

    // `marker Name [@ <path>]` — a zero-sized component (grammar §8.1). Legal
    // only in `## components`, which the LSP checks; here it is just a line
    // shape.
    marker_declaration: ($) =>
      seq(
        "marker",
        field("name", $.identifier),
        optional(seq("@", field("path", $.type_path))),
      ),

    type: ($) =>
      seq(
        field("name", $.identifier),
        optional(seq("<", sepBy(",", $.type), ">")),
      ),

    // The `where:` marker opening the binding block (grammar §5.3). Its own rule
    // (not a generic `field`) so its absent value can't swallow the first binding
    // line across the newline.
    where_clause: ($) => prec(2, seq("where", ":")),

    // A `where:` binding: `Symbol = value [@ config-source]` (grammar §5.3).
    binding: ($) =>
      seq(
        field("symbol", $.identifier),
        "=",
        optional(field("value", $.binding_value)),
        optional(seq("@", field("config", $.path))),
      ),
    binding_value: ($) => token(prec(2, /[^@\r\n]+/)),

    // `Name — responsibility [@ path] [@ spec ref]` (em dash or `--`). Also the
    // shape of a `## systems` entry (grammar §8.2), which is a module line
    // followed by an indented access block.
    module_entry: ($) =>
      seq(
        field("name", $.identifier),
        $.separator,
        optional(field("responsibility", $.responsibility)),
        optional(seq("@", field("path", $.path))),
        optional($.spec_annotation),
      ),
    separator: ($) => token(choice("—", "--")),

    // A module spec's public function (grammar §11):
    // `fn [Type::]name(param: Type, …) [-> Type] [@ path] [@ spec ref]`.
    // The bullets describing it are ordinary `bullet` items nested beneath.
    api_entry: ($) =>
      seq(
        "fn",
        optional(seq(field("receiver", $.identifier), "::")),
        field("name", $.identifier),
        "(",
        sepBy(",", $.param),
        ")",
        optional(seq("->", field("return", $.type))),
        optional(seq("@", field("path", $.path))),
        optional($.spec_annotation),
      ),
    param: ($) => seq(field("name", $.identifier), ":", field("type", $.type)),
    responsibility: ($) => token(prec(1, /[^@\r\n]+/)),
    path: ($) => token(prec(1, /[^@\r\n]+/)),

    // Cross-spec reference: `@ spec system/unit` or `@ spec unit` (grammar
    // §5.4), optionally naming one member of it — `@ spec unit::function` or
    // `@ spec unit::Type::method` (§11). The keyword token requires trailing
    // whitespace and outranks the free-text tokens, so `@ spec_utils/x.py`
    // still lexes as a `path`.
    spec_annotation: ($) =>
      seq(
        "@",
        alias(token(prec(2, /spec[ \t]+/)), $.spec_keyword),
        field(
          "target",
          alias(
            token.immediate(
              prec(
                2,
                /[A-Za-z][A-Za-z0-9._-]*(\/[A-Za-z][A-Za-z0-9._-]*)?(::[A-Za-z_][A-Za-z0-9_]*){0,2}/,
              ),
            ),
            $.spec_ref,
          ),
        ),
      ),

    // Behavior / invariant bullet. Leading control-flow keyword is highlighted;
    // the rest of the line is prose. The keyword token outranks `prose` so it
    // wins at the start of a step.
    bullet: ($) =>
      seq(
        "-",
        optional(choice($.control_flow, $.prose)),
        optional($.spec_annotation),
        repeat(seq($.continuation, optional($.spec_annotation))),
      ),
    control_flow: ($) => seq(field("keyword", $.keyword), optional($.prose)),
    keyword: ($) =>
      token(
        prec(3, choice("if", "while", "else", "try", "for each", "on error")),
      ),
    prose: ($) => token(prec(1, /[^@\r\n]+/)),

    // A bullet whose prose wraps onto the following line. The token swallows its
    // own leading newline — that is what makes it unambiguous against the
    // `_newline` that ends the bullet. It must be indented and must not start a
    // new construct, so `- nested`, `## section`, `# comment` and a blank line
    // all fail to match here and the shorter `_newline` wins instead.
    continuation: ($) => token(/\r?\n[ \t]+[^-#@ \t\r\n][^@\r\n]*/),

    identifier: ($) => /[A-Za-z_][A-Za-z0-9_]*/,
  },
});
