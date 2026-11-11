/**
 * @file Tree-sitter grammar for HMML v3 (the hobby Mental Model Language, the
 *   review delta of one PR) — syntax highlighting only. Diagnostics and every
 *   other check live in `hobby-mml-parser` / `hobby-mml-lsp`; this grammar
 *   recognises the shape of each line well enough to assign highlight groups
 *   and is deliberately loose about what the spec rejects (section order,
 *   nesting, annotation order, whether a role or a schedule is right).
 *
 *   The grammar is line-oriented and has no `extras`: every space is part of a
 *   token, so column 0 is always the token right after a newline. That is what
 *   lets the context gutter (a single space) be a token of its own. Every line
 *   ends in a newline token; tree-sitter recovers an unterminated last line by
 *   inserting a zero-width one.
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const padded = (re) => token(new RegExp(`[ \\t]*${re}[ \\t]*`));

const GUTTERS = ["added", "removed", "changed", "context"];
const CONTENTS = ["step", "data", "api", "tests"];

/**
 * The line rules `_<content>_<gutter>_line`: a gutter, then optionally the
 * content indented under it, then the newline. Each is aliased to
 * `<gutter>_line` where it is used, so every section shares the four line node
 * types while holding its own content.
 */
function lineRules() {
  /** @type {Record<string, ($: GrammarSymbols<string>) => RuleOrLiteral>} */
  const rules = {};
  for (const content of CONTENTS) {
    for (const gutter of GUTTERS) {
      rules[`_${content}_${gutter}_line`] = ($) =>
        seq(
          $[`gutter_${gutter}`],
          optional(seq(optional($._ws), $[`_${content}_content`])),
          $._nl,
        );
    }
  }
  return rules;
}

/**
 * A section: its header line, then blank, comment and body lines.
 * @param {GrammarSymbols<string>} $
 * @param {string} head the header rule
 * @param {string} content the content kind of its body lines
 */
function section($, head, content) {
  return seq(
    alias($[head], $.section_header),
    $._nl,
    repeat(
      choice(
        $._nl,
        $._comment_line,
        ...GUTTERS.map((g) => alias($[`_${content}_${g}_line`], $[`${g}_line`])),
      ),
    ),
  );
}

/**
 * `## <name>` for a section whose header carries nothing else.
 * @param {GrammarSymbols<string>} $
 * @param {string} name
 */
function sectionHead($, name) {
  return seq("##", $._ws, field("kind", alias(name, $.section_name)));
}

module.exports = grammar({
  name: "hmml",

  extras: (_) => [],

  rules: {
    source_file: ($) =>
      seq(
        repeat(choice($._nl, $._comment_line, $.header_line)),
        repeat($._section),
      ),


    _nl: (_) => token(/[ \t]*\r?\n/),
    _ws: (_) => token(/[ \t]+/),

    comment: (_) => token(/#([ \t][^\r\n]*)?/),
    _comment_line: ($) => seq($.comment, $._nl),

    gutter_added: (_) => "+",
    gutter_removed: (_) => "-",
    gutter_changed: (_) => "~",
    gutter_context: (_) => " ",

    identifier: (_) => /[A-Za-z_][A-Za-z0-9_]*/,
    number: (_) => /[0-9]+/,

    prose: (_) =>
      token(prec(-1, /([^\r\n@^→]|@[^ \t\r\n]|\^[^a-z\r\n])+/)),

    separator: (_) => padded("(—|--)"),
    arrow: (_) => padded("→"),


    header_line: ($) =>
      seq(
        field("key", alias($.identifier, $.header_key)),
        alias(padded(":"), ":"),
        optional(field("value", alias(/[^\r\n]+/, $.header_value))),
        $._nl,
      ),


    _section: ($) =>
      choice(
        $.intent_section,
        $.data_section,
        $.unit_section,
        $.api_section,
        $.tests_section,
        $.other_section,
      ),

    intent_section: ($) => section($, "_intent_head", "step"),
    data_section: ($) => section($, "_data_head", "data"),
    unit_section: ($) => section($, "_unit_head", "step"),
    api_section: ($) => section($, "_api_head", "api"),
    tests_section: ($) => section($, "_tests_head", "tests"),
    other_section: ($) => section($, "_other_head", "step"),

    _intent_head: ($) => sectionHead($, "intent"),
    _data_head: ($) => sectionHead($, "data"),
    _api_head: ($) => sectionHead($, "api"),
    _tests_head: ($) => sectionHead($, "tests"),
    _other_head: ($) =>
      seq(
        "##",
        optional(seq($._ws, field("name", alias($.prose, $.section_name)))),
      ),

    _unit_head: ($) =>
      seq(
        "##",
        $._ws,
        field("kind", alias("unit", $.section_name)),
        $._ws,
        field("name", $.unit_name),
        optional(seq($._ws, field("status", $.unit_status))),
        optional(seq($._ws, field("trigger", $.unit_trigger))),
        optional(
          seq($.separator, optional($._text), optional($._annotations)),
        ),
      ),
    unit_name: (_) => /[A-Za-z0-9_][A-Za-z0-9_.-]*/,
    unit_status: (_) => choice("(new)", "(removed)"),
    unit_trigger: ($) =>
      seq(
        alias(choice("in", "on"), $.trigger_keyword),
        $._ws,
        field("target", alias(/[A-Za-z_][^ \t\r\n]*/, $.trigger_target)),
      ),


    _step_content: ($) =>
      choice($.step, $.invariants, seq($._text, optional($._annotations))),

    step: ($) =>
      seq(
        $.bullet,
        optional($.keyword),
        optional($._text),
        optional($._annotations),
      ),
    bullet: (_) => token(/-[ \t]+/),
    keyword: (_) =>
      token(
        prec(
          2,
          choice(
            /if[ \t]/,
            /else:/,
            /for each[ \t]/,
            /while[ \t]/,
            /try:/,
            /on error[ \t]/,
          ),
        ),
      ),
    invariants: ($) => seq("invariants:", optional($._text)),

    _text: ($) => choice($.prose, $.change),
    change: ($) =>
      seq(
        optional(field("old", alias($.prose, $.old_text))),
        $.arrow,
        optional(field("new", alias($.prose, $.new_text))),
      ),

    _data_content: ($) =>
      choice($.type_definition, $.member_line, alias(padded("}"), "}")),

    type_definition: ($) =>
      seq(
        optional(field("role", $.ecs_role)),
        choice("struct", "enum"),
        $._ws,
        field("name", alias($.identifier, $.type_name)),
        optional(
          seq(
            alias(padded("\\{"), "{"),
            optional($._members),
            optional(alias(padded("}"), "}")),
          ),
        ),
        optional($._change_tail),
        optional($._annotations),
      ),
    ecs_role: (_) =>
      token(
        seq(choice("component", "resource", "event", "message", "state"), /[ \t]+/),
      ),
    _members: ($) =>
      seq($.member, repeat(seq($._comma, $.member)), optional($._comma)),
    member: ($) =>
      seq(
        field("name", alias($.identifier, $.field_name)),
        optional(seq($._colon, field("type", $.type))),
      ),
    member_line: ($) =>
      seq(
        $.member,
        optional($._comma),
        optional($._change_tail),
        optional($._annotations),
      ),

    type: ($) =>
      seq(
        field("name", alias($.identifier, $.type_name)),
        optional(
          seq("<", $.type, repeat(seq($._comma, $.type)), alias(padded(">"), ">")),
        ),
      ),

    _change_tail: ($) => seq($.arrow, optional(alias($.prose, $.new_text))),

    _colon: (_) => alias(padded(":"), ":"),
    _comma: (_) => alias(padded(","), ","),

    _api_content: ($) => choice($.module_line, $.fn_entry),

    module_line: ($) =>
      seq(
        field("name", alias($.identifier, $.module_name)),
        $.separator,
        optional($._text),
        optional($._annotations),
      ),

    fn_entry: ($) =>
      seq(
        "fn",
        $._ws,
        optional(
          seq(field("receiver", alias($.identifier, $.type_name)), "::"),
        ),
        field("name", alias($.identifier, $.fn_name)),
        optional(
          seq(
            alias(padded("\\("), "("),
            optional(
              seq($.param, repeat(seq($._comma, $.param)), optional($._comma)),
            ),
            alias(padded("\\)"), ")"),
          ),
        ),
        optional(seq(alias(padded("->"), "->"), field("return", $.type))),
        optional($._change_tail),
        optional($._annotations),
      ),
    param: ($) =>
      seq(
        field("name", alias($.identifier, $.param_name)),
        $._colon,
        field("type", $.type),
      ),

    _tests_content: ($) => choice($.test_entry, $.test_group),

    test_entry: ($) =>
      seq(
        "test",
        $._ws,
        field("name", alias($.identifier, $.test_name)),
        $.separator,
        optional($._text),
        optional($._annotations),
      ),
    test_group: ($) =>
      seq(
        "tests",
        $._ws,
        field("count", alias($.number, $.test_count)),
        $.separator,
        optional($._text),
        optional($._annotations),
      ),

    ...lineRules(),


    _annotations: ($) =>
      repeat1(
        seq(
          optional($._ws),
          choice($.anchor, $.diff_link, $.api_ref, $.guards),
        ),
      ),

    anchor: (_) => /\^[a-z][a-z0-9_]*/,

    diff_link: ($) =>
      seq(
        alias(padded("@"), "@"),
        field("path", $.path),
        optional(seq(":", field("line", alias($.number, $.line_number)))),
      ),
    path: (_) => /[^ \t\r\n@:]+/,

    api_ref: ($) =>
      seq(
        alias(token(/[ \t]*@[ \t]+api[ \t]+/), $.api_keyword),
        $.api_target,
        repeat(seq($._comma, $.api_target)),
      ),
    api_target: ($) =>
      seq(
        field("module", alias($.identifier, $.module_name)),
        repeat1(seq("::", field("member", alias($.identifier, $.fn_name)))),
      ),

    guards: ($) =>
      seq(
        alias(token(/[ \t]*@[ \t]+guards[ \t]+/), $.guards_keyword),
        $.anchor,
        repeat(seq($._comma, $.anchor)),
      ),
  },
});
