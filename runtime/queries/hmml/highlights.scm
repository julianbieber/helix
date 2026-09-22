; Highlight query for HMML (the hobby Mental Model Language dialect).
; Capture names follow Helix's highlight scopes. Later matches win, so more
; specific patterns (e.g. builtin types) come after the generic ones.
;
; Installed to <helix-checkout>/runtime/queries/hmml/ by `just wire-helix` — Helix
; resolves queries by language name. This file is the source; do not edit the
; installed copy. It deliberately does not pull in the work mml queries: that
; made hobby highlighting depend on the work grammar's queries being present.
;
; NEVER write Helix's inherit-directive syntax in this file, not even inside a
; comment or backticks. Helix matches that directive with an UNANCHORED regex
; (`;+\s*inherits\s*:?\s*([a-z_,()-]+)`), so prose describing it is spliced in
; for real — the mml queries get inlined here, and mml's `(marker)` node does
; not exist in the hmml grammar. That fails the whole query with `invalid node
; type "marker"`, which disables ALL hmml highlighting with no on-screen error.

(comment) @comment

; Change annotations (grammar §10): `# +` marks the line beneath it as added,
; `# - <text>` is a baseline line the change removes. Plain comments to the
; language, coloured like a diff so the intended change reads at a glance.
(change_added) @diff.plus
(change_removed) @diff.minus

; Section headers: `## modules` etc.
(section_header (section_marker) @punctuation.special)
(section_name) @keyword.directive

; Header fields: `system: value`, `kind: workflow`, `repo: …`.
(field key: (identifier) @keyword)
(value) @string

; Access-block keys: `schedule:`, `query:`, `reads:` … (grammar §8.3). A closed
; set in the grammar, so they read as metadata rather than as a generic field
; key — a `## systems` entry's indented block is the system's whole interface.
(access_entry key: (access_key) @attribute)

; `in:` / `out:` declarations.
"in" @keyword
"out" @keyword

; struct / enum definitions.
"struct" @keyword
"enum" @keyword
(type_definition name: (identifier) @type)
(member name: (identifier) @variable.other.member)

; `marker Name` — a zero-sized component (grammar §8.1).
"marker" @keyword
(marker_declaration name: (identifier) @type)

; A type declaration's `@ <path>` — the real code it references (grammar §4.7),
; and the legacy inline `+` / `-` member markers §10 superseded.
(type_definition path: (type_path) @string.special.path)
(marker_declaration path: (type_path) @string.special.path)
(delta) @operator
; Endpoint parameter source: `field: Type @query` (grammar §4.1).
(member source: (identifier) @attribute)

; Type expressions.
(type name: (identifier) @type)
((type name: (identifier) @type.builtin)
 (#match? @type.builtin "^(String|bool|i8|i16|i32|i64|u8|u16|u32|u64|f32|f64|Uuid|Money|DateTime|Entity|Duration|Vec2|Vec3|Vec4|Quat|Color|Timer|Rect|Option|Vec|Map|Queue|Stream|Handle|Future|Result|Either|Tuple)$"))

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

; External-crate imports: `use extern crate::path: Type` (grammar §4.8). The
; crate path highlights as a path like every other pointer out of the file.
(extern_keyword) @keyword.control.import
(crate_path) @string.special.path

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
