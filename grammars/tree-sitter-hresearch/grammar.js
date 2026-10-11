/**
 * @file Tree-sitter grammar for the `.hresearch` files `hresearch render`
 *   writes — syntax highlighting only. Whether a file is valid is
 *   `hresearch check`'s question, never this grammar's.
 *
 *   A file is a boxed answer card, or a sheet (option matrix or mechanism
 *   figure) opening with a `question:` line. A card's snippet lines are
 *   exposed as `code` and `code_break` nodes for the Rust injection.
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const CARD_WORD = /[^\s─-╿]+/;
const SHEET_WORD = /[^\s|+\/\\<>^=#←-⇿─-◿]+/;
const DRAWING = /[|+\/\\<>^=#←-⇿─-◿]+/;

module.exports = grammar({
  name: "hresearch",

  extras: ($) => [/[ \t]/],

  rules: {
    source_file: ($) => seq(repeat($._nl), choice($.card, $.sheet)),

    _nl: ($) => token(/\r?\n/),

    card: ($) =>
      seq(
        $.card_header,
        repeat(choice($.slot, $.snippet_slot)),
        $.card_footer,
        repeat($._nl),
      ),

    card_header: ($) =>
      seq(
        alias("┌", $.frame),
        $.question,
        $.date,
        alias("┐", $.frame),
        $._nl,
      ),
    question: ($) => repeat1(alias(CARD_WORD, $.word)),
    date: ($) => token(prec(5, /\d{4}-\d{2}-\d{2}/)),

    card_footer: ($) =>
      seq(alias(token(seq("└", /─+/, "┘")), $.frame)),

    _open_label: ($) => alias(token(prec(3, "│ ")), $.frame),
    _open_row: ($) => alias(token(prec(3, /│ {2,}/)), $.frame),
    _close: ($) => alias("│", $.frame),

    slot: ($) => seq($._label_line, repeat($._text_line)),
    _label_line: ($) =>
      seq(
        $._open_label,
        $.label,
        repeat($._inline),
        $._close,
        $._nl,
      ),
    _text_line: ($) =>
      seq($._open_row, repeat($._inline), $._close, $._nl),
    label: ($) =>
      token(prec(5, choice("verdict", "how", "breaks", "source"))),

    snippet_slot: ($) =>
      seq(
        $._open_label,
        alias(token(prec(5, "snippet")), $.label),
        choice(
          seq($.empty_marker, repeat($._inline), $._close, $._nl),
          seq(
            optional($.code),
            $._close,
            alias($._nl, $.code_break),
            repeat($._code_line),
            $._link_line,
          ),
        ),
      ),
    _code_line: ($) =>
      seq(
        $._open_row,
        optional($.code),
        $._close,
        alias($._nl, $.code_break),
      ),
    code: ($) => token(prec(1, /[^│↳\s]([^│\r\n]*[^│\s])?/)),
    _link_line: ($) =>
      seq($._open_row, $.link_arrow, repeat($._inline), $._close, $._nl),

    _inline: ($) =>
      choice(
        $.url,
        $.ref,
        $.quote,
        $.list_marker,
        $.link_arrow,
        $.dash,
        $.empty_marker,
        alias(CARD_WORD, $.word),
      ),
    url: ($) => token(prec(5, /https?:\/\/[^\s│]+/)),
    ref: ($) => token(prec(5, /\[(\d+|unsourced)\]/)),
    quote: ($) => token(prec(4, /"[^"\r\n│]*"/)),
    list_marker: ($) => token(prec(5, /\d+\./)),
    link_arrow: ($) => token(prec(5, "↳")),
    dash: ($) => token(prec(5, "—")),
    empty_marker: ($) => token(prec(6, "empty:")),

    sheet: ($) =>
      seq($.sheet_question, repeat(choice($._nl, $.sheet_line))),
    sheet_question: ($) =>
      seq(
        alias(token(prec(5, "question:")), $.label),
        alias(repeat1(alias(CARD_WORD, $.word)), $.question),
        $._nl,
      ),
    sheet_line: ($) =>
      seq(
        choice(
          seq(
            $.criterion,
            repeat(choice($.url, $.ref, $.drawing, alias(SHEET_WORD, $.word))),
          ),
          repeat1(choice($.url, $.ref, $.drawing, alias(SHEET_WORD, $.word))),
        ),
        $._nl,
      ),
    criterion: ($) =>
      token(
        prec(
          6,
          choice(
            "looks like",
            "cost per frame",
            "jam-sized",
            "bevy precedent",
            "verdict",
          ),
        ),
      ),
    drawing: ($) => token(prec(1, DRAWING)),
  },
});
