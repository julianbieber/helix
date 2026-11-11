; Highlight query for HMML v3 (the hobby Mental Model Language, the review
; delta of one PR). Capture names follow Helix's highlight scopes. Later matches
; win, so more specific patterns (builtin types) come after the generic ones.
;
; The only copy: Helix resolves queries by language name, and
; grammars/tree-sitter-hmml/tree-sitter.json points here too.
;
; NEVER write Helix's inherit-directive syntax in this file, not even inside a
; comment or backticks. Helix matches that directive with an UNANCHORED regex
; (`;+\s*inherits\s*:?\s*([a-z_,()-]+)`), so prose describing it is spliced in
; for real — the mml queries get inlined here, and mml's `(marker)` node does
; not exist in the hmml grammar. That fails the whole query with `invalid node
; type "marker"`, which disables ALL hmml highlighting with no on-screen error.

(comment) @comment

; Header: `key: value`.
(header_key) @attribute
(header_value) @string

; Section headers: `## intent`, `## unit <name> (new) — …`.
(section_header) @markup.heading
(section_header kind: (section_name) @keyword)
(unit_name) @markup.heading
(unit_status) @keyword
(trigger_keyword) @keyword
(trigger_target) @type

; Gutters and the lines they lead.
(gutter_added) @diff.plus
(gutter_removed) @diff.minus
(gutter_changed) @diff.delta
(added_line) @diff.plus
(removed_line) @diff.minus
(changed_line) @diff.delta
(old_text) @diff.minus
(new_text) @diff.plus
(arrow) @operator

; Unit bodies.
(bullet) @markup.list
(keyword) @keyword.control
(invariants) @keyword

; Annotations.
(anchor) @label
(diff_link path: (path) @string.special.path)
(diff_link line: (line_number) @constant.numeric)
(api_keyword) @keyword
(api_target module: (module_name) @namespace)
(api_target member: (fn_name) @function)
(guards_keyword) @keyword

; `## data`.
["struct" "enum"] @keyword.storage.type
(ecs_role) @keyword.storage.modifier
((type_name) @type.builtin
 (#match? @type.builtin "^(String|bool|i8|i16|i32|i64|u8|u16|u32|u64|f32|f64|Uuid|Money|DateTime|Option|Vec|Map|Future|Result|Either|Tuple|Queue|Stream|Entity|Vec2|Vec3|Quat|Color|Timer|Duration|Handle)$"))
(type_name) @type
(field_name) @variable.other.member

; `## api`.
"fn" @keyword.function
(module_name) @namespace
(fn_name) @function
(param_name) @variable.parameter

; `## tests`.
["test" "tests"] @keyword
(test_name) @function
(test_count) @constant.numeric

; Punctuation.
(separator) @punctuation.delimiter
["{" "}" "(" ")" "<" ">"] @punctuation.bracket
["," ":" "::"] @punctuation.delimiter
["->" "@"] @operator
"##" @markup.heading
