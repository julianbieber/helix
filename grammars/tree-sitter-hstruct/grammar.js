/**
 * @file Tree-sitter grammar for HSTRUCT, the hobby repo code-quality language —
 *   syntax highlighting only. Semantics (which metrics exist, whether a budget
 *   holds) live in `hobby-struct-lsp`; this grammar exists so an editor can
 *   colour a `structure.hstruct` file.
 *
 *   Forked from `tree-sitter-hmml`, and it keeps that grammar's one structural
 *   decision: HSTRUCT is line-oriented, so `\n` is deliberately NOT an extra.
 *   One line is one item, and keeping the newline significant is what stops a
 *   malformed line from swallowing the rest of the file into a single ERROR
 *   node — the parser resynchronises at the next line break.
 *
 *   What the colouring has to separate is the durable half of a standard from
 *   the volatile half: the heading and its prose say what the rule is and why,
 *   and a `budget:` is a number that moves. A reader skimming for what changed
 *   is looking for the numbers.
 *
 *   Two lexing rules, both load-bearing. Each construct is recognised by a
 *   single token carrying its own discriminating suffix — `check:` including
 *   the colon — because a construct spelled as separate tokens loses its line
 *   to the whole-line `prose` token on length. And no free-text token may begin
 *   with a space, or it matches the run of whitespace ahead of a keyword and
 *   takes the line on precedence before the keyword is tried. Structural tokens
 *   outrank free text by a wide margin rather than by one; a narrow lead
 *   silently loses and the construct lexes as prose with no error anywhere.
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const FREE_TEXT = /[^ \t\r\n][^\r\n]*/;

module.exports = grammar({
  name: "hstruct",

  extras: ($) => [/[ \t]/],

  rules: {
    source_file: ($) => repeat(choice($._newline, $._item)),

    _newline: ($) => token(/\r?\n/),

    _item: ($) =>
      choice(
        $.comment,
        $.standard_header,
        $.verification,
        $.header_field,
        $.prose,
      ),

    comment: ($) =>
      token(prec(7, seq("#", optional(seq(/[^#\r\n]/, /[^\r\n]*/))))),

    // `## <name>` — the durable half. A standard is named by a sentence, not an
    // identifier, so the whole line is the name.
    standard_header: ($) =>
      seq(
        alias(token(prec(7, /##+/)), $.section_marker),
        field("name", $.standard_name),
      ),
    standard_name: ($) => token(prec(2, FREE_TEXT)),

    // `check:` / `budget:` / `review:` / `audited:` — how the standard is held
    // to. Coloured apart from a header field: these are the lines that move.
    verification: ($) =>
      seq(field("key", $.verification_key), optional(field("value", $.value))),
    verification_key: ($) =>
      token(prec(8, choice("check:", "budget:", "review:", "audited:"))),

    header_field: ($) =>
      seq(field("key", $.header_key), optional(field("value", $.value))),
    header_key: ($) => token(prec(6, /[A-Za-z][A-Za-z0-9._-]*[ \t]*:/)),

    value: ($) => token(prec(2, FREE_TEXT)),

    prose: ($) => token(prec(1, FREE_TEXT)),
  },
});
