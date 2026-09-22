; Highlight query for the ORA Conversation Format (`.orac`).
; Capture names follow Helix's highlight scopes. Later matches win, so more
; specific patterns come after the generic ones.

; Comment lines (spec 7) — ignored by parsers, carried for review annotations.
(comment) @comment

; File skeleton: the version line (3), the `%`/`=` header fences (4, 5) and
; the `#` footer (10).
(version_line) @keyword.directive
(percent_line) @punctuation.special
(equals_line) @punctuation.special
(footer_line) @punctuation.special

; Section anchors (spec 6.1): `--- USER [2/5] ---`, `--- FACTCHECK [2/5] ---`.
; `anchor_name` carries the opening `---`, so it is the anchor's whole head.
(anchor_name) @keyword
(anchor_close) @punctuation.special
(exchange_label) @constant.numeric
(block_count) @constant.numeric

; Message attributes (spec 6.2): `@id:` / `@ts:` / unknown `@key:`.
(attribute_key) @attribute

; Turn markers inside an ASSISTANT section (spec 6.4).
(turn_open) @keyword.control
(turn_close) @keyword.control
(bracket_marker) @punctuation.special

; Tool-call and vote block anchors (spec 6.5, 6.6). Each is one whole-line
; token, so the tool name and its duration share a highlight.
(tool_anchor) @function
(vote_anchor) @function

; `Key: value` lines — header fields (4), tool-block fields (6.5), vote and
; factcheck bodies (6.6, 6.7). The key token carries its own colon.
(field_key) @keyword
(value) @string

; A tool call's JSON arguments and inline result. The JSON itself is injected
; as `json` (see injections.scm); this keeps it distinct from prose if the
; injection is unavailable.
(json_value) @string.special

; Failures: a tool block's `Error:` field (6.5) and a turn-level `ERROR:` (9).
(error_field (field_key) @keyword.control.exception)
(error_marker) @keyword.control.exception

; Opaque payload delimiters (spec 6.5, 8.1, 8.2). The payloads themselves are
; verbatim regions and are left to their injected languages.
(dash_line) @punctuation.special
(thematic_break) @punctuation.special
(fence_open) @punctuation.special
(fence_close) @punctuation.special
(result_marker) @keyword
(plot_marker) @keyword
(csv_marker) @keyword
(spec_marker) @keyword
