; Highlight query for HMML (the hobby Mental Model Language dialect).
; Capture names follow Helix's highlight scopes. Later matches win, so more
; specific patterns (e.g. builtin types) come after the generic ones.
;
; Installed to <helix-checkout>/runtime/queries/hmml/ by `just wire-helix` — Helix
; resolves queries by language name. This file is the source; do not edit the
; installed copy. It deliberately does NOT `; inherits: mml`: that made hobby
; highlighting depend on the work grammar's queries being present.

(comment) @comment

; Section headers: `## modules` etc.
(section_header (marker) @punctuation.special)
(section_name) @keyword.directive

; Header fields: `system: value`, `kind: workflow`, `repo: …`.
(field key: (identifier) @keyword)
(value) @string

; `in:` / `out:` declarations.
"in" @keyword
"out" @keyword

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
 (#match? @type.builtin "^(String|bool|i8|i16|i32|i64|u8|u16|u32|u64|f32|f64|Uuid|Money|DateTime|Option|Vec|Map|Queue|Stream)$"))

; Modules: `Name — responsibility @ path`.
(module_entry name: (identifier) @namespace)
(separator) @operator
(path) @string.special.path

; Cross-spec references: `@ spec system/unit` (grammar §5.4).
(spec_keyword) @keyword.directive
(spec_ref) @string.special.path

; Type imports: `use system/unit: Type, Type` (grammar §4.5). The ref reuses the
; `spec_ref` highlight above; the imported names are types.
"use" @keyword.control.import
(use_import type: (identifier) @type)

; Behavior control-flow keywords.
(keyword) @keyword.control

; `where:` symbol-binding block (grammar §5.3).
"where" @keyword.control
(binding symbol: (identifier) @variable)
(binding_value) @constant.numeric

; Punctuation.
["{" "}"] @punctuation.bracket
["<" ">"] @punctuation.bracket
["," ":"] @punctuation.delimiter
"-" @punctuation.special
"=" @operator
"@" @operator
