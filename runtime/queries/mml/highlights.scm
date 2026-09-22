; Highlight query for MML (Mental Model Language).
; Capture names follow Helix's highlight scopes. Later matches win, so more
; specific patterns (e.g. builtin types) come after the generic ones.

(comment) @comment

; Change annotations (grammar §10): `# +` marks the line beneath it as added,
; `# - <text>` is a baseline line the change removes. Plain comments to the
; language, coloured like a diff so the intended change reads at a glance.
(change_added) @diff.plus
(change_removed) @diff.minus

; Section headers: `## modules` etc.
(section_header (marker) @punctuation.special)
(section_name) @keyword.directive

; Header fields: `system: value`, `kind: workflow`, `repo: …`.
(field key: (identifier) @keyword)
(value) @string

; `in:` / `out:` declarations, and a rollout's `from:` / `to:` (grammar §4.4).
"in" @keyword
"out" @keyword
"from" @keyword
"to" @keyword

; struct / enum definitions.
"struct" @keyword
"enum" @keyword
(type_definition name: (identifier) @type)
(member name: (identifier) @variable.other.member)
; Endpoint parameter source: `field: Type @query` (grammar §4.1).
(member source: (identifier) @attribute)

; Type expressions.
(type name: (identifier) @type)
((type name: (identifier) @type.builtin)
 (#match? @type.builtin "^(String|bool|i8|i16|i32|i64|u8|u16|u32|u64|f32|f64|Uuid|Money|DateTime|Option|Vec|Map|Queue|Stream|Future|Result|Either|Tuple)$"))

; Modules: `Name — responsibility @ path`.
(module_entry name: (identifier) @namespace)
(separator) @operator
(path) @string.special.path

; A module spec's public functions (grammar §11).
"fn" @keyword.function
"->" @operator
(api_entry name: (identifier) @function)
(api_entry receiver: (identifier) @type)
(param name: (identifier) @variable.parameter)

; Cross-spec references: `@ spec unit`, `@ spec unit::function` (grammar §5.4).
(spec_keyword) @keyword.directive
(spec_ref) @string.special.path

; Type imports: `use system/unit: Type, Type` (grammar §4.5). The ref reuses the
; `spec_ref` highlight above; the imported names are types.
"use" @keyword.control.import
(use_import type: (identifier) @type)

; Behavior control-flow keywords.
(keyword) @keyword.control

; `where:` symbol-binding block (grammar §5.3).
(where_clause) @keyword.control
(binding symbol: (identifier) @variable)
(binding_value) @constant.numeric

; `given:` preconditions block (grammar §5.5). The trailing `@ check` names how
; to check the fact, so it reads like a path/command rather than prose.
(given_clause) @keyword.control
(precondition check: (path) @string.special.path)

; Punctuation.
["{" "}"] @punctuation.bracket
["<" ">"] @punctuation.bracket
["," ":"] @punctuation.delimiter
"-" @punctuation.special
"=" @operator
"@" @operator
